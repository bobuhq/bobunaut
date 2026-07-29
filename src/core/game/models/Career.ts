export const BUILDER_CAREERS = [
  "explorer",
  "miner",
  "guardian",
  "scientist",
  "architect",
  "commander",
] as const;

export type BuilderCareer =
  (typeof BUILDER_CAREERS)[number];

export interface CareerProgress {
  career: BuilderCareer;
  level: number;
  xp: number;
  selectedAt: string;
}
