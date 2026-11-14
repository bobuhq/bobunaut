// Original score: Ares / First Meridian. Rendered locally, no external music.
export const SCORE = Object.freeze({ title: 'Ares / First Meridian', duration: 7.6, bpm: 96,
  sections: ['D minor add9', 'Bb major #11', 'A suspended', 'D minor'],
  motif: [62, 69, 65, 64, 62], rate: 24000 });
export const soundtrackURL = new URL('./ares-first-meridian.wav', import.meta.url).href;
// Cache only within a live context; closing it makes decoded memory reclaimable.
const buffers = new WeakMap();
export class ExplorationMusic {
  constructor(context, destination = context.destination, volume = .8) {
    this.context = context; this.disposed = false; this.source = null;
    this.gain = context.createGain(); this.gain.gain.value = 0; this.gain.connect(destination);
    this.setVolume(volume);
    let pending = buffers.get(context);
    if (!pending) {
      pending = fetch(soundtrackURL).then(response => {
        if (!response.ok) throw new Error('Local Ares score unavailable');
        return response.arrayBuffer();
      }).then(data => context.decodeAudioData(data));
      buffers.set(context, pending);
      pending.catch(() => buffers.delete(context));
    }
    this.ready = pending.then(buffer => {
      if (this.disposed || context.state === 'closed') return;
      this.buffer = buffer;
    }).catch(error => { if (!this.disposed) this.error = String(error); });
  }
  // Explicit event only. Construction, decode and volume changes never start audio.
  play(onEnded) {
    if (this.requested || this.disposed) return;
    this.requested = true;
    void this.ready.then(() => {
      if (this.disposed || !this.buffer || this.context.state !== 'running') return;
      const source = this.context.createBufferSource();
      this.source = source; source.buffer = this.buffer; source.loop = false;
      source.connect(this.gain);
      source.onended = () => { source.disconnect(); source.buffer = null; if (this.source === source) this.source = null; onEnded?.(); };
      source.start(); source.stop(this.context.currentTime + SCORE.duration);
    });
  }
  stop() {
    // Also cancel a cue still decoding; the event remains consumed.
    this.disposed = true;
    if (this.source) { this.source.onended = null; this.source.stop(); this.source.disconnect(); this.source.buffer = null; this.source = null; }
    this.buffer = null;
  }
  setVolume(value) {
    if (this.disposed) return;
    this.volume = Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : 0;
    this.gain.gain.setTargetAtTime(this.volume, this.context.currentTime, .35);
  }
  dispose() {
    this.stop();
    this.gain.disconnect();
  }
}
