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
  categoryKey:
    "missions.presentation.category.mission",
  difficultyKey:
    "missions.presentation.difficulty.unknown",
  durationKey:
    "missions.presentation.duration.unknown",
  actionKey:
    "missions.presentation.action.viewMission",
  icon: missionPresentation["start-mining"].icon,
};

export type MissionTranslationFunction = (
  key: string,
  variables?: Record<string, string | number>,
) => string;

export interface MissionViewModelOptions {
  language: string;
  t: MissionTranslationFunction;
}

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
  progress: MissionProgress | undefined,
  options: MissionViewModelOptions,
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

  const rewardText =
    rewardGp > 0
      ? `${rewardGp.toLocaleString(
          options.language,
        )} GP`
      : options.t("missions.presentation.noGp");

  const titleKey =
    definition.id === "start-mining"
      ? "missions.catalog.startMining.title"
      : null;

  const descriptionKey =
    definition.id === "start-mining"
      ? "missions.catalog.startMining.description"
      : null;

  return {
    id: definition.id,
    cycleKey: progress?.cycleKey ?? "default",
    category: options.t(
      presentation.categoryKey,
    ),
    title: titleKey
      ? options.t(titleKey)
      : definition.title,
    description: descriptionKey
      ? options.t(descriptionKey)
      : definition.description,
    rewardGp,
    reward: rewardText,
    rewardLabel: rewardText,
    difficulty: options.t(
      presentation.difficultyKey,
    ),
    duration: options.t(
      presentation.durationKey,
    ),
    action: presentation.actionKey
      ? options.t(presentation.actionKey)
      : undefined,
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
  options: MissionViewModelOptions,
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
      options,
    ),
  );
}
