export type MarsBuildingAssetDefinition = {
  buildingKey: string;

  modelPath: string | null;

  /*
   * True only when the corresponding production GLB
   * actually exists under public/models/mars/buildings.
   *
   * Do not attempt runtime loading while false.
   */
  available: boolean;

  scale: number;

  positionY: number;

  rotationY: number;

  category:
    | "command"
    | "energy"
    | "water"
    | "science"
    | "habitat"
    | "industry"
    | "storage"
    | "agriculture"
    | "infrastructure"
    | "unknown";
};

/*
 * Production asset registry.
 *
 * modelPath === null means the final GLB asset has not yet
 * been installed. Runtime renderer may use a temporary
 * development fallback, but the registry remains authoritative.
 *
 * Do not encode building visuals directly in placement logic.
 */
export const MARS_BUILDING_ASSETS:
Record<string, MarsBuildingAssetDefinition> = {
  command_hub: {
    buildingKey: "command_hub",
    modelPath: null,
    available: false,
    scale: 1,
    positionY: 0,
    rotationY: 0,
    category: "command",
  },

  energy: {
    buildingKey: "energy",
    modelPath:
      "/models/mars/buildings/energy.glb",
    available: false,
    scale: 1,
    positionY: 0,
    rotationY: 0,
    category: "energy",
  },

  water: {
    buildingKey: "water",
    modelPath:
      "/models/mars/buildings/water.glb",
    available: false,
    scale: 1,
    positionY: 0,
    rotationY: 0,
    category: "water",
  },

  science_lab: {
    buildingKey: "science_lab",
    modelPath:
      "/models/mars/buildings/science-lab.glb",
    available: false,
    scale: 1,
    positionY: 0,
    rotationY: 0,
    category: "science",
  },

  habitat: {
    buildingKey: "habitat",
    modelPath:
      "/models/mars/buildings/habitat.glb",
    available: false,
    scale: 1,
    positionY: 0,
    rotationY: 0,
    category: "habitat",
  },

  storage: {
    buildingKey: "storage",
    modelPath:
      "/models/mars/buildings/storage.glb",
    available: false,
    scale: 1,
    positionY: 0,
    rotationY: 0,
    category: "storage",
  },

  greenhouse: {
    buildingKey: "greenhouse",
    modelPath:
      "/models/mars/buildings/greenhouse.glb",
    available: false,
    scale: 1,
    positionY: 0,
    rotationY: 0,
    category: "agriculture",
  },

  mining: {
    buildingKey: "mining",
    modelPath:
      "/models/mars/buildings/mining.glb",
    available: false,
    scale: 1,
    positionY: 0,
    rotationY: 0,
    category: "industry",
  },
};

export function getMarsBuildingAsset(
  buildingKey: string,
): MarsBuildingAssetDefinition {
  const normalized =
    buildingKey.trim().toLowerCase();

  const exact =
    MARS_BUILDING_ASSETS[normalized];

  if (exact) {
    return exact;
  }

  if (normalized.includes("energy")) {
    return MARS_BUILDING_ASSETS.energy;
  }

  if (normalized.includes("water")) {
    return MARS_BUILDING_ASSETS.water;
  }

  if (normalized.includes("science")) {
    return MARS_BUILDING_ASSETS.science_lab;
  }

  if (normalized.includes("habitat")) {
    return MARS_BUILDING_ASSETS.habitat;
  }

  if (normalized.includes("storage")) {
    return MARS_BUILDING_ASSETS.storage;
  }

  if (
    normalized.includes("greenhouse") ||
    normalized.includes("food")
  ) {
    return MARS_BUILDING_ASSETS.greenhouse;
  }

  if (
    normalized.includes("mining") ||
    normalized.includes("mine")
  ) {
    return MARS_BUILDING_ASSETS.mining;
  }

  return {
    buildingKey,
    modelPath: null,
    available: false,
    scale: 1,
    positionY: 0,
    rotationY: 0,
    category: "unknown",
  };
}
