import { sampleTerrainSurface, TERRAIN_HALF_SIZE } from "./terrain-surface.mjs";
import { createBoulderField } from "./terrain-visual-data.mjs";

/** The rendered terrain edge and movement boundary share this exact extent. */
export const PLAYABLE_BOUNDARY = TERRAIN_HALF_SIZE;

/** Distant silhouette meshes begin beyond the finite, walkable terrain mesh. */
export const BACKGROUND_RIDGES = Object.freeze([
  Object.freeze({ position: [-18, -1.6, -112], scale: [230, 25, 22], color: "#8b554b", seed: 7 }),
  Object.freeze({ position: [26, -1.8, -128], scale: [248, 20, 23], color: "#754b48", seed: 19 }),
  Object.freeze({ position: [-63, -1.2, -112], scale: [92, 17, 18], color: "#986157", seed: 31 }),
]);

/** Exact deterministic transform inputs shared by the rendered and collision boulder batches. */
export const BOULDER_LAYOUT = Object.freeze(createBoulderField(sampleTerrainSurface, 42));

function rotatedBoxFootprint(position, scale, rotation) {
  const [rx, ry, rz] = rotation;
  const [sx, sy, sz] = scale.map(value => Math.abs(value) / 2);
  const a = Math.cos(rx), b = Math.sin(rx), c = Math.cos(ry), d = Math.sin(ry), e = Math.cos(rz), f = Math.sin(rz);
  // Three.js XYZ Euler rotation matrix, reduced to the rows needed for X/Z extents.
  const r00 = c * e, r01 = -c * f, r02 = d;
  const r10 = a * f + b * d * e, r11 = a * e - b * d * f, r12 = -b * c;
  const r20 = b * f - a * d * e, r21 = b * e + a * d * f, r22 = a * c;
  const halfX = Math.abs(r00) * sx + Math.abs(r01) * sy + Math.abs(r02) * sz;
  const halfZ = Math.abs(r20) * sx + Math.abs(r21) * sy + Math.abs(r22) * sz;
  const halfY = Math.abs(r10) * sx + Math.abs(r11) * sy + Math.abs(r12) * sz;
  return { xMin: position[0] - halfX, xMax: position[0] + halfX, zMin: position[2] - halfZ, zMax: position[2] + halfZ, yMin: position[1] - halfY, yMax: position[1] + halfY };
}

export function createBoulderColliders(boulders = BOULDER_LAYOUT) {
  if (!Array.isArray(boulders)) throw new TypeError("Boulder collider input must be an array");
  return Object.freeze(boulders.map((rock, index) => {
    if (!rock || ![...rock.position, ...rock.scale, ...rock.rotation].every(Number.isFinite) || rock.scale.some(value => value <= 0)) {
      throw new TypeError(`Invalid boulder transform at index ${index}`);
    }
    return Object.freeze({ id: `boulder-${index}`, category: "rock", shape: "box", ...rotatedBoxFootprint(rock.position, rock.scale, rock.rotation) });
  }));
}

export const BOULDER_COLLIDERS = createBoulderColliders(BOULDER_LAYOUT);

const reactorGround = sampleTerrainSurface(-13, -1)?.height ?? 0;

/** The reactor's low cylindrical pedestal encloses its overlapping supports and conduits. */
export const REACTOR_COLLIDERS = Object.freeze([
  Object.freeze({ id: "crystal-reactor-pedestal", category: "reactor", shape: "circle", x: -13, z: -1, radius: 2.65, yMin: reactorGround + 0.1, yMax: reactorGround + 2.0 }),
]);

export const ENVIRONMENT_COLLIDERS = Object.freeze([...BOULDER_COLLIDERS, ...REACTOR_COLLIDERS]);

export function colliderBounds(collider) {
  if (collider.shape === "circle") {
    return { xMin: collider.x - collider.radius, xMax: collider.x + collider.radius, zMin: collider.z - collider.radius, zMax: collider.z + collider.radius, yMin: collider.yMin, yMax: collider.yMax };
  }
  return { xMin: collider.xMin, xMax: collider.xMax, zMin: collider.zMin, zMax: collider.zMax, yMin: collider.yMin, yMax: collider.yMax };
}

export const BACKGROUND_RIDGES_UNREACHABLE = BACKGROUND_RIDGES.every(({ position }) => position[2] < -PLAYABLE_BOUNDARY);
