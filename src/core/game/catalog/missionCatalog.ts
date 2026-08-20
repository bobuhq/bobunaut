import {
  defineMissionCatalog,
} from "../rules";

/**
 * Authoritative catalog of missions understood by Game Core.
 *
 * Keep this file independent from React and presentation libraries.
 * Icons, button labels and visual metadata belong to the UI layer.
 */
export const missionCatalog =
  defineMissionCatalog([
    {
      id: "start-mining",
      title: "Start Mining",
      description: "Start one mining session.",
      cadence: "daily",
      target: 1,
      eventType: "MINING_STARTED",
      reward: {
        gp: 50,
      },
    },
    {
      id: "complete-mining",
      title: "Complete Mining Session",
      description:
        "Complete and claim one verified mining session.",
      cadence: "daily",
      target: 1,
      eventType: "MINING_CLAIMED",
      reward: {
        gp: 150,
      },
    },
    {
      id: "mars-create-colony",
      title: "Found Your Mars Colony",
      description:
        "Create your first colony on Mars.",
      cadence: "one_time",
      target: 1,
      eventType: "COLONY_CREATED",
      reward: {
        gp: 500,
      },
    },
    {
      id: "mars-assign-sector",
      title: "Claim a Mars Sector",
      description:
        "Assign your colony to a sector on Mars.",
      cadence: "one_time",
      target: 1,
      eventType: "SECTOR_ASSIGNED",
      reward: {
        gp: 250,
      },
    },
    {
      id: "mars-construct-building",
      title: "Build Mars Infrastructure",
      description:
        "Construct your first colony building on Mars.",
      cadence: "one_time",
      target: 1,
      eventType: "BUILDING_CONSTRUCTED",
      reward: {
        gp: 300,
      },
    },
    {
      id: "mars-upgrade-building",
      title: "Upgrade Mars Infrastructure",
      description:
        "Upgrade one colony building on Mars.",
      cadence: "one_time",
      target: 1,
      eventType: "BUILDING_UPGRADED",
      reward: {
        gp: 400,
      },
    },
    {
      id: "mars-claim-resources",
      title: "Harvest Mars Resources",
      description:
        "Claim produced resources from your Mars colony.",
      cadence: "one_time",
      target: 1,
      eventType: "RESOURCES_CLAIMED",
      reward: {
        gp: 150,
      },
    },
  ]);
