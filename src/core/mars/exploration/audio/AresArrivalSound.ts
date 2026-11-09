import { AresOfficialAudio, type AresConsoleKind } from "./AresOfficialAudio";
import { AresSoundscape } from "./AresSoundscape";
import { marsAudio } from "./MarsAudioEngine";

export const ARES_SOUND_PREFERENCE_KEY = "bobu:ares:sound-enabled:v1";

/** Route entry identity outlives React/R3F remounts. Only leaving resets it. */
export class AresArrivalSound {
  private entry: { consumed: boolean } | null = null;
  private leases = new Set<symbol>();
  private context: AudioContext | null = null;
  private voice: ReturnType<AresOfficialAudio["playArrival"]> = null;
  private recordings: AresOfficialAudio | null = null;
  private loadingArrival = false;
  private soundscape: AresSoundscape | null = null;
  private inside = false;
  private resonance = 0;
  private retire: (() => void) | null = null;
  private startup: ReturnType<typeof setTimeout> | undefined;
  private enabled: boolean | undefined;
  private subscribers = new Set<() => void>();

  getEnabled = (): boolean => {
    if (this.enabled === undefined) {
      try { this.enabled = localStorage.getItem(ARES_SOUND_PREFERENCE_KEY) !== "off"; }
      catch { this.enabled = true; }
    }
    return this.enabled;
  };

