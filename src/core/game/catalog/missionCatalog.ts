import type {
  MissionDefinition,
} from "../models";

/**
 * Authoritative catalog of missions understood by Game Core.
 *
 * Keep this file independent from React and presentation libraries.
 * Icons, button labels and visual metadata belong to the UI layer.
 */
export const missionCatalog = [
  {
    id: "start-mining",
    title: "Start Mining",
    description: "Start one mining session.",
    cadence: "daily",
    target: 1,
    eventType: "MINING_STARTED",
    reward: {
      gp: 20,
    },
  },
] satisfies MissionDefinition[];
