import {
  useSyncExternalStore,
} from "react";

import {
  builderStore,
} from "../../../store/builderStore";

import type {
  MissionDefinition,
  MissionProgress,
} from "../models";

import {
  missionRepository,
} from "../repository/MissionRepository";

export interface MissionProgressSnapshot {
  builderId: string;
  definitions: MissionDefinition[];
  progress: MissionProgress[];
}

export function useMissionProgress():
  MissionProgressSnapshot {
  const builder = useSyncExternalStore(
    builderStore.subscribe,
    builderStore.getSnapshot,
    builderStore.getSnapshot,
  );

  /*
   * The version value is intentionally not returned.
   * Its purpose is to trigger a React render whenever the
   * repository's in-memory mission state changes.
   */
  useSyncExternalStore(
    (listener) =>
      missionRepository.subscribe(listener),
    () => missionRepository.getVersion(),
    () => missionRepository.getVersion(),
  );

  const isAuthenticatedBuilder =
    Boolean(builder.id) &&
    builder.id !== "builder-001";

  return {
    builderId: isAuthenticatedBuilder
      ? builder.id
      : "",
    definitions:
      missionRepository.getDefinitions(),
    progress: isAuthenticatedBuilder
      ? missionRepository.getBuilderProgress(
          builder.id,
        )
      : [],
  };
}