  subscribe = (listener: () => void) => {
    this.subscribers.add(listener);
    return () => { this.subscribers.delete(listener); };
  };

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
    try { localStorage.setItem(ARES_SOUND_PREFERENCE_KEY, enabled ? "on" : "off"); }
    catch { /* Private/storage-restricted WebViews retain the in-memory preference. */ }
    if (!enabled) {
      // Muting consumes any pending cue; unmuting is not a replay action.
      if (this.entry) this.entry.consumed = true;
      this.cancel();
    } else if (this.entry && this.leases.size) {
      this.listen();
      this.attempt(true); // Called directly by the existing sound button.
    }
    this.subscribers.forEach(listener => listener());
  }

  routeChanged(pathname: string) {
    const isAres = pathname.replace(/\/+$/, "") === "/mars/explore";
    if (!isAres) {
      this.entry = null;
      this.leases.clear();
      this.cancel();
    } else if (!this.entry) {
      this.entry = { consumed: !this.getEnabled() };
      this.inside = false; this.resonance = 0;
    }
  }

  /** Attach only after the actual surface commits, never on an access/loading gate. */
  attachSurface = () => {
    if (!this.entry) return () => {};
    const lease = Symbol("Ares surface");
    this.leases.add(lease);
    if (this.leases.size === 1 && this.getEnabled()) {
      this.listen();
      // StrictMode's setup/cleanup replay cannot consume the arrival.
      this.startup = setTimeout(() => { this.startup = undefined; this.attempt(false); }, 0);
    }
    return () => {
      this.leases.delete(lease);
      if (!this.leases.size) this.cancel();
    };
  };

  private onInteraction = (event: Event) => {
    if (!event.isTrusted || (event instanceof KeyboardEvent &&
      (event.repeat || event.metaKey || event.ctrlKey || event.altKey))) return;
    // A mute press must never start the pending cue on its pointerdown.
    if (event.target instanceof Element && event.target.closest("[data-ares-sound-control], a[href]")) return;
    this.attempt(true);
  };

  private onHidden = () => {
    if (document.visibilityState === "hidden") this.skip();
    else if (this.entry && this.leases.size && this.getEnabled()) {
      this.listen(); this.attempt(false);
    }
  };
  private onPageHide = () => { this.skip(); };

  private listen() {
    window.addEventListener("pointerdown", this.onInteraction);
    window.addEventListener("touchend", this.onInteraction, { passive: true });
    window.addEventListener("keydown", this.onInteraction);
    window.addEventListener("pagehide", this.onPageHide);
    document.addEventListener("visibilitychange", this.onHidden);
  }

  private unlisten() {
    window.removeEventListener("pointerdown", this.onInteraction);
    window.removeEventListener("touchend", this.onInteraction);
    window.removeEventListener("keydown", this.onInteraction);
    window.removeEventListener("pagehide", this.onPageHide);
    document.removeEventListener("visibilitychange", this.onHidden);
  }

  private skip() {
    if (this.entry) this.entry.consumed = true;
    this.retire?.();
    this.cancel(false, true); // Do not depend on JS timers while a page is frozen.
  }

  private attempt(fromGesture: boolean) {
    const entry = this.entry;
    if (!entry || !this.leases.size || !this.getEnabled() || this.voice || this.soundscape || this.loadingArrival) return;
    if (document.visibilityState === "hidden") { this.skip(); return; }
    try {
      if (!this.context) {
        this.retire?.();
        const Constructor = window.AudioContext ||
          (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
        if (!Constructor) { this.skip(); return; }
        this.context = new Constructor();
        this.recordings = new AresOfficialAudio(this.context);
        this.recordings.preload();
      }
      const context = this.context;
      context.onstatechange = () => {
        // An OS audio interruption must not leave a half-played cue queued to
        // continue much later, even if the WebView remains visibly foregrounded.
        if (this.context === context && (this.voice || this.soundscape || this.loadingArrival) && context.state !== "running") this.cancel(false, true);
      };
      const play = () => {
        // A late resume must not play after a mute, unmount, or navigation.
        if (this.context !== context || this.entry !== entry || this.voice || this.soundscape || this.loadingArrival ||
          !this.leases.size || !this.getEnabled() || context.state !== "running") return;
        if (document.visibilityState === "hidden") { this.skip(); return; }
        try {
          if (!entry.consumed) {
            entry.consumed = true;
            this.loadingArrival = true;
            const recordings = this.recordings;
            void recordings?.load("arrival").then(buffer => {
              if (this.context !== context || this.entry !== entry || this.recordings !== recordings) return;
              this.loadingArrival = false;
              if (!this.getEnabled() || !this.leases.size || document.visibilityState === "hidden" || context.state !== "running") return;
              try {
                if (!buffer) { this.startSoundscape(context); return; }
                this.voice = recordings.playArrival(buffer, () => {
                  this.voice = null;
                  if (this.context === context && this.entry === entry) this.startSoundscape(context);
                });
              } catch { this.cancel(false); }
            });
          } else this.startSoundscape(context);
        } catch { this.cancel(false); }
      };
      if (context.state === "running") play();
      else if (fromGesture && context.state !== "closed") {
        // Invoke synchronously in the trusted handler for Safari/WebView. No
        // fake gestures, autoplay flags, muted-media tricks or retry loops.
        void context.resume().then(play).catch(() => { /* Wait for another gesture, or leave silently. */ });
      }
    } catch { this.skip(); }
  }

  private startSoundscape(context: AudioContext) {
    try {
      this.soundscape = new AresSoundscape(context);
      this.soundscape.setMix(this.inside, this.resonance);
    } catch { this.cancel(false); }
  }

  getRunningContext = () => this.context?.state === "running" ? this.context : null;

  setInterior(inside: boolean) {
    if (inside === this.inside) return;
    this.inside = inside; this.updateMix();
  }

  setCrystalDistance(distance: number) {
    if (!Number.isFinite(distance)) return;
    const resonance = Math.max(0, Math.min(1, (8 - distance) / 6)) ** 2;
    if (Math.abs(resonance - this.resonance) < 0.015 && resonance !== 0) return;
    if (resonance === this.resonance) return;
    this.resonance = resonance; this.updateMix();
  }

  private updateMix() {
    try { this.soundscape?.setMix(this.inside, this.resonance); }
    catch { this.cancel(false); } // Audio failure must never escape into useFrame.
  }

  terminal(kind: AresConsoleKind) {
    try {
      if (this.getEnabled() && document.visibilityState !== "hidden") this.recordings?.terminal(kind);
    } catch { this.cancel(false); }
  }

  private cancel(fade = true, keepVisibility = false) {
    clearTimeout(this.startup);
    this.startup = undefined;
    this.unlisten();
    // Retain only visibility/gesture observation while hidden or OS-interrupted.
    if (keepVisibility && this.entry && this.leases.size) this.listen();
    const context = this.context;
    const voice = this.voice;
    const recordings = this.recordings;
    const soundscape = this.soundscape;
    if (context) context.onstatechange = null;
    this.context = null;
    this.voice = null;
    this.recordings = null;
    this.loadingArrival = false;
    this.soundscape = null;
    void marsAudio.stop(fade);
    const release = () => {
      try { recordings?.dispose(); } catch { /* Always release the shared context. */ }
      try { voice?.dispose(); } catch { /* Closing the context is the final fallback. */ }
      try { soundscape?.dispose(); } catch { /* Continue releasing the context. */ }
      if (context && context.state !== "closed") void context.close().catch(() => {});
    };
    if (fade && (voice || soundscape || recordings) && context?.state === "running") {
      recordings?.fadeOut(); soundscape?.fadeOut();
      const timer = setTimeout(() => { this.retire = null; release(); }, soundscape ? 195 : 65);
      this.retire = () => { clearTimeout(timer); this.retire = null; release(); };
    } else release();
  }
}

export const aresArrivalSound = new AresArrivalSound();
marsAudio.setContextProvider(aresArrivalSound.getRunningContext);
