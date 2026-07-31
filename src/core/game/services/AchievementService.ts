import type {
  BobuEvent,
} from "../../engine/eventEngine";

import type {
  AchievementDefinition,
  AchievementProgress,
} from "../models";

import {
  achievementRepository,
} from "../repository/AchievementRepository";

export interface AchievementUpdate {
  definition: AchievementDefinition;
  progress: AchievementProgress;
  unlockedNow: boolean;
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

export class AchievementService {
  handle(
    builderId: string,
    event: BobuEvent,
  ): AchievementUpdate[] {
    const definitions =
      achievementRepository.getDefinitionsByEventType(
        event.type,
      );

    const updates: AchievementUpdate[] = [];
    const increment = getEventIncrement(event);

    for (const definition of definitions) {
      const current =
        achievementRepository.getOrCreateProgress(
          builderId,
          definition.id,
        );

      if (
        current.status === "claimed" ||
        current.status === "unlocked"
      ) {
        continue;
      }

      const nextValue = Math.min(
        definition.target,
        current.progress + increment,
      );

      const unlockedNow =
        current.progress < definition.target &&
        nextValue >= definition.target;

      const updated: AchievementProgress = {
        ...current,
        progress: nextValue,
        status: unlockedNow
          ? "unlocked"
          : "locked",
        version: current.version + 1,
        lastEventAt: event.occurredAt,
        unlockedAt: unlockedNow
          ? event.occurredAt
          : current.unlockedAt,
      };

      const saved =
        achievementRepository.saveProgress(
          builderId,
          updated,
        );

      updates.push({
        definition,
        progress: saved,
        unlockedNow,
      });
    }

    return updates;
  }
}

export const achievementService =
  new AchievementService();
