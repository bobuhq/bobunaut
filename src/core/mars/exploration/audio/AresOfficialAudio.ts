/** Approved recordings, hosted locally and preserved byte-for-byte. One owner per shared context. */
export type AresConsoleKind = "mission" | "research" | "upgrade" | "command";
export const ARES_OFFICIAL_ASSETS = {
  arrival: { file: "BOBU_Ares_Futuristic_Crystal_Resonance_V3_6s.wav", duration: 6.35, gain: .18 },
  mission: { file: "BOBU_Mission_Console.wav", duration: 1.05, gain: .5 },
  research: { file: "BOBU_Research_Console.wav", duration: 1.05, gain: .2 },
  upgrade: { file: "BOBU_Upgrade_Console.wav", duration: 1.1, gain: .216 },
  command: { file: "BOBU_Command_Console.wav", duration: 1.05, gain: .366 },
} as const;
export type AresRecording = keyof typeof ARES_OFFICIAL_ASSETS;
export const ARES_OFFICIAL_BASE_URL = "/audio/ares-official-v3/";
export const ARES_ARRIVAL_DURATION = ARES_OFFICIAL_ASSETS.arrival.duration;

export class AresOfficialAudio {
  private buffers = new Map<AresRecording, AudioBuffer>();
  private pending = new Map<AresRecording, Promise<AudioBuffer | null>>();
  private abort = new AbortController();
  private disposed = false;
  private timers = new Set<ReturnType<typeof setTimeout>>();
  private active = new Set<{ dispose: () => void; fadeOut: () => void }>();
  private lastCue = -Infinity;
  constructor(private context: AudioContext) {}

  preload() {
    for (const key of Object.keys(ARES_OFFICIAL_ASSETS) as AresRecording[]) void this.load(key);
  }
  load(key: AresRecording): Promise<AudioBuffer | null> {
    if (this.disposed) return Promise.resolve(null);
    const cached = this.buffers.get(key);
    if (cached) return Promise.resolve(cached);
    const previous = this.pending.get(key);
    if (previous) return previous;
    const timer = setTimeout(() => this.abort.abort(), 10000);
    this.timers.add(timer);
    const promise = (async () => {
      try {
        const response = await fetch(ARES_OFFICIAL_BASE_URL + ARES_OFFICIAL_ASSETS[key].file, { signal: this.abort.signal });
        if (!response.ok) return null;
        const bytes = await response.arrayBuffer();
        if (this.disposed) return null;
        const buffer = await this.context.decodeAudioData(bytes);
        if (this.disposed || buffer.numberOfChannels !== 2 || Math.abs(buffer.duration - ARES_OFFICIAL_ASSETS[key].duration) > .02) return null;
        this.buffers.set(key, buffer); return buffer;
      } catch { return null; } // Missing/blocked/invalid recording is silent; no substitute sound.
      finally { clearTimeout(timer); this.timers.delete(timer); }
    })();
    this.pending.set(key, promise); return promise;
  }

  playArrival(buffer: AudioBuffer, onEnded: () => void) { return this.play("arrival", buffer, onEnded); }

  terminal(kind: AresConsoleKind) {
    if (!Object.hasOwn(ARES_OFFICIAL_ASSETS, kind) || kind === ("arrival" as string)) return;
    const buffer = this.buffers.get(kind), now = this.context.currentTime;
    if (this.disposed || this.context.state !== "running" || !buffer || now - this.lastCue < 1.2) return;
    this.lastCue = now;
    this.play(kind, buffer);
  }

  private play(key: AresRecording, buffer: AudioBuffer, onEnded?: () => void) {
    if (this.disposed || this.context.state !== "running") return null;
    const source = this.context.createBufferSource(), gain = this.context.createGain();
    const now = this.context.currentTime, level = ARES_OFFICIAL_ASSETS[key].gain;
    let released = false;
    const voice = {
      dispose: () => {
        if (released) return;
        released = true; source.onended = null;
        try { source.stop(); } catch { /* Natural end or interrupted context. */ }
        source.disconnect(); gain.disconnect(); source.buffer = null; this.active.delete(voice);
      },
      fadeOut: () => {
        if (released) return;
        gain.gain.cancelScheduledValues(this.context.currentTime);
        gain.gain.setValueAtTime(gain.gain.value, this.context.currentTime);
        gain.gain.linearRampToValueAtTime(0, this.context.currentTime + .05);
        try { source.stop(this.context.currentTime + .055); } catch { /* Already stopped. */ }
      },
    };
    this.active.add(voice);
    try {
      source.buffer = buffer; source.loop = false; source.connect(gain); gain.connect(this.context.destination);
      gain.gain.setValueAtTime(0, now);
      gain.gain.linearRampToValueAtTime(level, now + .01);
      gain.gain.setValueAtTime(level, now + buffer.duration - .04);
      gain.gain.linearRampToValueAtTime(0, now + buffer.duration);
      source.onended = () => { voice.dispose(); onEnded?.(); };
      source.start(now); source.stop(now + buffer.duration);
      return voice;
    } catch (error) { voice.dispose(); throw error; }
  }
  fadeOut() { for (const voice of this.active) voice.fadeOut(); }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; this.abort.abort();
    for (const timer of this.timers) clearTimeout(timer);
    this.timers.clear();
    for (const voice of this.active) voice.dispose();
    this.active.clear(); this.buffers.clear(); this.pending.clear();
  }
}
