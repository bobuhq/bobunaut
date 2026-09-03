class MarsAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private lastStepAt = 0;

  private ensureContext() {
    if (this.context) {
      return this.context;
    }

    const AudioContextClass =
      window.AudioContext ||
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext;
        }
      ).webkitAudioContext;

    if (!AudioContextClass) {
      return null;
    }

    const context = new AudioContextClass();
    const master = context.createGain();

    master.gain.value = this.enabled ? 0.5 : 0;
    master.connect(context.destination);

    this.context = context;
    this.master = master;

    return context;
  }

  async unlock() {
    const context = this.ensureContext();

    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      await context.resume();
    }
  }

  async stop() {
    const context = this.context;

    this.context = null;
    this.master = null;
    this.lastStepAt = 0;

    if (
      context &&
      context.state !== "closed"
    ) {
      try {
        await context.close();
      } catch {
        return;
      }
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;

    if (
      !this.context ||
      !this.master
    ) {
      return;
    }

    this.master.gain.setTargetAtTime(
      enabled ? 0.5 : 0,
      this.context.currentTime,
      0.04,
    );
  }

  step(running = false) {
    if (
      !this.enabled ||
      !this.context ||
      !this.master
    ) {
      return;
    }

    const context = this.context;
    const now = context.currentTime;
    const interval = running ? 0.18 : 0.28;

    if (
      now - this.lastStepAt <
      interval
    ) {
      return;
    }

    this.lastStepAt = now;

    const duration = running ? 0.075 : 0.095;
    const buffer = context.createBuffer(
      1,
      Math.max(
        1,
        Math.floor(
          context.sampleRate * duration,
        ),
      ),
      context.sampleRate,
    );

    const data = buffer.getChannelData(0);

    for (
      let i = 0;
      i < data.length;
      i += 1
    ) {
      const envelope =
        1 - i / data.length;

      data[i] =
        (Math.random() * 2 - 1) *
        envelope;
    }

    const noise =
      context.createBufferSource();

    noise.buffer = buffer;

    const filter =
      context.createBiquadFilter();

    filter.type = "lowpass";
    filter.frequency.setValueAtTime(
      running ? 420 : 340,
      now,
    );

    const gain =
      context.createGain();

    gain.gain.setValueAtTime(
      running ? 0.05 : 0.04,
      now,
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration,
    );

    const body =
      context.createOscillator();

    body.type = "sine";
    body.frequency.setValueAtTime(
      running ? 92 : 78,
      now,
    );

    body.frequency.exponentialRampToValueAtTime(
      48,
      now + duration,
    );

    const bodyGain =
      context.createGain();

    bodyGain.gain.setValueAtTime(
      running ? 0.032 : 0.026,
      now,
    );

    bodyGain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration,
    );

    noise.connect(filter);
    filter.connect(gain);
    gain.connect(this.master);

    body.connect(bodyGain);
    bodyGain.connect(this.master);

    noise.start(now);
    noise.stop(now + duration);

    body.start(now);
    body.stop(now + duration);
  }

  jump() {
    if (
      !this.enabled ||
      !this.context ||
      !this.master
    ) {
      return;
    }

    const context = this.context;
    const now = context.currentTime;

    const oscillator =
      context.createOscillator();

    const gain =
      context.createGain();

    oscillator.type = "sine";

    oscillator.frequency.setValueAtTime(
      145,
      now,
    );

    oscillator.frequency.exponentialRampToValueAtTime(
      290,
      now + 0.12,
    );

    oscillator.frequency.exponentialRampToValueAtTime(
      190,
      now + 0.23,
    );

    gain.gain.setValueAtTime(
      0.0001,
      now,
    );

    gain.gain.exponentialRampToValueAtTime(
      0.05,
      now + 0.025,
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + 0.24,
    );

    oscillator.connect(gain);
    gain.connect(this.master);

    oscillator.start(now);
    oscillator.stop(now + 0.26);
  }
}

export const marsAudio =
  new MarsAudioEngine();
