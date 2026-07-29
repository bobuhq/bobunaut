import type { BuilderCareer } from "./Career";

export const MISSION_CADENCES = [
  "one_time",
  "daily",
  "weekly",
  "seasonal",
  "community",
] as const;

export type MissionCadence =
  (typeof MISSION_CADENCES)[number];

export const MISSION_STATUSES = [
  "locked",
  "available",
  "active",
  "completed",
  "claimed",
  "expired",
] as const;

export type MissionStatus =
  (typeof MISSION_STATUSES)[number];

export interface MissionReward {
  gp?: number;
  xp?: number;
  careerXp?: number;
  reputation?: number;
  badgeId?: string;
  materials?: Record<string, number>;
}

export interface MissionDefinition {
  id: string;
  title: string;
  description: string;
  cadence: MissionCadence;
  target: number;
  eventType: string;
  reward: MissionReward;
  career?: BuilderCareer;
  startsAt?: string;
  endsAt?: string;
}

export interface MissionProgress {
  missionId: string;
  status: MissionStatus;
  progress: number;
  completedAt?: string;
  claimedAt?: string;
}
