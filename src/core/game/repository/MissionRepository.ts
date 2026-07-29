import type {
  MissionDefinition,
  MissionProgress,
} from "../models";

export class MissionRepository {
  private readonly definitions: MissionDefinition[] = [
    {
      id: "visit-galaxy",
      title: "Visit My Galaxy",
      description: "Open the My Galaxy page.",
      cadence: "daily",
      target: 1,
      eventType: "VISIT_GALAXY",
      reward: {
        gp: 10,
      },
    },
    {
      id: "start-mining",
      title: "Start Mining",
      description: "Start one mining session.",
      cadence: "daily",
      target: 1,
      eventType: "START_MINING",
      reward: {
        gp: 20,
      },
    },
  ];

  getDefinitions(): MissionDefinition[] {
    return this.definitions;
  }

  createProgress(
    missionId: string,
  ): MissionProgress {
    return {
      missionId,
      status: "available",
      progress: 0,
    };
  }
}

export const missionRepository =
  new MissionRepository();
