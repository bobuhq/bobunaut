import type {
  MissionDefinition,
  MissionProgress,
  MissionStatus,
} from "../models";

import type {
  MissionPresentation,
} from "../presentation";

import {
  missionPresentation,
} from "../presentation";

export type MissionDisplayStatus =
  | "locked"
  | "available"
  | "completed"
  | "claimed";

export interface MissionViewModel {
  id: string;
  cycleKey: string;
  category: string;
  title: string;
  description: string;
  rewardGp: number;
  reward: string;
  rewardLabel: string;
  difficulty: string;
  duration: string;
  action?: string;
  icon: MissionPresentation["icon"];
  cadence: MissionDefinition["cadence"];
  target: number;
  progress: number;
  progressPercent: number;
  status: MissionDisplayStatus;
  rawStatus: MissionStatus;
  displayStatus: MissionDisplayStatus;
  completedAt?: string;
  claimedAt?: string;
}

const fallbackPresentation: MissionPresentation = {
  category: "MISSION",
  difficulty: "Unknown",
  duration: "Unknown",
  action: "View Mission",
  icon: missionPresentation["start-mining"].icon,
};

function getDisplayStatus(
  status: MissionStatus,
): MissionDisplayStatus {
  switch (status) {

    case "claimed":
      return "claimed";

    case "completed":
      return "completed";

    case "locked":
    case "expired":
      return "locked";

    case "available":
    case "active":
    default:
      return "available";
  }
}

export function createMissionViewModel(
  definition: MissionDefinition,
  progress?: MissionProgress,
): MissionViewModel {
  const presentation =
    missionPresentation[definition.id] ??
    fallbackPresentation;

  const status =
    progress?.status ?? "available";

  const currentProgress =
    progress?.progress ?? 0;

  const progressPercent =
    definition.target <= 0
      ? 0
      : Math.min(
          100,
          Math.round(
            (currentProgress / definition.target) *
              100,
          ),
        );

  const rewardGp =
    definition.reward.gp ?? 0;

  return {
    id: definition.id,
    cycleKey: progress?.cycleKey ?? "default",
    category: presentation.category,
    title: definition.title,
    description: definition.description,
    rewardGp,
    reward:
      rewardGp > 0
        ? `${rewardGp.toLocaleString()} GP`
        : "No GP",
    rewardLabel:
      rewardGp > 0
        ? `${rewardGp.toLocaleString()} GP`
        : "No GP",
    difficulty: presentation.difficulty,
    duration: presentation.duration,
    action: presentation.action,
    icon: presentation.icon,
    cadence: definition.cadence,
    target: definition.target,
    progress: currentProgress,
    progressPercent,
    status: getDisplayStatus(status),
    rawStatus: status,
    displayStatus: getDisplayStatus(status),
    completedAt: progress?.completedAt,
    claimedAt: progress?.claimedAt,
  };
}

export function createMissionViewModels(
  definitions: MissionDefinition[],
  progress: MissionProgress[],
): MissionViewModel[] {
  const progressByMissionId = new Map(
    progress.map((item) => [
      item.missionId,
      item,
    ]),
  );

  return definitions.map((definition) =>
    createMissionViewModel(
      definition,
      progressByMissionId.get(definition.id),
    ),
  );
}
