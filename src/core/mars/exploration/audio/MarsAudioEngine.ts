class MarsAudioEngine {
  private context: AudioContext | null = null;
  private master: GainNode | null = null;
  private ambientStarted = false;
  private startupPlayed = false;
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

    const context =
      new AudioContextClass();

    const master =
      context.createGain();

    master.gain.value = 0.7;
    master.connect(context.destination);

    this.context = context;
    this.master = master;

    return context;
  }

  async unlock() {
    const context =
      this.ensureContext();

    if (!context) {
      return;
    }

    if (context.state === "suspended") {
      await context.resume();
    }

    this.startAmbient();

    if (
      this.enabled &&
      !this.startupPlayed
    ) {
      this.startupPlayed = true;
      this.startup();
    }
  }

  async stop() {
    const context = this.context;

    this.context = null;
    this.master = null;
    this.ambientStarted = false;
    this.startupPlayed = false;
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

  setEnabled(
    enabled: boolean,
  ) {
    this.enabled = enabled;

    if (
      !this.context ||
      !this.master
    ) {
      return;
    }

    this.master.gain.setTargetAtTime(
      enabled ? 0.7 : 0,
      this.context.currentTime,
      0.05,
    );
  }

  private tone(
    from: number,
    to: number,
    duration: number,
    volume: number,
    type: OscillatorType = "sine",
  ) {
    if (
      !this.enabled ||
      !this.context ||
      !this.master
    ) {
      return;
    }

    const now =
      this.context.currentTime;

    const oscillator =
      this.context.createOscillator();

    const gain =
      this.context.createGain();

    oscillator.type = type;

    oscillator.frequency.setValueAtTime(
      from,
      now,
    );

    oscillator.frequency.exponentialRampToValueAtTime(
      Math.max(40, to),
      now + duration,
    );

    gain.gain.setValueAtTime(
      0.0001,
      now,
    );

    gain.gain.exponentialRampToValueAtTime(
      volume,
      now + 0.015,
    );

    gain.gain.exponentialRampToValueAtTime(
      0.0001,
      now + duration,
    );

    oscillator.connect(gain);
    gain.connect(this.master);

    oscillator.start(now);
    oscillator.stop(
      now + duration + 0.03,
    );
  }

  private startAmbient() {
    if (
      this.ambientStarted ||
      !this.context ||
      !this.master
    ) {
      return;
    }

    const context =
      this.context;

    const ambient =
      context.createGain();

    ambient.gain.value = 0.13;
    ambient.connect(this.master);

    const drone =
      context.createOscillator();

    drone.type = "sine";
    drone.frequency.value = 112;

    const droneGain =
      context.createGain();

    droneGain.gain.value = 0.13;

    drone.connect(droneGain);
    droneGain.connect(ambient);

    const upper =
      context.createOscillator();

    upper.type = "triangle";
    upper.frequency.value = 168;

    const upperGain =
      context.createGain();

    upperGain.gain.value = 0.035;

    upper.connect(upperGain);
    upperGain.connect(ambient);

    const buffer =
      context.createBuffer(
        1,
        context.sampleRate * 2,
        context.sampleRate,
      );

    const data =
      buffer.getChannelData(0);

    for (
      let i = 0;
      i < data.length;
      i += 1
    ) {
      data[i] =
        (Math.random() * 2 - 1) *
        0.25;
    }

    const noise =
      context.createBufferSource();

    noise.buffer = buffer;
    noise.loop = true;

    const filter =
      context.createBiquadFilter();

    filter.type = "bandpass";
    filter.frequency.value = 420;
    filter.Q.value = 0.7;

    const noiseGain =
      context.createGain();

    noiseGain.gain.value = 0.08;

    noise.connect(filter);
    filter.connect(noiseGain);
    noiseGain.connect(ambient);

    drone.start();
    upper.start();
    noise.start();

    this.ambientStarted = true;
  }

  startup() {
    this.tone(
      440,
      660,
      0.18,
      0.13,
    );

    window.setTimeout(
      () => {
        this.tone(
          660,
          920,
          0.22,
          0.11,
        );
      },
      120,
    );
  }

  step(
    running: boolean,
  ) {
    if (!this.context) {
      return;
    }

    const now =
      this.context.currentTime;

    const interval =
      running ? 0.16 : 0.25;

    if (
      now - this.lastStepAt <
      interval
    ) {
      return;
    }

    this.lastStepAt = now;

    this.tone(
      running ? 145 : 120,
      70,
      0.08,
      running ? 0.075 : 0.055,
      "triangle",
    );
  }

  jump() {
    this.tone(
      230,
      420,
      0.18,
      0.09,
    );
  }

  interact() {
    this.tone(
      620,
      900,
      0.12,
      0.09,
    );
  }

  confirm() {
    this.tone(
      760,
      1040,
      0.15,
      0.1,
    );
  }
}

export const marsAudio =
  new MarsAudioEngine();
