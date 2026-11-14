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
  private doors = new Map<string, boolean>();
  private doorBuffers = new Map<string, AudioBuffer>();
  private doorVoices = new Map<string, (() => void)[]>();
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
        for (const key of ["door", "seal", "pressure"] as const) this.doorBuffer(key);
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

  private doorBuffer(key: "door" | "seal" | "pressure") {
    const cached = this.doorBuffers.get(key); if (cached) return cached;
    const c = this.context!, rate = 22050;
    const duration = key === "door" ? .8 : key === "seal" ? .42 : 1.1;
    const b = c.createBuffer(1, Math.floor(rate * duration), rate), data = b.getChannelData(0);
    let seed = 9173, low = 0;
    for (let i = 0; i < data.length; i++) {
      seed = (Math.imul(seed, 1664525) + 1013904223) | 0;
      const noise = seed / 2147483648;
      low = low * .94 + noise * .06;
      const t = i / rate;
      const envelope = Math.min(1, t / .025) * Math.min(1, (duration-t) / .14);
      const signal = key === "pressure" ? noise * .22 + low * .5
        : key === "seal" ? low * 1.4 + Math.sin(2*Math.PI*85*t)*Math.exp(-t*15)*.45
        : low * 1.2 + Math.sin(2*Math.PI*(140*t-35*t*t))*.22;
      data[i] = signal * envelope;
    }
    this.doorBuffers.set(key, b); return b;
  }
  /** Consume transitions even while muted/locked: never queue an old door sound. */
  door(id: string, open: boolean, position: readonly [number, number, number]) {
    try {
      if ((this.doors.get(id) ?? false) === open) return;
      this.doors.set(id, open);
      this.doorVoices.get(id)?.forEach(stop => stop());
      this.doorVoices.delete(id);
      const c = this.context;
      if (!this.getEnabled() || !this.leases.size || !c || c.state !== "running" || document.visibilityState === "hidden") return;
      const voices: (() => void)[] = [];
      this.doorVoices.set(id, voices);
      let remaining = 2;
      try {
        for (const [key, level] of [[open ? "door" : "seal", open ? .65 : .55], ["pressure", open ? .3 : .18]] as const) {
          const buffer = this.doorBuffers.get(key);
          if (!buffer) { if (--remaining === 0) this.doorVoices.delete(id); continue; }
          const source = c.createBufferSource();
          const nodes: AudioNode[] = [source];
          let stopped = false;
          const stop = () => {
            if (stopped) return; stopped = true; source.onended = null;
            try { source.stop(); } catch { /* Already ended or never started. */ }
            for (const node of nodes) {
              try { node.disconnect(); } catch { /* Continue releasing remaining nodes. */ }
            }
            source.buffer = null;
          };
          voices.push(stop); // Own partial setup before any further backend call.
          const gain = c.createGain(); nodes.push(gain);
          const pan = c.createPanner(); nodes.push(pan);
          source.buffer = buffer; source.loop = false;
          pan.panningModel = "equalpower"; pan.distanceModel = "inverse";
          pan.refDistance = 6; pan.maxDistance = 65; pan.rolloffFactor = 1;
          if (pan.positionX && pan.positionY && pan.positionZ) {
            [pan.positionX.value, pan.positionY.value, pan.positionZ.value] = position;
          } else pan.setPosition(...position);
          gain.gain.value = level * .8; // Original Genesis SFX bus level.
          source.connect(gain); gain.connect(pan); pan.connect(c.destination);
          source.onended = () => {
            stop();
            if (--remaining === 0 && this.doorVoices.get(id) === voices) this.doorVoices.delete(id);
          };
          source.start(); source.stop(c.currentTime + source.buffer.duration);
        }
      } catch { voices.forEach(stop => stop()); this.doorVoices.delete(id); }
    } catch { /* Optional audio must never escape into the game frame or cleanup. */ }
  }

  private flightStops = new Set<() => void>();
  flightCue(kind: "extend" | "lock" | "impact" | "shutdown" | "step", index = 0) {
    if (kind === "step" && (!Number.isInteger(index) || index < 0 || index > 12)) return;
    const c = this.context;
    if (!this.getEnabled() || !this.leases.size || !c || c.state !== "running" || document.visibilityState === "hidden") return;
    try {
      const key = kind === "extend" ? "door" : kind === "shutdown" ? "pressure" : "seal";
      const source = c.createBufferSource(), gain = c.createGain();
      source.buffer = this.doorBuffer(key);
      gain.gain.value = (kind === "step" ? .11 : kind === "impact" ? .5 : .35) * .8;
      let stopped = false;
      const stop = () => {
        if (stopped) return; stopped = true; source.onended = null;
        try { source.stop(); } catch { /* Already ended. */ }
        source.disconnect(); gain.disconnect(); this.flightStops.delete(stop);
      };
      this.flightStops.add(stop); source.onended = stop;
      source.connect(gain); gain.connect(c.destination); source.start();
    } catch { /* Optional audio never interrupts physics. */ }
  }
  stopFlightCues() { for (const stop of this.flightStops) stop(); }

  stopDoor(id: string) {
    try {
      this.doorVoices.get(id)?.forEach(stop => stop());
      this.doorVoices.delete(id); this.doors.delete(id);
    } catch { /* Optional audio must never escape into the game frame or cleanup. */ }
  }

  setListener(x: number, y: number, z: number, fx: number, fy: number, fz: number) {
    // Firefox can expose only the legacy listener API. Never let an optional
    // audio backend abort R3F's subscriber loop before input/physics are run.
    try {
      const listener = this.getEnabled() ? this.getRunningContext()?.listener : null;
      if (!listener) return;
      if (listener.positionX && listener.positionY && listener.positionZ) {
        listener.positionX.value = x; listener.positionY.value = y; listener.positionZ.value = z;
      } else listener.setPosition(x, y, z);
      if (listener.forwardX && listener.forwardY && listener.forwardZ && listener.upX && listener.upY && listener.upZ) {
        listener.forwardX.value = fx; listener.forwardY.value = fy; listener.forwardZ.value = fz;
        listener.upX.value = 0; listener.upY.value = 1; listener.upZ.value = 0;
      } else listener.setOrientation(fx, fy, fz, 0, 1, 0);
    } catch { /* Spatial audio failure must not interrupt the game frame. */ }
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
    this.stopFlightCues();
    for (const voices of this.doorVoices.values()) voices.forEach(stop => stop());
    this.doorVoices.clear(); this.doorBuffers.clear();
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
