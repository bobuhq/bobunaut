import { memo, useEffect, useLayoutEffect, useMemo, useRef } from 'react';
import type { ReactNode } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
import { ARES_COMMAND_HUB_POSITION } from '../commandhub/AresCommandHubCollision';
import {
  ARES_COMMAND_HUB_FRONT_Z,
  ARES_COMMAND_HUB_STAIR_DEPTH,
  ARES_COMMAND_HUB_STAIR_WIDTH,
} from '../commandhub/AresCommandHubWalkableSurface';
import { CampusLandscape, pavingTexture } from './CampusLandscape';
import type { Landscape } from './campus-landscape.mjs';
import { CONNECTOR_WIDTH, HUB_ENVELOPE, type PlannedBuilding } from './connected-campus-layout.mjs';
import { SPACECRAFT_RADIUS } from '../genesis-v5/spacecraft-v3.mjs';

type TerrainAt = (x: number, z: number) => number;
type Bed = { x: number; z: number; rx: number; rz: number; crystals?: boolean; low?: boolean };
type Route = {
  points: [number, number][];
  halfWidth: number;
  pavingLift?: number;
  widen?: (x: number, z: number) => number;
  junction?: (x: number, z: number) => boolean;
  texturedByWorld?: boolean;
};
type Detail = {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  color?: string;
};

const cameraIgnore = { cameraIgnore: true };
const surfaceLift = .073;
const turn = Math.PI * 2;
const crystalProfile = [
  new THREE.Vector2(0, -.54),
  new THREE.Vector2(.38, -.43),
  new THREE.Vector2(.52, .23),
  new THREE.Vector2(0, .66),
];

function meshGeometry(positions: number[], indices: number[], uv?: number[]) {
  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  if (uv) geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2));
  geometry.setIndex(indices);
  geometry.computeVertexNormals();
  return geometry;
}

function ribbon(
  curve: THREE.CatmullRomCurve3, terrainAt: TerrainAt, left: number, right: number, lift: number,
  visible?: (x: number, z: number, distance: number) => boolean,
  widen?: Route['widen'], texturedByWorld = false,
) {
  const positions: number[] = [], indices: number[] = [], uv: number[] = [];
  const length = curve.getLength();
  const rows = Math.ceil(length / .24);
  const columns = Math.ceil((right - left) / (texturedByWorld ? .30 : .24));
  const center = new THREE.Vector3(), tangent = new THREE.Vector3();
  for (let row = 0; row <= rows; row++) {
    const t = row / rows;
    curve.getPointAt(t, center);
    curve.getTangentAt(t, tangent);
    const drawRow = row > 0 && (!visible || visible(center.x, center.z, t * length));
    const widthScale = widen?.(center.x, center.z) ?? 1;
    for (let column = 0; column <= columns; column++) {
      const offset = THREE.MathUtils.lerp(left, right, column / columns) * widthScale;
      const x = center.x - tangent.z * offset;
      const z = center.z + tangent.x * offset;
      positions.push(x, terrainAt(x, z) + lift, z);
      if (texturedByWorld) uv.push(x / 2.4, z / 1.2);
      else uv.push(offset / 1.15, t * length / 1.65);
      if (drawRow && column) {
        const i = row * (columns + 1) + column;
        indices.push(i - columns - 2, i - columns - 1, i - 1, i - columns - 1, i, i - 1);
      }
    }
  }
  return meshGeometry(positions, indices, uv);
}

