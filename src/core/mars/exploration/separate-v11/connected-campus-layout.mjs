import { createCampusPlan } from '../../../../imported-v11/core/mars/exploration/genesis-v5/3d/campus-layout.mjs';
export const V11_INDIVIDUAL_BUILDING_ANCHORS = Object.freeze({
  greenhouse: { x: -70, z: -68 },
  habitat: { x: -7, z: -82 },
});
export const V11_INDIVIDUAL_RELAY_ANCHORS = Object.freeze([
  { x: -90, z: -68 }, // YELLOW: left of greenhouse
  { x: -35, z: -86 }, // RED: closer to Command Hub
  { x: 12, z: -82 },  // GREEN: right of Genesis
]);

export const HUB = { x: -44, z: -68, halfX: 8, halfZ: 9 };
const WATER = { x: -19.3, z: -43.3, halfX: 22.5, halfZ: 22.5 };
function clearOf(a, b, margin) {
  return Math.abs(a.x - b.x) > a.halfX + b.halfX + margin ||
         Math.abs(a.z - b.z) > a.halfZ + b.halfZ + margin;
}
export function freeFootprint(candidate, occupied) {
  return clearOf(candidate, HUB, 5) && clearOf(candidate, WATER, 4) &&
    occupied.every(existing => clearOf(candidate, existing, 4));
}

// Deterministic local candidate offsets. All Y levels come from the actual
// rendered ARES terrain sampler; no artificial flat ground or fabricated Y.
const OFFSETS = [
  [0,0],[-5,0],[5,0],[0,-5],[0,5],[-10,0],[10,0],[0,-10],[0,10],
  [-5,-5],[5,-5],[-5,5],[5,5],[-10,-10],[10,-10],[-10,10],[10,10],
];

export function selectCampusBuildings(assets, terrainAt) {
  const selected = [];
  const occupied = [];
  for (const asset of assets) {
    const anchor = V11_INDIVIDUAL_BUILDING_ANCHORS[asset.id];
    if (!anchor) continue;
    let chosen = null;
    for (const [dx, dz] of OFFSETS) {
      const x = anchor.x + dx, z = anchor.z + dz;
      const footprint = { x, z, halfX: asset.width / 2, halfZ: asset.depth / 2 };
      if (!freeFootprint(footprint, occupied)) continue;
      try {
        const surface = (localX, localZ) =>
          terrainAt(x + localX, z + localZ);
        // Preserve each V11 GLB and its details. Recompute its individual
        // foundation using real world terrain underneath its own footprint.
        const plan = createCampusPlan(surface, [{ ...asset, x: 0, z: 0 }], false);
        if (asset.id === 'habitat') plan.sites[0].deck = plan.sites[0].max + .06;
        if (plan.sites.length !== 1) continue;
        chosen = { id: asset.id, worldX: x, worldZ: z, plan, footprint };
        break;
      } catch {
        // Not safe on this real terrain patch: test next candidate, never
        // bypass the V11 local slope/relief validation.
      }
    }
    if (!chosen) {
      console.error('V11_NO_SAFE_TERRAIN_FOR_BUILDING', asset.id);
      continue;
    }
    selected.push(chosen);
    occupied.push(chosen.footprint);
  }
  return selected;
}


/** Measured original V4 Hub exterior (its navigable interior is only 16 x 18).
 * Front additions abut the exterior wings; rear circulation enters the main room. */
export const HUB_ENVELOPE = Object.freeze({xMin:-60.275,xMax:-27.725,zMin:-78.2,zMax:-59});
export const CONNECTOR_WIDTH = 2.8;
export const CONNECTOR_HEIGHT = 3.6;
export function createConnectedCampusLayout({hubFloor, research, terrainAt}) {
  if (!research || !Number.isFinite(hubFloor)) return [];
  const {x,z,deck,halfX,halfZ}=research;
  const left=x-halfX, rear=z-halfZ;
  // Front connector preserved. Rear legs extend through genuine shell apertures.
  const joinZ=Math.min(-76.4,z+halfZ-1.4);
  const rearZ=Math.min(HUB_ENVELOPE.zMin,rear)-4.5;
  const rearFloor=Math.max(hubFloor,terrainAt(-40,rearZ)+.25);
  const researchRearFloor=Math.max(deck+.4,terrainAt(x,rearZ)+.25);
  const points=[
    {id:'hub-genesis-enclosed-link',a:[HUB_ENVELOPE.xMax-.2,hubFloor,joinZ],b:[left+.2,deck+.2,joinZ]},
    {id:'rear-hub-return',a:[-40,hubFloor,-75.1],b:[-40,rearFloor,rearZ]},
    {id:'rear-cross-wing',a:[-40,rearFloor,rearZ],b:[x,researchRearFloor,rearZ]},
    {id:'rear-genesis-return',a:[x,researchRearFloor,rearZ],b:[x,deck+.4,z-4]},
  ];
  return points.map(p=>{
    if (![...p.a,...p.b].every(Number.isFinite)) throw Error('Invalid connector datum');
    const dx=p.b[0]-p.a[0],dz=p.b[2]-p.a[2];
    const length=Math.hypot(dx,dz),rise=p.b[1]-p.a[1];
    return {...p,length,rise,grade:Math.abs(rise/length),angle:-Math.atan2(dz,dx)};
  });
}
