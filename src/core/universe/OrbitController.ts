export class OrbitController {
  private speed = 1;

  setEnergy(energy: number): void {
    this.speed = 1 + energy / 100;
  }

  getSpeed(): number {
    return this.speed;
  }

  reset(): void {
    this.speed = 1;
  }
}

export const orbitController = new OrbitController();
