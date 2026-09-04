class MarsAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private enabled = true;
  private lastStepAt = 0;
  private stepSide = false;

  private ensureContext(): AudioContext | null {
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

    master.gain.value = this.enabled ? 0.8 : 0;
    master.connect(context.destination);

    this.context = context;
    this.master = master;

    return context;
  }

  async unlock(): Promise<void> {
    const context = this.ensureContext();

    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      await context.resume();
    }
  }

  async stop(): Promise<void> {
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

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;

    if (
      !this.context ||
      !this.master
    ) {
      return;
    }

    this.master.gain.setTargetAtTime(
      enabled ? 0.8 : 0,
      this.context.currentTime,
      0.035,
    );
  }

  step(running = false): void {
    if (
      !this.enabled ||
      !this.context ||
      !this.master ||
      this.context.state !== "running"
    ) {
      return;
    }

    const context = this.context;
    const now = context.currentTime;
    const interval = running ? 0.19 : 0.31;

    if (
      now - this.lastStepAt <
      interval
    ) {
      return;
    }

    this.lastStepAt = now;
    this.stepSide = !this.stepSide;

    const impact = context.createOscillator();
    const impactGain = context.createGain();

    impact.type = "sine";
    impact.frequency.setValueAtTime(
      this.stepSide ? 94 : 88,
      now,
    );
    impact.frequency.exponentialRampToValueAtTime(
      this.stepSide ? 47 : 43,
      now + 0.085,
    );

    impactGain.gain.setValueAtTime(
      0.0001,
      now,
    );
    impactGain.gain.exponentialRampToValueAtTime(
      running ? 0.22 : 0.18,
      now + 0.008,
    );
    impactGain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + 0.095,
    );

    const sole = context.createOscillator();
    const soleGain = context.createGain();

    sole.type = "triangle";
    sole.frequency.setValueAtTime(
      this.stepSide ? 185 : 170,
      now,
    );
    sole.frequency.exponentialRampToValueAtTime(
      92,
      now + 0.045,
    );

    soleGain.gain.setValueAtTime(
      0.0001,
      now,
    );
    soleGain.gain.exponentialRampToValueAtTime(
      running ? 0.075 : 0.06,
      now + 0.004,
    );
    soleGain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + 0.055,
    );

    impact.connect(impactGain);
    impactGain.connect(this.master);

    sole.connect(soleGain);
    soleGain.connect(this.master);

    impact.start(now);
    impact.stop(now + 0.1);

    sole.start(now);
    sole.stop(now + 0.065);
  }

  jump(): void {
    if (
      !this.enabled ||
      !this.context ||
      !this.master ||
      this.context.state !== "running"
    ) {
      return;
    }

    const context = this.context;
    const now = context.currentTime;

    const lift = context.createOscillator();
    const liftGain = context.createGain();

    lift.type = "sine";
    lift.frequency.setValueAtTime(
      118,
      now,
    );
    lift.frequency.exponentialRampToValueAtTime(
      330,
      now + 0.11,
    );
    lift.frequency.exponentialRampToValueAtTime(
      215,
      now + 0.21,
    );

    liftGain.gain.setValueAtTime(
      0.0001,
      now,
    );
    liftGain.gain.exponentialRampToValueAtTime(
      0.18,
      now + 0.018,
    );
    liftGain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + 0.23,
    );

    const impulse = context.createOscillator();
    const impulseGain = context.createGain();

    impulse.type = "triangle";
    impulse.frequency.setValueAtTime(
      72,
      now,
    );
    impulse.frequency.exponentialRampToValueAtTime(
      42,
      now + 0.07,
    );

    impulseGain.gain.setValueAtTime(
      0.16,
      now,
    );
    impulseGain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + 0.075,
    );

    lift.connect(liftGain);
    liftGain.connect(this.master);

    impulse.connect(impulseGain);
    impulseGain.connect(this.master);

    lift.start(now);
    lift.stop(now + 0.24);

    impulse.start(now);
    impulse.stop(now + 0.08);
  }
}

export const marsAudio =
  new MarsAudioEngine();
