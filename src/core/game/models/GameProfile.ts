import type { CareerProgress } from "./Career";
import type { MissionProgress } from "./Mission";
import type { AchievementProgress } from "./Achievement";

export interface GameProfile {
  builderId: string;
  career: CareerProgress | null;
  gameXp: number;
  gameLevel: number;
  galaxyXp: number;
  seasonId: string | null;
  missions: MissionProgress[];
  achievements: AchievementProgress[];
  discoveredObjectIds: string[];
  createdAt: string;
  updatedAt: string;
}

export const createInitialGameProfile = (
  builderId: string,
): GameProfile => {
  const now = new Date().toISOString();

  return {
    builderId,
    career: null,
    gameXp: 0,
    gameLevel: 1,
    galaxyXp: 0,
    seasonId: null,
    missions: [],
    achievements: [],
    discoveredObjectIds: [],
    createdAt: now,
    updatedAt: now,
  };
};
