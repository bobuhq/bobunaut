import {
  useSyncExternalStore,
} from "react";

import {
  builderStore,
} from "../../../store/builderStore";

import type {
  AchievementDefinition,
  AchievementProgress,
} from "../models";

import {
  achievementRepository,
} from "../repository/AchievementRepository";

export interface AchievementProgressSnapshot {
  builderId: string;
  definitions: AchievementDefinition[];
  progress: AchievementProgress[];
}

export function useAchievementProgress():
  AchievementProgressSnapshot {

  const builder =
    useSyncExternalStore(
      builderStore.subscribe,
      builderStore.getSnapshot,
      builderStore.getSnapshot,
    );

  useSyncExternalStore(
    (listener) =>
      achievementRepository.subscribe(listener),
    () => achievementRepository.getVersion(),
    () => achievementRepository.getVersion(),
  );

  const authenticated =
    Boolean(builder.id) &&
    builder.id !== "builder-001";

  return {
    builderId: authenticated
      ? builder.id
      : "",
    definitions:
      achievementRepository.getDefinitions(),
    progress: authenticated
      ? achievementRepository.getBuilderProgress(
          builder.id,
        )
      : [],
  };
}
