/** Quiet, locally synthesized Ares beds. No worklets, files or network. */
export class AresSoundscape {
  private root: GainNode;
  private exterior: GainNode;
  private interior: GainNode;
  private crystal: GainNode;
  private nodes = new Set<AudioNode>();
  private sources = new Set<AudioScheduledSourceNode>();
  private sparseTimer: ReturnType<typeof setTimeout> | undefined;
  private disposed = false;
  private mixTargets = new Map<AudioParam, number>();

  constructor(private context: AudioContext) {
    const now = context.currentTime;
    this.root = this.gain(0, context.destination);
    this.root.gain.setValueAtTime(0, now);
    this.root.gain.linearRampToValueAtTime(1, now + 2.5);
    this.exterior = this.gain(1, this.root);
    this.interior = this.gain(0, this.root);
    this.crystal = this.gain(0, this.root);
    // A small procedural noise buffer, shared by two asynchronous wind layers.
    // Overlapped endpoints avoid an energy seam; differing rates + slow filter
    // modulation prevent a recognizable short repeated weather pattern.
    const rate = 22050, length = rate * 17, overlap = rate / 2;
    const buffer = context.createBuffer(1, length, rate);
    const data = buffer.getChannelData(0);
    const tail = new Float32Array(overlap);
    for (let i = 0; i < length; i++) data[i] = Math.random() * 2 - 1;
    for (let i = 0; i < overlap; i++) tail[i] = Math.random() * 2 - 1;
    for (let i = 0; i < overlap; i++) {
      const phase = i / overlap * Math.PI / 2;
      data[i] = tail[i] * Math.cos(phase) + data[i] * Math.sin(phase);
    }
    // Noise samples are already independent across the seam, just as elsewhere
    // in the buffer. Filtering removes abrupt high-frequency sample energy.
    for (const [speed, offset, cutoff] of [[0.79, 0, 260], [1.13, 7.3, 530]]) {
      const noise = context.createBufferSource();
      noise.buffer = buffer; noise.loop = true; noise.playbackRate.value = speed;
      this.track(noise);
      const filter = context.createBiquadFilter(); filter.type = "lowpass";
      filter.frequency.value = cutoff; filter.Q.value = 0.45; this.nodes.add(filter);
      noise.connect(filter); filter.connect(this.gain(0.018, this.exterior));
      this.modulate(filter.frequency, 0.037 * speed, 90);
      noise.start(now, offset);
    }
    this.drone(72, 0.0025, this.exterior);
    this.drone(108.1, 0.0018, this.exterior);
    this.drone(196, 0.003, this.interior);
    this.drone(294.15, 0.0018, this.interior);
    this.drone(439.6, 0.004, this.crystal);
    this.drone(659.25, 0.0025, this.crystal);
    this.scheduleSparseTone();
  }

  private gain(value: number, destination: AudioNode) {
    const node = this.context.createGain(); node.gain.value = value;
    node.connect(destination); this.nodes.add(node); return node;
  }
  private track(source: AudioScheduledSourceNode) {
    this.nodes.add(source); this.sources.add(source);
  }
  private drone(hz: number, level: number, destination: AudioNode) {
    const oscillator = this.context.createOscillator();
    oscillator.frequency.value = hz;
    oscillator.connect(this.gain(level, destination));
    this.track(oscillator); oscillator.start();
  }
  private modulate(parameter: AudioParam, hz: number, depth: number) {
    const oscillator = this.context.createOscillator(); oscillator.frequency.value = hz;
    const gain = this.context.createGain(); gain.gain.value = depth;
    oscillator.connect(gain); gain.connect(parameter);
    this.nodes.add(gain); this.track(oscillator); oscillator.start();
  }
  private note(hz: number, level: number, duration: number, destination: AudioNode) {
    if (this.disposed) return;
    const now = this.context.currentTime;
    const oscillator = this.context.createOscillator(); oscillator.frequency.value = hz;
    const gain = this.gain(0, destination);
    gain.gain.setValueAtTime(0, now);
    gain.gain.linearRampToValueAtTime(level, now + 0.06);
    gain.gain.exponentialRampToValueAtTime(0.00001, now + duration - 0.03);
    gain.gain.linearRampToValueAtTime(0, now + duration);
    oscillator.connect(gain); this.track(oscillator);
    oscillator.onended = () => {
      oscillator.disconnect(); gain.disconnect();
      this.sources.delete(oscillator); this.nodes.delete(oscillator); this.nodes.delete(gain);
    };
    oscillator.start(now); oscillator.stop(now + duration);
  }
  private scheduleSparseTone() {
    this.sparseTimer = setTimeout(() => {
      if (this.disposed || this.context.state !== "running") return;
      try {
        const pitches = [329.63, 493.88, 659.25, 392.0];
        this.note(pitches[Math.floor(Math.random() * pitches.length)], 0.004, 3.4, this.exterior);
        this.scheduleSparseTone();
      } catch {
        this.dispose();
        void this.context.close().catch(() => {});
      }
    }, 13000 + Math.random() * 17000);
  }
  setMix(inside: boolean, resonance: number) {
    if (this.disposed) return;
    const now = this.context.currentTime;
    // Complementary targets keep the bed level stable through the doorway.
    for (const [parameter, value] of [
      [this.exterior.gain, inside ? 0 : 1],
      [this.interior.gain, inside ? 1 : 0],
      [this.crystal.gain, inside ? resonance : 0],
    ] as const) {
      if (this.mixTargets.get(parameter) === value) continue;
      this.mixTargets.set(parameter, value);
      parameter.cancelScheduledValues(now);
      parameter.setTargetAtTime(value, now, 0.65);
    }
  }
  fadeOut() {
    clearTimeout(this.sparseTimer);
    const now = this.context.currentTime;
    this.root.gain.cancelScheduledValues(now);
    this.root.gain.setValueAtTime(this.root.gain.value, now);
    this.root.gain.linearRampToValueAtTime(0, now + 0.18);
    // Native stops still execute if the host freezes JS before our close timer.
    for (const source of this.sources) {
      try { source.stop(now + 0.185); } catch { /* Finite voice already ended. */ }
    }
  }
  dispose() {
    if (this.disposed) return;
    this.disposed = true; clearTimeout(this.sparseTimer);
    for (const source of this.sources) {
      source.onended = null;
      try { source.stop(); } catch { /* Already ended. */ }
      if ("buffer" in source) {
        try { (source as AudioBufferSourceNode).buffer = null; } catch { /* Closing context releases buffers on older WebKit. */ }
      }
    }
    for (const node of this.nodes) node.disconnect();
    this.sources.clear(); this.nodes.clear();
  }
}
