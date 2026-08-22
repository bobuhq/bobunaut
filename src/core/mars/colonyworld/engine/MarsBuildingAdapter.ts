import type {
  MarsColonyBaseBuilding,
} from "../../MarsColonyBaseService";

import type {
  MarsBuildingInstance,
} from "../types/MarsBuildingInstance";

/**
 * Converts the production Colony Base read model into physical
 * V3 building instances.
 *
 * Catalog-only rows are intentionally excluded:
 *
 *   building_id === null
 *   built === false
 *
 * Physical identity is ALWAYS building_id.
 * building_key is only the definition/type identity.
 */
export function marsColonyBaseBuildingToInstance(
  building: MarsColonyBaseBuilding,
): MarsBuildingInstance | null {
  if (
    !building.built ||
    !building.building_id ||
    building.grid_x === null ||
    building.grid_z === null ||
    building.building_status === "archived"
  ) {
    return null;
  }

  return {
    buildingId:
      building.building_id,

    buildingKey:
      building.building_key,

    colonyId:
      building.colony_id,

    gridX:
      building.grid_x,

    gridZ:
      building.grid_z,

    rotationY:
      building.rotation_y,

    footprintWidth:
      building.footprint_width,

    footprintDepth:
      building.footprint_depth,

    level:
      building.building_level,

    status:
      building.building_status,
  };
}


/**
 * Returns ONLY real physical Colony structures.
 *
 * Multiple structures with the same buildingKey are preserved.
 * No deduplication by building type is allowed.
 */
export function createMarsBuildingInstances(
  buildings: MarsColonyBaseBuilding[],
): MarsBuildingInstance[] {
  const instances:
    MarsBuildingInstance[] = [];

  for (const building of buildings) {
    const instance =
      marsColonyBaseBuildingToInstance(
        building,
      );

    if (instance) {
      instances.push(instance);
    }
  }

  return instances;
}


/**
 * Development/runtime integrity check.
 *
 * The server must never return the same physical building UUID
 * more than once. Duplicate building types are valid.
 * Duplicate building IDs are not.
 */
export function assertUniqueMarsBuildingInstances(
  buildings: MarsBuildingInstance[],
): void {
  const seen =
    new Set<string>();

  for (const building of buildings) {
    if (
      seen.has(
        building.buildingId,
      )
    ) {
      throw new Error(
        `Duplicate Mars physical building instance: ${building.buildingId}`,
      );
    }

    seen.add(
      building.buildingId,
    );
  }
}


/**
 * Convenience production adapter.
 *
 * Converts the authoritative server snapshot and verifies
 * physical-instance identity in one operation.
 */
export function createVerifiedMarsBuildingInstances(
  buildings: MarsColonyBaseBuilding[],
): MarsBuildingInstance[] {
  const instances =
    createMarsBuildingInstances(
      buildings,
    );

  assertUniqueMarsBuildingInstances(
    instances,
  );

  return instances;
}