// Sections run from the existing Hub stair down to the south approach.
function entranceCourt(terrainAt: TerrainAt, hubX: number, stairToe: number, mobile: boolean) {
  const halfStair = ARES_COMMAND_HUB_STAIR_WIDTH / 2;
  const sections = [
    [stairToe, hubX - halfStair - .16, hubX + halfStair + .02],
    [-54.5, hubX - 4.4, hubX + 1.76],
    [-52.5, hubX - 4.8, hubX + 1.74],
    [-49.0, hubX - 2.9, hubX + 1.7],
    [-42.0, hubX - 3.1, hubX + 1.68],
    [-34.2, hubX - 2.2, hubX + 1.58],
  ];
  function span(z: number) {
    const next = sections.findIndex(([end]) => end > z);
    if (next < 0) return sections[sections.length - 1].slice(1);
    const [from, left, right] = sections[next - 1];
    const [to, nextLeft, nextRight] = sections[next];
    const t = THREE.MathUtils.smoothstep(z, from, to);
    return [THREE.MathUtils.lerp(left, nextLeft, t), THREE.MathUtils.lerp(right, nextRight, t)];
  }
  const end = sections[sections.length - 1][0];
  const depth = end - stairToe;
  const grade = (z: number) => Math.min(
    THREE.MathUtils.smoothstep(z, stairToe, stairToe + 1.3),
    THREE.MathUtils.smoothstep(end - z, 0, 1.25),
  );
  const low = (z: number) => .009 + .035 * THREE.MathUtils.smoothstep(end - z, 0, 1.25);
  const high = (z: number) => low(z) + .027 * grade(z);

  const makeBatch = () => ({ positions: [] as number[], indices: [] as number[], uv: [] as number[], colors: [] as number[] });
  const joints = makeBatch(), panels = makeBatch(), fascia = makeBatch();
  const channels = makeBatch(), cyan = makeBatch(), amber = makeBatch();
  type Batch = ReturnType<typeof makeBatch>;

  function strip(batch: Batch, from: number, to: number, inner: number, outer: number,
    liftAt: (z: number, across: number) => number, tint = '#ffffff') {
    const rows = Math.ceil((to - from) / (mobile ? .44 : .22));
    const columns = Math.max(1, Math.ceil((outer - inner) / (mobile ? .045 : .012)));
    const start = batch.positions.length / 3;
    const color = new THREE.Color(tint);
    for (let row = 0; row <= rows; row++) {
      const z = THREE.MathUtils.lerp(from, to, row / rows);
      const [left, right] = span(z);
      for (let col = 0; col <= columns; col++) {
        const across = col / columns;
        const x = THREE.MathUtils.lerp(left, right, THREE.MathUtils.lerp(inner, outer, across));
        batch.positions.push(x, terrainAt(x, z) + liftAt(z, across), z);
        batch.uv.push(.024 + across * .95, .024 + (row / rows) * .95);
        batch.colors.push(color.r, color.g, color.b);
        if (row && col) {
          const i = start + row * (columns + 1) + col;
          batch.indices.push(i - columns - 2, i - 1, i - columns - 1, i - columns - 1, i - 1, i);
        }
      }
    }
  }

  strip(joints, stairToe, end, 0, 1, low);
  const courses = Math.ceil(depth / 1.34);
  const finishes = ['#69747e', '#747d87', '#64707b', '#78818b', '#6e7781'];
  for (let row = 0; row < courses; row++) {
    const from = stairToe + depth * row / courses + .012;
    const to = stairToe + depth * (row + 1) / courses - .012;
    const [left, right] = span((from + to) / 2);
    const columns = Math.ceil((right - left) / 2.15);
    const seams = [.039];
    for (let col = 1; col < columns; col++) {
      seams.push(.039 + .922 * (col - (row % 2) * .37) / columns);
    }
    seams.push(.961);
    const gap = .012 / (right - left);
    for (let col = 0; col < seams.length - 1; col++) {
      strip(panels, from, to, seams[col] + gap, seams[col + 1] - gap, high,
        finishes[(row * 3 + col * 2) % finishes.length]);
    }
  }

  for (const side of [0, 1]) {
    const edge = (inset: number) => side ? 1 - inset : inset;
    const range = (a: number, b: number) => [Math.min(edge(a), edge(b)), Math.max(edge(a), edge(b))] as const;
    strip(fascia, stairToe, end, ...range(0, .015), (z, across) => {
      const inward = side ? 1 - across : across;
      return THREE.MathUtils.lerp(-.026, high(z), inward);
    });
    strip(channels, stairToe, end, ...range(.015, .038), z => high(z) - .003);
    // Leave the west channel open at the existing garden-path junction.
    const runs = side ? [[stairToe + 1.4, end - .95]] : [[-55.3, -54.8], [-51.4, end - .95]];
    for (const [from, to] of runs) {
      strip(cyan, from, to, ...range(.019, .035), z => high(z) + .009);
    }
    for (const z of [-46.9, -43.6, -40.3, -37.2]) {
      strip(amber, z, z + .62, ...range(.010, .018), at => high(at) + .007);
    }
  }

  function geometry(batch: Batch, useTint = false) {
    const result = meshGeometry(batch.positions, batch.indices, batch.uv);
    if (useTint) result.setAttribute('color', new THREE.Float32BufferAttribute(batch.colors, 3));
    return result;
  }
  return {
    joints: geometry(joints), panels: geometry(panels, true), fascia: geometry(fascia),
    channels: geometry(channels), cyan: geometry(cyan), amber: geometry(amber),
  };
}

