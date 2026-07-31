import {
  eventEngine,
  type BobuEvent,
} from "../../engine/eventEngine";

import {
  builderStore,
} from "../../../store/builderStore";

import {
  missionService,
} from "../services/MissionService";

import {
  achievementService,
} from "../services/AchievementService";

const INITIAL_BUILDER_ID = "builder-001";

export class GameEngine {
  private started = false;

  private unsubscribe:
    | (() => void)
    | null = null;

  start(): void {
    if (this.started) {
      return;
    }

    this.started = true;

    this.unsubscribe = eventEngine.subscribe(
      (event: BobuEvent) => {
        const builder =
          builderStore.getSnapshot();

        if (
          !builder.id ||
          builder.id === INITIAL_BUILDER_ID
        ) {
          return;
        }

        missionService.handle(
          builder.id,
          event,
        );

        achievementService.handle(
          builder.id,
          event,
        );
      },
    );
  }

  stop(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
    this.started = false;
  }
}

export const gameEngine = new GameEngine();
