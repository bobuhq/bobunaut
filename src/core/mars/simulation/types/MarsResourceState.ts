export type MarsResourceKey =
  | "materials"
  | "energy"
  | "water"
  | "science"
  | "food";

export type MarsResourceState = {
  colonyId: string;

  materials: number;
  energy: number;
  water: number;
  science: number;
  food: number;

  updatedAt: string;
};