function bedShell(bed: Bed, terrainAt: TerrainAt, profile: [number, number][], segments: number) {
  const positions: number[] = [], indices: number[] = [];
  for (let ring = 0; ring < profile.length; ring++) {
    const [radius, lift] = profile[ring];
    for (let i = 0; i <= segments; i++) {
      const angle = i * turn / segments;
      const x = bed.x + Math.cos(angle) * bed.rx * radius;
      const z = bed.z + Math.sin(angle) * bed.rz * radius;
      positions.push(x, terrainAt(x, z) + lift * (bed.low ? .62 : 1), z);
      if (ring && i) {
        const j = ring * (segments + 1) + i;
        indices.push(j - segments - 2, j - 1, j - segments - 1, j - segments - 1, j - 1, j);
      }
    }
  }
  return meshGeometry(positions, indices);
}

function Instances({ details, children }: { details: Detail[]; children: ReactNode }) {
  const ref = useRef<THREE.InstancedMesh>(null);
  useLayoutEffect(() => {
    const mesh = ref.current!;
    const dummy = new THREE.Object3D();
    const color = new THREE.Color();
    details.forEach(({ position, scale, rotation, color: tint }, i) => {
      dummy.position.set(...position);
      dummy.scale.set(...scale);
      dummy.rotation.set(...(rotation ?? [0, 0, 0]));
      dummy.updateMatrix();
      mesh.setMatrixAt(i, dummy.matrix);
      if (tint) mesh.setColorAt(i, color.set(tint));
    });
    mesh.instanceMatrix.needsUpdate = true;
    if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [details]);
  return <instancedMesh ref={ref} args={[undefined, undefined, details.length]} userData={cameraIgnore}>
    {children}
  </instancedMesh>;
}

function makeDetails(beds: Bed[], terrainAt: TerrainAt, mobile: boolean) {
  const groundcover: Detail[] = [], gravel: Detail[] = [];
  const leaves: Detail[] = [], blooms: Detail[] = [], rocks: Detail[] = [];
  const crystals: Detail[] = [], fixtures: Detail[] = [], amber: Detail[] = [], beacons: Detail[] = [];
  let seed = 23;
  const leafCount = mobile ? 3 : 5;
  const random = () => {
    seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
    return seed / 0x100000000;
  };
  for (const bed of beds) {
    const soilLift = bed.low ? .25 : .40;
    const plantCount = Math.min(mobile ? 40 : 100, Math.ceil(bed.rx * bed.rz * (bed.low ? 5 : 10) * (mobile ? .4 : 1)));
    for (let i = 0; i < plantCount; i++) {
      const angle = i * 2.39996;
      const radius = .76 * Math.sqrt((i + .5) / plantCount);
      const x = bed.x + Math.cos(angle) * bed.rx * radius;
      const z = bed.z + Math.sin(angle) * bed.rz * radius;
      const y = terrainAt(x, z) + soilLift;
      const cluster = Math.cos(angle * 3 + radius * 8) > .35;
      const size = (.28 + random() * .48) * (bed.low ? .65 : cluster ? 1.75 : .88);
      groundcover.push({
        position: [x, y, z],
        scale: [size * .8, size * .31, size * .73],
        color: ['#879747', '#536737', '#646e38', '#3f5f48'][i % 4],
      });
      for (let j = 0; j < (mobile ? 0 : 2); j++) {
        const gravelAngle = angle + j * .36;
        const gx = bed.x + Math.cos(gravelAngle) * bed.rx * (.82 - random() * .37);
        const gz = bed.z + Math.sin(gravelAngle) * bed.rz * (.82 - random() * .37);
        const grain = .03 + random() * .065;
        gravel.push({
          position: [gx, terrainAt(gx, gz) + soilLift, gz],
          scale: [grain, grain * .55, grain * .77],
          color: ['#9a6b56', '#765d54', '#bb9679'][i % 3],
        });
      }
      for (let leaf = 0; leaf < leafCount; leaf++) {
        const heading = angle + leaf * turn / leafCount;
        leaves.push({
          position: [x + Math.sin(heading) * size * .21, y + size * .27, z + Math.cos(heading) * size * .21],
          rotation: [random() * .21, heading, 0],
          scale: [size * .20, size * 1.28, size * .68],
          color: ['#779d3f', '#3e713d', '#a0af44', '#315e50'][i % 4],
        });
      }
      if (i % 3 === 0 || (cluster && i % 2 === 0)) {
        for (let tip = 0; tip < (mobile ? 1 : 3); tip++) {
          blooms.push({
            position: [x + (tip - 1) * .11, y + size * (.42 + tip * .17), z],
            scale: [size * .18, size * .35, size * .18],
            color: ['#d270dd', '#a57cff', '#e3b15b'][Math.floor(i / 3) % 3],
          });
        }
      }
      if (i % (mobile ? 4 : 2) === 0) rocks.push({
        position: [x, y, z],
        rotation: [angle, angle * .3, .2],
        scale: [size * .75, size * .35, size * .49],
        color: i % 4 === 0 ? '#b37b62' : '#654d48',
      });
    }
    if (bed.crystals) {
      const anchorX = bed.x + bed.rx * .33;
      const anchorZ = bed.z + bed.rz * .14;
      rocks.push({
        position: [anchorX, terrainAt(anchorX, anchorZ) + .43, anchorZ],
        scale: [.74, .32, .52],
        rotation: [.2, .67, .14],
        color: '#865a4a',
      });
      for (let i = 0; i < 6; i++) {
        const angle = i * turn / 5;
        const x = anchorX + (i ? Math.cos(angle) * .53 : 0);
        const z = anchorZ + (i ? Math.sin(angle) * .43 : 0);
        const height = (i ? .58 + random() * .65 : 1.85);
        crystals.push({
          position: [x, terrainAt(x, z) + .46 + height * .31, z],
          rotation: [.17 * Math.sin(angle), angle, i ? .29 : .07],
          scale: [height * .46, height, height * .46],
          color: i % 2 ? '#b256ff' : '#e684ff',
        });
      }
    }
    for (const angle of [.68, 2.46, 4.08, 5.35]) {
      const x = bed.x + Math.cos(angle) * bed.rx * .986;
      const z = bed.z + Math.sin(angle) * bed.rz * .986;
      const yaw = Math.atan2(-Math.cos(angle) * bed.rz, -Math.sin(angle) * bed.rx);
      const y = terrainAt(x, z) + (bed.low ? .136 : .22);
      fixtures.push({ position: [x, y, z], scale: [.43, .105, .086], rotation: [0, yaw, 0] });
      amber.push({ position: [x, y, z], scale: [.35, .037, .098], rotation: [0, yaw, 0] });
    }
    if (bed.low) continue;
    const x = bed.x + bed.rx * .71, z = bed.z + bed.rz * .40;
    const y = terrainAt(x, z) + .42;
    fixtures.push({ position: [x, y + .24, z], scale: [.13, .48, .13] });
    fixtures.push({ position: [x, y + .59, z], scale: [.15, .045, .15] });
    beacons.push({ position: [x, y + .49, z], scale: [.11, .16, .11] });
  }
  return { groundcover, gravel, leaves, blooms, rocks, crystals, fixtures, amber, beacons };
}

function batchGeometry(parts: THREE.BufferGeometry[]) {
  const batch = mergeGeometries(parts);
  parts.forEach(geometry => geometry?.dispose());
  return batch;
}

type ParkedShip = readonly [number, number, number];

export function premiumCampusFootprints(greenhouse?: PlannedBuilding, genesis?: PlannedBuilding) {
  const hubX = ARES_COMMAND_HUB_POSITION.x;
  const seats: [number, number][] = [];
  const beds: Bed[] = [
    { x: -61.6, z: -48.65, rx: 5.15, rz: 2.85, crystals: true },
    { x: -51.85, z: -43.9, rx: 3.65, rz: 3.15, crystals: true },
    { x: -58.8, z: -36, rx: 4.75, rz: 2.85, crystals: true },
  ];
  const botanical: Route = {
    points: [[hubX - 3.8, -53.4], [-54, -53.45], [-61, -54.35]],
    halfWidth: 1.54,
    pavingLift: .091,
  };
  if (greenhouse) {
    const { worldX: x, worldZ: z, footprint } = greenhouse;
    const front = z + footprint.halfZ;
    botanical.points.push([x + 2.4, Math.max(front + 5.1, -55.5)],
      [x, front + 4.15], [x, front + 1.1]);
  }

  const routes: Route[] = [botanical, {
    points: [[-56.7, -55], [-56.7, -28.8]],
    halfWidth: 13.65,
    pavingLift: .064,
    texturedByWorld: true,
    widen: (_x, z) => 1 - .25 * THREE.MathUtils.smoothstep(z, -36, -28.8),
    junction: (_x, z) => z < -52 || z > -33,
  }];
  if (genesis?.worldX === -7 && genesis.worldZ === -82) {
    const x = genesis.worldX;
    const toe = genesis.worldZ + genesis.footprint.halfZ + 3.62;
    // Use the exterior circulation around Water. The north bank garden is
    // reached from Genesis forecourt, between Water and the enclosed link.
    routes.push(
      {
        points: [[hubX - 1.35, -34.2], [hubX, -28.5], [hubX, -23], [hubX, -19.5], [-42, -17],
          [-37.5, -17], [2.8, -17], [6.1, -17.8], [7.25, -21.2], [7.25, -52],
          [7.25, -63.5], [7.25, -66.65], [6.65, -68.55], [4.3, -69.45],
          [1.5, -69.45], [x, -69.45], [-11.4, -70.0], [-15.2, -72.4],
          [-21.2, -72.6], [-24.4, -72.3], [-26.4, -71.4]],
        halfWidth: 1.25,
        widen: (px, pz) => 1 + .45 * THREE.MathUtils.smoothstep(-px, 12, 19)
          * THREE.MathUtils.smoothstep(-pz, 68, 71),
        junction: (px, pz) => (px < -42 && pz < -29)
          || (px > 6.9 && Math.abs(pz + 58.2) < 1.35)
          || (pz < -68.6 && px < 4.8),
      },
      {
        points: [[x, -69.45], [x, -70.42], [x, toe]],
        halfWidth: 1.72,
        pavingLift: .092,
        junction: (_px, pz) => pz > -70.95,
      },
      {
        points: [[7.25, -58.2], [10.5, -58.2], [14.05, -58.4],
          [16.2, -60.25], [16.45, -63.9], [15.95, -66.2]],
        halfWidth: 1.18,
        pavingLift: .091,
      },
    );
    routes.push({
      points: [[-27.6, -70.4], [-21, -69.9], [-15, -69.25],
        [x, -69.3], [-1.2, -69.6], [4.7, -69.9]],
      halfWidth: 2.55,
      pavingLift: .085,
      texturedByWorld: true,
      junction: (px, pz) => Math.abs(px - x) < 2.3 || pz > -69.35 || px > 2.9,
    });
    beds.push(
      { x: -22, z: -69.45, rx: 5.2, rz: 2.7, crystals: true },
      { x: -14.1, z: -69.15, rx: 2.45, rz: 2.7 },
      { x: -.6, z: -72.6, rx: 2.55, rz: 1.9, crystals: true },
      { x: 1.8, z: -81.7, rx: 1.15, rz: 4.7 },
      { x: 11.95, z: -64.25, rx: 2.65, rz: 3.45, crystals: true },
      { x: 11.8, z: -55.35, rx: 3.0, rz: 1.25, low: true },
    );

    const rearWall = Math.min(HUB_ENVELOPE.zMin, genesis.worldZ - genesis.footprint.halfZ)
      - 4.5 - CONNECTOR_WIDTH / 2;
    routes.push({
      points: [[6.65, -68.55], [5.35, -72.7], [4.9, -81.8], [4.35, -91.7],
        [2.2, rearWall - 2.5], [-5.5, rearWall - 3.25], [-13.5, rearWall - 4.3],
        [-20.15, rearWall - 6.25], [-26, rearWall - 3.7], [-32, rearWall - 3.25],
        [-39, rearWall - 2.8], [-42.6, rearWall - 2.1]],
      halfWidth: 1.42,
      texturedByWorld: true,
      widen: (px, pz) => pz < rearWall - 4
        ? 1 + .85 * (1 - THREE.MathUtils.smoothstep(Math.abs(px + 20), 1.6, 4)) : 1,
      junction: (_px, pz) => pz > -71,
    });
    beds.push(
      { x: -27.3, z: rearWall - 8.1, rx: 4.25, rz: 2.35, crystals: true },
      { x: -15.3, z: rearWall - 8.9, rx: 3.75, rz: 2.15 },
      { x: -35.3, z: rearWall - 6.65, rx: 3.25, rz: 1.75 },
      { x: -4.1, z: rearWall - 6.9, rx: 3.2, rz: 1.65 },
    );
    seats.push([-21.45, rearWall - 7.95], [-19.05, rearWall - 7.95]);
  }
  return { beds, routes, seats };
}

export function buildPremiumCampusLayout(
  terrainAt: TerrainAt, greenhouse?: PlannedBuilding, genesis?: PlannedBuilding, parkedShip?: ParkedShip,
  mobile = false,
) {
  const clearOfShip = (x: number, z: number, margin: number) =>
    !parkedShip || Math.hypot(x - parkedShip[0], z - parkedShip[2]) > SPACECRAFT_RADIUS + 3 + margin;
  const { beds, routes, seats } = premiumCampusFootprints(greenhouse, genesis);
  const visibleBeds = beds.filter(bed => clearOfShip(bed.x, bed.z, Math.max(bed.rx, bed.rz) + .6));
  const segments = mobile ? 32 : 64;
  const soilRings = mobile ? 8 : 16;
  const paths = { paving: [], trim: [], inlays: [], amber: [] } as Record<
    'paving' | 'trim' | 'inlays' | 'amber', THREE.BufferGeometry[]
  >;
  for (const { points, halfWidth, pavingLift = surfaceLift, junction, widen, texturedByWorld } of routes) {
    const curve = new THREE.CatmullRomCurve3(points.map(([x, z]) => new THREE.Vector3(x, 0, z)));
    const length = curve.getLength();
    const clear = (x: number, z: number) =>
      clearOfShip(x, z, halfWidth * (widen?.(x, z) ?? 1) + .3);
    const lit = (x: number, z: number, distance: number) =>
      distance > .65 && distance < length - .48 && !junction?.(x, z) && clear(x, z);
    paths.paving.push(ribbon(curve, terrainAt, -halfWidth, halfWidth, pavingLift, clear, widen, texturedByWorld));
    for (const side of [-1, 1]) {
      const edge = side * (halfWidth - .10);
      const amberAt = (_x: number, _z: number, distance: number) =>
        lit(_x, _z, distance) && distance % 6.4 > 5.5;
      if (!mobile) paths.trim.push(ribbon(curve, terrainAt, edge - .078, edge + .078, pavingLift + .011, lit, widen));
      paths.inlays.push(ribbon(curve, terrainAt, edge - .052, edge + .052, pavingLift + .022,
        (x, z, distance) => lit(x, z, distance) && !amberAt(x, z, distance), widen));
      paths.amber.push(ribbon(curve, terrainAt, edge - .052, edge + .052, pavingLift + .022, amberAt, widen));
    }
  }
  return {
    plaza: entranceCourt(terrainAt, ARES_COMMAND_HUB_POSITION.x,
      ARES_COMMAND_HUB_FRONT_Z + ARES_COMMAND_HUB_STAIR_DEPTH, mobile),
    seats: seats.filter(([x, z]) => clearOfShip(x, z, 1.25)),
    paths: {
      paving: batchGeometry(paths.paving), trim: mobile ? null : batchGeometry(paths.trim),
      inlays: batchGeometry(paths.inlays), amber: batchGeometry(paths.amber),
    },
    islands: {
      wall: batchGeometry(visibleBeds.map(bed => bedShell(bed, terrainAt,
        [[1, -.03], [1, .16], [.986, .19], [.986, .23], [1, .245],
          [1, .35], [.97, .46], [.86, .46], [.84, .39]], segments))),
      soil: batchGeometry(visibleBeds.map(bed => bedShell(bed, terrainAt,
        Array.from({ length: soilRings }, (_, i) => [.85 * (1 - i / (soilRings - 1)), .39]), segments))),
      light: batchGeometry(visibleBeds.map(bed => bedShell(bed, terrainAt, [[.989, .194], [.989, .225]], segments))),
    },
    details: makeDetails(visibleBeds, terrainAt, mobile),
  };
}

// Static textures and terrain buffers follow the mounted campus lifetime.
export const PremiumCampusLandscape = memo(function PremiumCampusLandscape({
  plan, terrainAt, greenhouse, genesis, parkedShip, mobile,
}: {
  plan: Landscape;
  terrainAt: TerrainAt;
  greenhouse?: PlannedBuilding;
  genesis?: PlannedBuilding;
  parkedShip?: ParkedShip;
  mobile: boolean;
}) {
  const texture = useMemo(() => pavingTexture(mobile ? 128 : 256), [mobile]);
  const grassBlade = useMemo(() => meshGeometry(
    [-.24, -.22, 0, .24, -.22, 0, -.47, .25, .14, .47, .25, .14,
      0, .26, .04, -.22, .58, .45, .22, .58, .45, 0, .91, .78],
    [0, 1, 4, 0, 4, 2, 1, 3, 4, 2, 4, 5, 4, 3, 6, 4, 6, 5, 5, 6, 7],
  ), []);
  useEffect(() => () => grassBlade.dispose(), [grassBlade]);
  useEffect(() => () => texture.dispose(), [texture]);
  const layout = useMemo(() => buildPremiumCampusLayout(terrainAt, greenhouse, genesis, parkedShip, mobile),
    [terrainAt, greenhouse, genesis, parkedShip, mobile]);
  useEffect(() => () => {
    const { plaza, paths, islands } = layout;
    [...Object.values(plaza), ...Object.values(paths), ...Object.values(islands)]
      .forEach(geometry => geometry?.dispose());
  }, [layout]);

  const { details } = layout;
  const fineDetails = useRef<THREE.Group>(null);
  const bounds = useMemo(() => {
    if (!mobile) return null;
    layout.islands.wall?.computeBoundingBox();
    return layout.islands.wall?.boundingBox;
  }, [layout, mobile]);
  useFrame(({ camera }) => {
    const group = fineDetails.current;
    if (!group || !bounds) return;
    const range = group.visible ? 42 : 38;
    group.visible = gardenDetailInRange(bounds, camera.position, range);
  });
  return <group name="v23-premium-campus-landscape">
    <CampusLandscape plan={plan} texture={texture} mobile={mobile} />
    <group name="v23.2-command-hub-entrance-court">
      <mesh geometry={layout.plaza.joints} userData={cameraIgnore} receiveShadow>
        <meshStandardMaterial color="#202630" roughness={.84} />
      </mesh>
      <mesh geometry={layout.plaza.panels} userData={cameraIgnore} receiveShadow>
        <meshStandardMaterial vertexColors map={texture} bumpMap={mobile ? null : texture}
          bumpScale={.008} metalness={.40} roughness={.42} />
      </mesh>
      {[layout.plaza.fascia, layout.plaza.channels].map((geometry, i) => (
        <mesh key={i} geometry={geometry} userData={cameraIgnore}>
          <meshStandardMaterial color="#353f4a" metalness={.58} roughness={.45} />
        </mesh>
      ))}
      <mesh geometry={layout.plaza.cyan} userData={cameraIgnore}>
        <meshBasicMaterial color="#4de6fa" toneMapped={false} />
      </mesh>
      <mesh geometry={layout.plaza.amber} userData={cameraIgnore}>
        <meshStandardMaterial color="#ffc185" emissive="#f6a749" emissiveIntensity={.62} roughness={.52} />
      </mesh>
    </group>
    <group name="v23.5-campus-gardens-and-promenades">
      <mesh geometry={layout.paths.paving} userData={cameraIgnore} receiveShadow>
        <meshStandardMaterial color="#687682" map={texture} bumpMap={mobile ? null : texture}
          bumpScale={.012} metalness={.36} roughness={.50}
          emissive="#46576c" emissiveMap={mobile ? null : texture} emissiveIntensity={mobile ? .06 : .16} />
      </mesh>
      {layout.paths.trim && <mesh geometry={layout.paths.trim} userData={cameraIgnore}>
        <meshStandardMaterial color="#344858" metalness={.63} roughness={.37} />
      </mesh>}
      <mesh geometry={layout.paths.inlays} userData={cameraIgnore}>
        <meshBasicMaterial color="#5de5f5" toneMapped={false} />
      </mesh>
      <mesh geometry={layout.paths.amber} userData={cameraIgnore}>
        <meshBasicMaterial color="#ffc185" toneMapped={false} />
      </mesh>
      <mesh geometry={layout.islands.wall} userData={cameraIgnore} receiveShadow>
        <meshStandardMaterial color="#53616d" metalness={.53} roughness={.41} />
      </mesh>
      <mesh geometry={layout.islands.soil} userData={cameraIgnore}>
        <meshStandardMaterial color="#493831" roughness={.96} />
      </mesh>
      <mesh geometry={layout.islands.light} userData={cameraIgnore}>
        <meshBasicMaterial color="#31dbe8" toneMapped={false} />
      </mesh>
    </group>
    {layout.seats.map(([x, z]) => <group key={x} position={[x, terrainAt(x, z) + .08, z]}>
      <mesh position={[0, .06, 0]} userData={cameraIgnore}>
        <boxGeometry args={[1.38, .26, .42]} />
        <meshStandardMaterial color="#394854" metalness={.48} roughness={.45} />
      </mesh>
      <mesh position={[0, .29, 0]} userData={cameraIgnore}>
        <boxGeometry args={[1.85, .22, .58]} />
        <meshStandardMaterial color="#566371" metalness={.48} roughness={.45} />
      </mesh>
      <mesh position={[0, .47, .23]} userData={cameraIgnore}>
        <boxGeometry args={[1.85, .16, .12]} />
        <meshStandardMaterial color="#394854" metalness={.48} roughness={.45} />
      </mesh>
      <mesh position={[0, .143, -.24]} userData={cameraIgnore}>
        <boxGeometry args={[1.43, .035, .08]} />
        <meshBasicMaterial color="#ffc185" toneMapped={false} />
      </mesh>
    </group>)}
    <Instances details={details.groundcover}>
      <icosahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={.82} />
    </Instances>
    <group ref={fineDetails}>
      {!mobile && <Instances details={details.gravel}>
        <dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={.92} />
      </Instances>}
      <Instances details={details.leaves}>
        <primitive object={grassBlade} attach="geometry" />
        <meshStandardMaterial roughness={.61} side={THREE.DoubleSide} />
      </Instances>
      <Instances details={details.blooms}>
        <icosahedronGeometry args={[1, 0]} /><meshStandardMaterial emissive="#632455" emissiveIntensity={.29} roughness={.66} />
      </Instances>
    </group>
    <Instances details={details.rocks}>
      <dodecahedronGeometry args={[1, 0]} /><meshStandardMaterial roughness={.9} />
    </Instances>
    <Instances details={details.crystals}>
      <latheGeometry args={[crystalProfile, 6]} />
      <meshStandardMaterial emissive="#a21aff" emissiveIntensity={.85} metalness={.28} roughness={.23} flatShading />
    </Instances>
    <Instances details={details.fixtures}>
      <boxGeometry /><meshStandardMaterial color="#293943" metalness={.65} roughness={.39} />
    </Instances>
    <Instances details={details.amber}>
      <boxGeometry /><meshBasicMaterial color="#ffd7a0" toneMapped={false} />
    </Instances>
    <Instances details={details.beacons}>
      <boxGeometry /><meshBasicMaterial color="#9dfaff" toneMapped={false} />
    </Instances>
  </group>;
});

export function gardenDetailInRange(bounds: THREE.Box3, camera: THREE.Vector3, range: number) {
  const dx = Math.max(bounds.min.x - camera.x, 0, camera.x - bounds.max.x);
  const dy = Math.max(bounds.min.y - camera.y, 0, camera.y - bounds.max.y);
  const dz = Math.max(bounds.min.z - camera.z, 0, camera.z - bounds.max.z);
  return dx * dx + dy * dy + dz * dz <= range * range;
}
