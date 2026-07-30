import type {
  MissionDefinition,
  MissionProgress,
} from "../models";

import {
  missionCatalog,
} from "../catalog";

type MissionListener = () => void;

export class MissionRepository {
  private readonly definitions: MissionDefinition[] =
    missionCatalog.map((definition) => ({
      ...definition,
      reward: {
        ...definition.reward,
      },
    }));

  private readonly progressByBuilder = new Map<
    string,
    Map<string, MissionProgress>
  >();

  private readonly listeners =
    new Set<MissionListener>();

  private version = 0;

  private emitChange(): void {
    this.version += 1;

    this.listeners.forEach((listener) => {
      listener();
    });
  }

  subscribe(listener: MissionListener): () => void {
    this.listeners.add(listener);

    return () => {
      this.listeners.delete(listener);
    };
  }

  /**
   * Stable primitive snapshot used by useSyncExternalStore.
   *
   * Returning the mission arrays themselves here would create a new
   * reference on every read and could cause unnecessary React renders.
   */
  getVersion(): number {
    return this.version;
  }

  getDefinitions(): MissionDefinition[] {
    return this.definitions.map((definition) => ({
      ...definition,
      reward: {
        ...definition.reward,
      },
    }));
  }

  getDefinitionsByEventType(
    eventType: string,
  ): MissionDefinition[] {
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
    missionId: string,
  ): MissionProgress | null {
    const progress =
      this.progressByBuilder
        .get(builderId)
        ?.get(missionId);

    return progress
      ? { ...progress }
      : null;
  }

  getOrCreateProgress(
    builderId: string,
    missionId: string,
  ): MissionProgress {
    const existing =
      this.getProgress(builderId, missionId);

    if (existing) {
      return existing;
    }

    const created: MissionProgress = {
      missionId,
      cycleKey: "default",
      status: "available",
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
    progress: MissionProgress,
  ): MissionProgress {
    let builderProgress =
      this.progressByBuilder.get(builderId);

    if (!builderProgress) {
      builderProgress =
        new Map<string, MissionProgress>();

      this.progressByBuilder.set(
        builderId,
        builderProgress,
      );
    }

    const previous =
      builderProgress.get(progress.missionId);

    const stored = { ...progress };

    builderProgress.set(
      progress.missionId,
      stored,
    );

    const changed =
      !previous ||
      previous.status !== stored.status ||
      previous.progress !== stored.progress ||
      previous.completedAt !== stored.completedAt ||
      previous.claimedAt !== stored.claimedAt;

    if (changed) {
      this.emitChange();
    }

    return { ...stored };
  }

  getBuilderProgress(
    builderId: string,
  ): MissionProgress[] {
    return Array.from(
      this.progressByBuilder
        .get(builderId)
        ?.values() ?? [],
      (progress) => ({ ...progress }),
    );
  }
}

export const missionRepository =
  new MissionRepository();
