/** BOBU Ares Arrival V1: an original, finite bell / crystal voicing. No assets. */
export const ARES_ARRIVAL_DURATION = 3.7;

export function synthesizeAresArrival(context: BaseAudioContext) {
  const start = context.currentTime + 0.015;
  const master = context.createGain();
  master.gain.setValueAtTime(0, start);
  master.gain.linearRampToValueAtTime(0.42, start + 0.18);
  master.gain.setValueAtTime(0.42, start + 2.5);
  master.gain.linearRampToValueAtTime(0, start + ARES_ARRIVAL_DURATION);
  master.connect(context.destination);

  const nodes: { oscillator: OscillatorNode; gain: GainNode }[] = [];
  function tone(hz: number, offset: number, length: number, level: number, attack: number, cents = 0) {
    const oscillator = context.createOscillator();
    const gain = context.createGain();
    const at = start + offset;
    oscillator.type = "sine";
    oscillator.frequency.setValueAtTime(hz, at);
    oscillator.detune.setValueAtTime(-cents, at);
    oscillator.detune.linearRampToValueAtTime(cents, at + length);
    gain.gain.setValueAtTime(0, at);
    gain.gain.linearRampToValueAtTime(level, at + attack);
    gain.gain.exponentialRampToValueAtTime(0.00001, at + length - 0.04);
    gain.gain.linearRampToValueAtTime(0, at + length);
    oscillator.connect(gain);
    gain.connect(master);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
    nodes.push({ oscillator, gain });
    oscillator.start(at);
    oscillator.stop(at + length);
  }

  // Quiet open harmony, then a paired rising bell with a resolving crystal glint.
  tone(329.63, 0, 3.6, 0.028, 0.65);
  tone(493.88, 0.08, 3.5, 0.018, 0.8, 1.3);
  tone(659.25, 0.04, 2.8, 0.105, 0.045);
  tone(659.25 * 2.003, 0.04, 1.8, 0.016, 0.035);
  tone(987.77, 0.48, 2.65, 0.068, 0.06);
  tone(987.77 * 2.001, 0.48, 1.85, 0.009, 0.05);
  tone(1318.51, 1.02, 2.5, 0.032, 0.12);
  // Sparse sine shimmer, gently beating rather than noise or a sharp effect.
  tone(1567.98, 0.78, 2.7, 0.009, 0.7, 3);
  tone(1975.53, 1.12, 2.42, 0.006, 0.65, -2);

  return {
    fadeOut() {
      const now = context.currentTime;
      master.gain.cancelScheduledValues(now);
      master.gain.setValueAtTime(master.gain.value, now);
      master.gain.linearRampToValueAtTime(0, now + 0.05);
    },
    dispose() {
      for (const { oscillator, gain } of nodes) {
        oscillator.onended = null;
        try { oscillator.stop(); } catch { /* Already ended. */ }
        oscillator.disconnect();
        gain.disconnect();
      }
      master.disconnect();
    },
  };
}
