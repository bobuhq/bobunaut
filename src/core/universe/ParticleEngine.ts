export interface ParticleState {
  active: boolean;
  density: number;
}

export class ParticleEngine {
  private state: ParticleState = {
    active: false,
    density: 0.35,
  };

  start(): void {
    this.state.active = true;
  }

  stop(): void {
    this.state.active = false;
  }

  setDensity(density: number): void {
    this.state.density = Math.max(0, Math.min(1, density));
  }

  getState(): ParticleState {
    return { ...this.state };
  }

  reset(): void {
    this.state = {
      active: false,
      density: 0.35,
    };
  }
}

export const particleEngine = new ParticleEngine();
