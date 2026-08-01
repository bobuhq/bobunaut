import type {
  AchievementDefinition,
  AchievementProgress,
} from "../models";

import {
  achievementCatalog,
} from "../catalog";

type AchievementListener = () => void;

export class AchievementRepository {
  private readonly definitions: AchievementDefinition[] =
    achievementCatalog.map((definition) => ({
      ...definition,
      reward: {
        ...definition.reward,
      },
    }));

  private readonly progressByBuilder = new Map<
    string,
    Map<string, AchievementProgress>
  >();

  private readonly listeners =
    new Set<AchievementListener>();

  private version = 0;

  private emitChange(): void {
    this.version += 1;
    this.listeners.forEach((listener) => listener());
  }

  subscribe(listener: AchievementListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  getVersion(): number {
    return this.version;
  }

  getDefinitions(): AchievementDefinition[] {
    return this.definitions.map((definition) => ({
      ...definition,
      reward: {
        ...definition.reward,
      },
    }));
  }

  getDefinitionsByEventType(
    eventType: string,
  ): AchievementDefinition[] {
    return this.definitions
      .filter(
        (definition) =>
          definition.eventType === eventType,
      )
      .map((definition) => ({
        ...definition,
        reward: {
          ...definition.reward,
        },
      }));
  }

  getProgress(
    builderId: string,
    achievementId: string,
  ): AchievementProgress | null {
    const progress =
      this.progressByBuilder
        .get(builderId)
        ?.get(achievementId);

    return progress
      ? { ...progress }
      : null;
  }

  getOrCreateProgress(
    builderId: string,
    achievementId: string,
  ): AchievementProgress {
    const existing =
      this.getProgress(
        builderId,
        achievementId,
      );

    if (existing) {
      return existing;
    }

    const created: AchievementProgress = {
      achievementId,
      status: "locked",
      progress: 0,
      version: 1,
    };

    return this.saveProgress(
      builderId,
      created,
    );
  }

  saveProgress(
    builderId: string,
    progress: AchievementProgress,
  ): AchievementProgress {
    let builderProgress =
      this.progressByBuilder.get(builderId);

    if (!builderProgress) {
      builderProgress =
        new Map<
          string,
          AchievementProgress
        >();

      this.progressByBuilder.set(
        builderId,
        builderProgress,
      );
    }

    const stored = { ...progress };

    builderProgress.set(
      progress.achievementId,
      stored,
    );

    this.emitChange();

    return { ...stored };
  }

  restoreBuilderProgress(
    builderId: string,
    progress: readonly AchievementProgress[],
  ): void {
    const restored = new Map<
      string,
      AchievementProgress
    >();

    for (const item of progress) {
      restored.set(
        item.achievementId,
        { ...item },
      );
    }

    this.progressByBuilder.set(
      builderId,
      restored,
    );

    this.emitChange();
  }

  getBuilderProgress(
    builderId: string,
  ): AchievementProgress[] {
    return Array.from(
      this.progressByBuilder
        .get(builderId)
        ?.values() ?? [],
      (progress) => ({ ...progress }),
    );
  }

  /**
   * Clears all authenticated Builder achievement state.
   *
   * Definitions remain immutable and are not removed.
   */
  reset(): void {
    if (this.progressByBuilder.size === 0) {
      return;
    }

    this.progressByBuilder.clear();
    this.emitChange();
  }
}

export const achievementRepository =
  new AchievementRepository();
