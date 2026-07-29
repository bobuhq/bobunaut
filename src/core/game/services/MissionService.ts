import type {
  BobuEvent,
} from "../../engine/eventEngine";

import type {
  MissionDefinition,
  MissionProgress,
} from "../models";

import {
  missionRepository,
} from "../repository/MissionRepository";

export interface MissionUpdate {
  definition: MissionDefinition;
  progress: MissionProgress;
  completedNow: boolean;
}

const getEventIncrement = (
  event: BobuEvent,
): number => {
  if (
    "amount" in event &&
    typeof event.amount === "number" &&
    Number.isFinite(event.amount) &&
    event.amount > 0
  ) {
    return Math.max(
      1,
      Math.floor(event.amount),
    );
  }

  return 1;
};

export class MissionService {
  handle(
    builderId: string,
    event: BobuEvent,
  ): MissionUpdate[] {
    const definitions =
      missionRepository
        .getDefinitionsByEventType(
          event.type,
        );

    const updates: MissionUpdate[] = [];
    const increment =
      getEventIncrement(event);

    for (const definition of definitions) {
      const current =
        missionRepository
          .getOrCreateProgress(
            builderId,
            definition.id,
          );

      if (
        current.status === "completed" ||
        current.status === "claimed" ||
        current.status === "expired" ||
        current.status === "locked"
      ) {
        continue;
      }

      const nextValue = Math.min(
        definition.target,
        current.progress + increment,
      );

      const completedNow =
        current.progress <
          definition.target &&
        nextValue >= definition.target;

      const updated: MissionProgress = {
        ...current,
        progress: nextValue,
        status: completedNow
          ? "completed"
          : "active",
        completedAt: completedNow
          ? event.occurredAt
          : current.completedAt,
      };

      const saved =
        missionRepository.saveProgress(
          builderId,
          updated,
        );

      updates.push({
        definition,
        progress: saved,
        completedNow,
      });

      if (completedNow) {
        console.info(
          "[Mission Completed]",
          builderId,
          definition.id,
        );
      }
    }

    return updates;
  }
}

export const missionService =
  new MissionService();
