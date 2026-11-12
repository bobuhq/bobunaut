import { GenesisMasterIdentity, GenesisMasterFoundations } from "./GenesisMasterIdentity";
import { CinematicRooms, CinematicExterior, PressureDoorLeaf, GreenAirlockFrame } from "./CinematicEnvironment";
import { interiorOptions, interiorMetrics, roomAt, roomVisible, type Room } from "./interior-policy.mjs";
import { solveInteriorOrbit } from "./shoulder-camera.mjs";
import { cameraSolids, constrainGenesisEye } from "./interior-camera.mjs";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";
import { memo, useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  canFollowGround,
  keepCameraAboveTerrain,
  keepCameraInFrontOfFurniture,
  MAX_WALKABLE_SLOPE_DEGREES,
  sampleTerrainSurface,
  sampleWalkableGround,
  TERRAIN_HALF_SIZE,
  TERRAIN_SEGMENTS,
  TERRAIN_SIZE,
  terrainVertexHeight,
} from "./terrain-surface.mjs";
import { createRegolithStones } from "./terrain-visual-data.mjs";
import { CREW_CONSOLES, COLLISION_VOLUMES, FURNITURE_COLLIDERS, STRUCTURAL_COLLIDERS, crossesPortal, movementTouchesSolids } from "./structural-collision.mjs";
import { BACKGROUND_RIDGES, BOULDER_LAYOUT, ENVIRONMENT_COLLIDERS, PLAYABLE_BOUNDARY, REACTOR_COLLIDERS, colliderBounds } from "./environment-collision.mjs";

/**
 * Standalone, synthetic Genesis V5 play space. This file deliberately imports
 * no production Mars scene, player, audio, route, asset, or backend modules.
 * Coordinates are local metres: +Z is the outer airlock, -Z leads to Habitat.
 */
const FLOOR = 1.2;
const WALK_RADIUS = 0.34;
const HUB = { x: 0, z0: -9, z1: 9, halfW: 8 };
const CORRIDOR = { z0: -26, z1: -9, halfW: 2.15 };
const HABITAT = { z0: -43, z1: -26, halfW: 7 };
const WORLD_LIMIT = PLAYABLE_BOUNDARY;
const WORLD_COLLISION_VOLUMES = Object.freeze([...COLLISION_VOLUMES, ...ENVIRONMENT_COLLIDERS]);
export type GenesisDoorId = "surface" | "hub" | "habitat";
export type GenesisDoorState = Record<GenesisDoorId, number>;
type DoorId = GenesisDoorId;
type DoorState = GenesisDoorState;
type PlayerApi = { moveTo: (x: number, z: number) => boolean; position: () => [number, number, number]; zone: () => string };

declare global { interface Window { __genesis3d?: { player?: PlayerApi; testSpeedScale?: number; groundAt?: (x: number, z: number) => ReturnType<typeof sampleWalkableGround>; terrainAt?: typeof sampleTerrainSurface; terrainClassAt?: (x: number, z: number) => { classification: "walkable terrain" | "impassable slope" | "outside terrain mesh"; height?: number; slopeDegrees?: number } ; playableBoundary?: number; cameraFurniture?: typeof CAMERA_SOLIDS; colliders?: typeof WORLD_COLLISION_VOLUMES; structuralColliders?: typeof STRUCTURAL_COLLIDERS; furnitureColliders?: typeof FURNITURE_COLLIDERS; environmentColliders?: typeof ENVIRONMENT_COLLIDERS; doors?: () => DoorState; doorTargets?: DoorState; doorPeaks?: DoorState; lastCollision?: { id: string; from: [number, number]; to: [number, number] } | null; lastGroundBlock?: { from: [number, number, number]; to: [number, number, number]; sample: ReturnType<typeof sampleWalkableGround> } | null; lastMoveAttempt?: { from: [number, number]; to: [number, number]; blocked: boolean; ground?: ReturnType<typeof sampleWalkableGround> } | null; motionIntent?: { keys: string[]; forward: number; right: number; speed: number; vx: number; vz: number }; frameDelta?: number; interact?: () => void; input?: React.MutableRefObject<{ x: number; y: number }>; camera?: THREE.Camera; renderer?: THREE.WebGLRenderer; scene?: THREE.Scene; staticBatches?: number; batchedBoxes?: number; collisionDebug?: boolean; toggleCollisionDebug?: () => void; ready?: boolean; frames?: number; errors?: string[] } } }

const INTERIOR_FLOORS = [
  { x: HUB.x, z: 0, halfWidth: HUB.halfW, halfDepth: 9, height: FLOOR },
  { x: 0, z: -17.5, halfWidth: CORRIDOR.halfW, halfDepth: 8.6, height: FLOOR },
  { x: 0, z: -34.5, halfWidth: HABITAT.halfW, halfDepth: 8.5, height: FLOOR },
];

const CAMERA_SOLIDS = WORLD_COLLISION_VOLUMES.map(colliderBounds);

function groundAt(x: number, z: number) {
  return sampleWalkableGround(x, z, INTERIOR_FLOORS);
}

function floorY(x: number, z: number) {
  return groundAt(x, z)?.height ?? Number.NaN;
}

function zoneAt(x: number, z: number) {
  if (Math.abs(x) <= HABITAT.halfW && z >= HABITAT.z0 && z <= HABITAT.z1) return "HABITAT · CREW QUARTERS";
  if (Math.abs(x) <= CORRIDOR.halfW && z >= CORRIDOR.z0 && z <= CORRIDOR.z1) return "PRESSURISED CONNECTOR";
  if (Math.abs(x) <= HUB.halfW && z >= HUB.z0 && z <= HUB.z1) return "COMMAND HUB · OPERATIONS";
  if (z > HUB.z1) return "ARES SURFACE · ENTRY APRON";
  return "ARES SURFACE · GENESIS OUTPOST";
}

function blockedMove(x: number, z: number, nx: number, nz: number, doors: DoorState) {
  if (Math.abs(nx) > WORLD_LIMIT || Math.abs(nz) > WORLD_LIMIT) return true;
  const portalCrossings: Array<[DoorId, number, number, number]> = [
    ["surface", HUB.z1, 1.65, doors.surface],
    ["hub", HUB.z0, 1.65, doors.hub],
    ["habitat", HABITAT.z1, 1.72, doors.habitat],
  ];
  for (const [id, plane, halfWidth, openness] of portalCrossings) {
    if (nz === z) continue;
    const t = (plane - z) / (nz - z);
    if (t < 0 || t > 1) continue;
    const crossingX = x + (nx - x) * t;
    if (crossesPortal(z, nz, plane, openness, crossingX, halfWidth, WALK_RADIUS)) return true;
  }
  const blocker = movementTouchesSolids(x, z, nx, nz, WALK_RADIUS, WORLD_COLLISION_VOLUMES);
  if (blocker && window.__genesis3d) window.__genesis3d.lastCollision = { id: blocker.id, from: [x, z], to: [nx, nz] };
  return !!blocker;
}

function Terrain() {
  const terrain = useMemo(() => {
    const g = new THREE.PlaneGeometry(210, 210, 72, 72); g.rotateX(-Math.PI / 2);
    const p = g.attributes.position as THREE.BufferAttribute;
    const colors: number[] = [];
    const color = new THREE.Color();
    for (let i = 0; i < p.count; i++) {
      const x = p.getX(i), z = p.getZ(i), y = terrainVertexHeight(x, z);
      p.setY(i, y);
      const elevation = THREE.MathUtils.clamp((y + 0.2) / 5.5, 0, 1);
      const strata = Math.sin(x * 0.19 + z * 0.075) * 0.045 + Math.sin(x * 0.43 - z * 0.31) * 0.018;
      const dust = Math.cos(x * 0.11 - z * 0.16) * 0.022;
      const craterA = Math.exp(-((x - 39) ** 2 + (z + 32) ** 2) / 320);
      const craterB = Math.exp(-((x + 48) ** 2 + (z - 47) ** 2) / 510);
      const craterRing = (Math.exp(-(((Math.hypot(x - 39, z + 32) - 8) / 1.7) ** 2)) + Math.exp(-(((Math.hypot(x + 48, z - 47) - 11) / 2.1) ** 2))) * 0.052;
      color.setRGB(
        THREE.MathUtils.clamp(0.31 + elevation * 0.095 + strata + craterRing - craterA * 0.075 - craterB * 0.055, 0.17, 0.55),
        THREE.MathUtils.clamp(0.105 + elevation * 0.048 + dust + strata * 0.22, 0.055, 0.24),
        THREE.MathUtils.clamp(0.071 + elevation * 0.036 + dust * 0.58 + craterRing * 0.24, 0.04, 0.17),
      );
      colors.push(color.r, color.g, color.b);
    }
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3)); g.computeVertexNormals();

    // Smooth seamless grayscale regolith tile. It modulates the exact
    // collision mesh only; it introduces no geometry or physical height.
    const size = 128, pixels = new Uint8Array(size * size * 4);
    const hash = (x: number, y: number) => { const n = Math.sin(x * 127.1 + y * 311.7) * 43758.5453; return n - Math.floor(n); };
    const noise = (px: number, py: number, cells: number) => {
      const gx = px / size * cells, gy = py / size * cells, ix = Math.floor(gx), iy = Math.floor(gy);
      const smooth = (v: number) => v * v * (3 - 2 * v), fx = smooth(gx - ix), fy = smooth(gy - iy);
      const a = hash(ix % cells, iy % cells), b = hash((ix + 1) % cells, iy % cells);
      const c = hash(ix % cells, (iy + 1) % cells), d = hash((ix + 1) % cells, (iy + 1) % cells);
      return THREE.MathUtils.lerp(THREE.MathUtils.lerp(a, b, fx), THREE.MathUtils.lerp(c, d, fx), fy);
    };
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const broad = noise(x, y, 8) * 0.46;
      const medium = noise(x, y, 32) * 0.31;
      const fine = noise(x, y, 96) * 0.17;
      const grain = hash(x, y) * 0.06;
      const value = Math.round(192 + (broad + medium + fine + grain) * 55), index = (y * size + x) * 4;
      pixels[index] = value; pixels[index + 1] = value; pixels[index + 2] = value; pixels[index + 3] = 255;
    }
    const texture = new THREE.DataTexture(pixels, size, size, THREE.RGBAFormat);
    texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(18, 18);
    texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 4; texture.needsUpdate = true;
    const material = new THREE.MeshStandardMaterial({ map: texture, bumpMap: texture, bumpScale: 0.009, vertexColors: true, roughness: 0.98, metalness: 0 });
    return { geometry: g, texture, material };
  }, []);
  useEffect(() => () => { terrain.geometry.dispose(); terrain.texture.dispose(); terrain.material.dispose(); }, [terrain]);
  return <mesh geometry={terrain.geometry} material={terrain.material} receiveShadow userData={{ genesisTerrainSurface: true }} />;
}

function HorizonRidge({ position, scale, color, seed }: { position: [number, number, number]; scale: [number, number, number]; color: string; seed: number }) {
  const geometry = useMemo(() => {
    const segments = 72, rows = 4, vertices: number[] = [], colors: number[] = [], indices: number[] = [];
    for (let i = 0; i <= segments; i++) {
      const x = i / segments, broad = 0.28 + 0.22 * Math.sin(x * 12 + seed) + 0.16 * Math.sin(x * 25 - seed * 0.7);
      const peaks = Array.from({ length: 5 }, (_, j) => {
        const center = 0.1 + j * 0.19 + 0.025 * Math.sin(seed + j), width = 0.06 + 0.018 * (j % 2);
        return Math.exp(-Math.pow((x - center) / width, 2)) * (0.32 + 0.13 * Math.sin(seed * 2 + j * 1.7));
      });
      const ridgeHeight = Math.max(0.18, Math.min(1, broad + Math.max(...peaks)));
      const heights = [0, ridgeHeight, ridgeHeight * (0.79 + 0.04 * Math.sin(x * 16)), 0];
      const depths = [0, -1.2, -5.5, -9];
      for (let row = 0; row < rows; row++) {
        vertices.push(x - 0.5, heights[row], depths[row]);
        const shade = [0.54, 0.84, 0.68, 0.44][row] * (0.94 + 0.06 * Math.sin(i * 0.7 + seed));
        colors.push(shade, shade * 0.72, shade * 0.68);
      }
    }
    for (let i = 0; i < segments; i++) for (let row = 0; row < rows - 1; row++) {
      const a = i * rows + row, b = a + rows;
      indices.push(a, b, a + 1, b, b + 1, a + 1);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3));
    g.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3));
    g.setIndex(indices); g.computeVertexNormals(); return g;
  }, [seed]);
  const material = useMemo(() => new THREE.MeshStandardMaterial({ color, vertexColors: true, roughness: 1, flatShading: true, side: THREE.DoubleSide }), [color]);
  useEffect(() => () => { geometry.dispose(); material.dispose(); }, [geometry, material]);
  return <mesh geometry={geometry} material={material} position={position} scale={scale} frustumCulled />;
}

function TerrainStones() {
  const details = useMemo(() => {
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const materials = ["#685049", "#806055", "#554641", "#92705d"].map(color => new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
    const stones = createRegolithStones(sampleTerrainSurface, 210);
    const meshes = materials.map((material, color) => {
      const selected = stones.filter(stone => stone.color === color), mesh = new THREE.InstancedMesh(geometry, material, selected.length);
      const position = new THREE.Vector3(), scale = new THREE.Vector3(), rotation = new THREE.Euler(), quaternion = new THREE.Quaternion();
      selected.forEach((stone, i) => mesh.setMatrixAt(i, new THREE.Matrix4().compose(position.set(...stone.position), quaternion.setFromEuler(rotation.set(...stone.rotation)), scale.set(...stone.scale))));
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage); mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingBox(); mesh.computeBoundingSphere(); mesh.receiveShadow = true;
      return mesh;
    });
    return { geometry, materials, meshes };
  }, []);
  useEffect(() => () => { details.meshes.forEach(mesh => mesh.dispose()); details.geometry.dispose(); details.materials.forEach(material => material.dispose()); }, [details]);
  return <group dispose={null}>{details.meshes.map(mesh => <primitive key={mesh.uuid} object={mesh} />)}</group>;
}

function AtmosphericDust() {
  const points = useRef<THREE.Points>(null);
  const field = useMemo(() => {
    const positions: number[] = [];
    const fract = (value: number) => { const n = Math.sin(value) * 43758.5453; return n - Math.floor(n); };
    let i = 0, attempts = 0;
    while (i < 52 && attempts < 400) {
      const px = fract(attempts * 127.1 + 11) * 94 - 47, pz = fract(attempts * 311.7 + 29) * 94 - 47;
      attempts++;
      if (Math.abs(px) < 11 && pz > -48 && pz < 29) continue;
      const ground = sampleTerrainSurface(px, pz);
      if (!ground) continue;
      positions.push(px, ground.height + 0.7 + (i % 7) * 0.31, pz);
      i++;
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
    const material = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, uniforms: { uTime: { value: 0 } },
      vertexShader: "uniform float uTime; void main(){ vec3 p=position; p.x += sin(uTime*0.12+position.z*0.11)*0.22; p.y += sin(uTime*0.18+position.x*0.09)*0.07; vec4 mv=modelViewMatrix*vec4(p,1.0); gl_Position=projectionMatrix*mv; gl_PointSize=clamp(2.8*(220.0/-mv.z),1.0,3.8); }",
      fragmentShader: "void main(){ vec2 d=gl_PointCoord-vec2(0.5); float a=1.0-smoothstep(0.04,0.24,dot(d,d)); gl_FragColor=vec4(1.0,0.66,0.48,a*0.16); }",
    });
    return { geometry, material };
  }, []);
  useEffect(() => () => { field.geometry.dispose(); field.material.dispose(); }, [field]);
  useFrame(({ clock }) => { field.material.uniforms.uTime.value = clock.elapsedTime; });
  return <points ref={points} geometry={field.geometry} material={field.material} frustumCulled={false} />;
}

function createDashboardTexture(accent: string) {
  const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 256;
  const context = canvas.getContext("2d");
  if (!context) throw new Error("Local dashboard canvas is unavailable");
  const gradient = context.createLinearGradient(0, 0, 512, 256);
  gradient.addColorStop(0, "#0b2028"); gradient.addColorStop(1, "#07141c");
  context.fillStyle = gradient; context.fillRect(0, 0, 512, 256);
  context.globalAlpha = 0.32; context.strokeStyle = "#53747c"; context.lineWidth = 1;
  for (let x = 22; x < 512; x += 32) { context.beginPath(); context.moveTo(x, 28); context.lineTo(x, 250); context.stroke(); }
  for (let y = 36; y < 256; y += 28) { context.beginPath(); context.moveTo(18, y); context.lineTo(500, y); context.stroke(); }
  context.globalAlpha = 1; context.fillStyle = accent; context.fillRect(18, 16, 108, 5); context.fillRect(18, 29, 170, 2);
  for (let i = 0; i < 4; i++) { context.globalAlpha = 0.55; context.fillStyle = i === 0 ? accent : "#33525b"; context.fillRect(308 + i * 45, 13, 30, 7); }
  context.globalAlpha = 1; context.lineWidth = 3; context.strokeStyle = accent; context.beginPath();
  for (let i = 0; i < 17; i++) { const x = 24 + i * 17, y = 174 - Math.sin(i * 0.72) * 30 - Math.sin(i * 1.53) * 12; i ? context.lineTo(x, y) : context.moveTo(x, y); }
  context.stroke(); context.globalAlpha = 0.2; context.fillStyle = accent; context.lineTo(296, 230); context.lineTo(24, 230); context.closePath(); context.fill();
  context.globalAlpha = 0.8; context.strokeStyle = "#b37bda"; context.lineWidth = 2;
  for (let ring = 1; ring <= 3; ring++) { context.beginPath(); context.arc(405, 150, ring * 16, 0, Math.PI * 2); context.stroke(); }
  context.beginPath(); context.moveTo(405, 150); context.lineTo(433, 108); context.lineTo(457, 138); context.lineTo(427, 170); context.closePath(); context.fillStyle = "#965ec0"; context.globalAlpha = 0.35; context.fill();
  // Static hierarchy: identification, system state, telemetry and operator footer.
  context.globalAlpha = 1; context.fillStyle = "#07141c"; context.fillRect(12, 8, 488, 48);
  context.font = "bold 17px monospace"; context.fillStyle = "#d4e6e8";
  context.fillText("BOBU / GENESIS", 22, 29);
  context.font = "11px monospace"; context.fillStyle = accent;
  context.fillText("SYSTEM TELEMETRY     /     LOCAL STATUS", 22, 47);
  context.fillText("POWER / ENVIRONMENT", 22, 79); context.fillText("CORE ARRAY", 350, 79);
  context.fillText("NOMINAL", 350, 218);
  context.fillStyle = "#b7cbd0"; context.fillText("01  BUS STABLE     02  PRESSURE SEALED", 22, 108);
  context.fillStyle = "#07141c"; context.fillRect(172, 230, 330, 24);
  context.fillStyle = "#9fb6bf"; context.fillText("OPS // READOUT   |   BOBU SYSTEMS", 178, 246);
  context.globalAlpha = 1; context.fillStyle = accent;
  for (let i = 0; i < 5; i++) { context.fillRect(22 + i * 28, 238, 18, i % 2 ? 4 : 8); }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = 2; texture.needsUpdate = true;
  return texture;
}

function DisplaySurface({ position, size, rotation = [0, 0, 0], accent = "#50d6d7", texture }: { position: [number, number, number]; size: [number, number]; rotation?: [number, number, number]; accent?: string; texture: THREE.Texture }) {
  return <mesh position={position} rotation={rotation}>
    <planeGeometry args={size} /><meshBasicMaterial map={texture} color={accent} toneMapped={false} side={THREE.DoubleSide} />
  </mesh>;
}

function CommandDisplaySurfaces() {
  const texture = useMemo(() => createDashboardTexture("#50d6d7"), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group>
    {[-5.6, 0, 5.6].map(x => <DisplaySurface key={`wall-${x}`} position={[x, FLOOR + 2.85, -8.59]} size={[4.28, 1.89]} texture={texture} />)}
    {CREW_CONSOLES.map(({ x, z }, i) => <DisplaySurface key={`console-${i}`} position={[x, FLOOR + 1.67, z - 0.365]} size={[1.62, 0.46]} texture={texture} />)}
  </group>;
}

function HabitatDisplaySurfaces() {
  const texture = useMemo(() => createDashboardTexture("#77d4c5"), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group>
    {[-5, 5].map(x => <DisplaySurface key={x} position={[x, FLOOR + 3.2, -42.55]} size={[3.32, 1.48]} texture={texture} />)}
  </group>;
}

/** Static identification atlas: one shared opaque material, one plane batch per room. */
function InteriorIdentification() {
  const resources = useMemo(() => {
    const canvas = document.createElement("canvas"); canvas.width = 512; canvas.height = 256;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Local identification canvas is unavailable");
    const labels = ["BOBU / GENESIS OPERATIONS", "01  AIRLOCK  /  OPERATIONS >", "02  HABITAT  /  CREW >", "LS-01 / LIFE SUPPORT", "RS-02 / RESEARCH STORAGE", "HY-03 / HYDROPONICS", "CREW / REST MODULE", "SERVICE / FILTER ACCESS"];
    labels.forEach((label, row) => {
      ctx.fillStyle = "#202e37"; ctx.fillRect(0, row * 32, 512, 32);
      ctx.fillStyle = row % 2 ? "#ab88c6" : "#72cbd1"; ctx.fillRect(0, row * 32, 6, 32);
      ctx.font = "bold 19px monospace"; ctx.fillStyle = "#d4e2e4"; ctx.fillText(label, 18, row * 32 + 23);
    });
    const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace;
    texture.generateMipmaps = false; texture.minFilter = THREE.LinearFilter;
    const material = new THREE.MeshBasicMaterial({ map: texture, toneMapped: false });
    const geometries = labels.map((_, row) => {
      const geometry = new THREE.PlaneGeometry(1, 1), uv = geometry.getAttribute("uv");
      for (let i = 0; i < uv.count; i++) uv.setY(i, (7 - row + uv.getY(i)) / 8);
      return geometry;
    });
    return { texture, material, geometries };
  }, []);
  useEffect(() => () => { resources.texture.dispose(); resources.material.dispose(); resources.geometries.forEach(g => g.dispose()); }, [resources]);
  // Each room merges atlas tiles once; no scene traversal or updates per frame.
  const signs = useMemo(() => {
    const layouts: { room: string; tiles: number[][] }[] = [
      { room: "exterior", tiles: [[0, 0, 3.67, 13.64, 3.1, .24, 0], [0, 5.3, 4.1, 9.43, 2.35, .24, 0]] },
      { room: "control", tiles: [[0, 0, 4.12, -8.65, 3.8, .24, 0], [1, 0, 3.8, 8.69, 3.1, .2, Math.PI]] },
      { room: "corridor", tiles: [[1, 0, 3.12, -9.28, 2.9, .2, Math.PI], [2, 0, 3.12, -25.84, 2.9, .2, 0], [7, 1.934, 2.05, -17.5, 2.1, .15, -Math.PI / 2]] },
      { room: "habitat", tiles: [[3, -5, 2.12, -28.758, 2.1, .17, 0], [4, -5, 1.65, -28.758, 2.1, .17, 0], [5, 4.7, 2.38, -28.65, 2.1, .17, 0], ...[-4.9, 4.9].flatMap(x => [-39.3, -35.8, -32.3].map(z => [6, x, .52, z + 1.281, 2.35, .15, 0]))] },
    ];
    return layouts.map(({ room, tiles }) => {
      const positions: number[] = [], uvs: number[] = [];
      tiles.forEach(([row, x, y, z, w, h, yaw]) => {
        const g = resources.geometries[row].clone().toNonIndexed();
        g.scale(w, h, 1); g.rotateY(yaw); g.translate(x, FLOOR + y, z);
        positions.push(...g.getAttribute("position").array); uvs.push(...g.getAttribute("uv").array); g.dispose();
      });
      const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3)); geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2)); geometry.computeBoundingSphere();
      return { room, geometry };
    });
  }, [resources]);
  useEffect(() => () => signs.forEach(s => s.geometry.dispose()), [signs]);
  return <>{signs.map(({ room, geometry }) => <group key={room} userData={room === "exterior" ? {} : { genesisRoom: room, genesisDetails: true }}>
    <mesh geometry={geometry} material={resources.material} />
  </group>)}</>;
}

function BoulderField({ entries = BOULDER_LAYOUT }: { entries?: typeof BOULDER_LAYOUT }) {
  const batches = useMemo(() => {
    const geometry = new THREE.DodecahedronGeometry(1, 0);
    const colors = ["#57413c", "#6a4a40", "#493c3a"];
    const materials = colors.map(color => new THREE.MeshStandardMaterial({ color, flatShading: true, roughness: 1 }));
    const meshes = materials.map((material, color) => {
      const selected = entries.filter(item => item.color === color), mesh = new THREE.InstancedMesh(geometry, material, selected.length);
      const pos = new THREE.Vector3(), scale = new THREE.Vector3(), quaternion = new THREE.Quaternion(), euler = new THREE.Euler();
      selected.forEach((item, i) => { mesh.setMatrixAt(i, new THREE.Matrix4().compose(pos.set(...item.position), quaternion.setFromEuler(euler.set(...item.rotation)), scale.set(...item.scale))); });
      mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage); mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingBox(); mesh.computeBoundingSphere(); mesh.receiveShadow = true;
      return mesh;
    });
    return { geometry, materials, meshes };
  }, [entries]);
  useEffect(() => () => { batches.meshes.forEach(mesh => mesh.dispose()); batches.geometry.dispose(); batches.materials.forEach(material => material.dispose()); }, [batches]);
  return <group dispose={null}>{batches.meshes.map(mesh => <primitive key={mesh.uuid} object={mesh} />)}</group>;
}

function Box({ p, s, color, metalness = 0.48, roughness = 0.58, emissive, intensity = 0, batch = true }: { p: [number, number, number]; s: [number, number, number]; color: string; metalness?: number; roughness?: number; emissive?: string; intensity?: number; batch?: boolean }) {
  return <mesh position={p} scale={s} userData={batch ? { genesisStaticBox: true } : undefined} castShadow={s[0] > 1 && s[1] > 1.8 && s[2] > 1} receiveShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={color} metalness={metalness} roughness={roughness} emissive={emissive} emissiveIntensity={intensity} /></mesh>;
}

/** Collapse the large number of architectural box panels into a small set of GPU instanced batches. */
function BoxBatch({ children }: { children: React.ReactNode }) {
  const root = useRef<THREE.Group>(null);
  useEffect(() => {
    let geometry: THREE.BoxGeometry | null = null;
    const batches: THREE.InstancedMesh[] = [];
    const boxes: THREE.Mesh[] = [];
    const build = () => {
      const parent = root.current; if (!parent) return;
      parent.updateWorldMatrix(true, true);
      parent.traverse(object => { if (object instanceof THREE.Mesh && object.userData.genesisStaticBox && object.geometry instanceof THREE.BoxGeometry) boxes.push(object); });
      const byMaterial = new Map<string, THREE.Mesh[]>();
      for (const mesh of boxes) {
        const material = mesh.material as THREE.MeshStandardMaterial;
        // Keep non-casters out of shadow passes, including small furniture and trim.
        let owner: THREE.Object3D = mesh;
        while (owner.parent && !owner.userData.genesisRoom && owner.parent !== parent) owner = owner.parent;
        const key = `${owner.userData.genesisRoom ?? 'exterior'}:${owner.userData.genesisDetails ?? false}:${material.emissive.getHexString()}:${mesh.castShadow}`;
        mesh.userData.batchOwner = owner;
        const list = byMaterial.get(key) || []; list.push(mesh); byMaterial.set(key, list);
      }
      geometry = new THREE.BoxGeometry(1, 1, 1);
      for (const meshes of byMaterial.values()) {
        const sample = meshes[0].material as THREE.MeshStandardMaterial;
        const emissiveIntensity = Math.max(...meshes.map(mesh => (mesh.material as THREE.MeshStandardMaterial).emissiveIntensity));
        const material = new THREE.MeshStandardMaterial({ color: "#ffffff", emissive: sample.emissive.clone(), emissiveIntensity, metalness: 0.44, roughness: 0.58 });
        const batch = new THREE.InstancedMesh(geometry, material, meshes.length);
        const owner = meshes[0].userData.batchOwner as THREE.Object3D;
        batch.userData.genesisRoom = owner.userData.genesisRoom;
        batch.userData.genesisDetails = owner.userData.genesisDetails;
        batch.name = "genesis-v5-static-box-batch"; batch.castShadow = meshes.some(mesh => mesh.castShadow); batch.receiveShadow = true;
        meshes.forEach((mesh, index) => {
          mesh.updateWorldMatrix(true, false);
          // Store root-local transforms: shared placement groups transform the
          // batch root, so baking world matrices here would apply placement twice.
          batch.setMatrixAt(index, new THREE.Matrix4().copy(parent.matrixWorld).invert().multiply(mesh.matrixWorld));
          batch.setColorAt(index, (mesh.material as THREE.MeshStandardMaterial).color);
          mesh.visible = false;
          mesh.geometry.dispose(); (mesh.material as THREE.Material).dispose();
        });
        batch.instanceMatrix.setUsage(THREE.StaticDrawUsage); batch.instanceMatrix.needsUpdate = true;
        if (batch.instanceColor) batch.instanceColor.needsUpdate = true;
        batch.computeBoundingBox(); batch.computeBoundingSphere(); parent.add(batch); batches.push(batch);
      }
      if (window.__genesis3d) { window.__genesis3d.staticBatches = batches.length; window.__genesis3d.batchedBoxes = boxes.length; }
    };
    const frame = requestAnimationFrame(build);
    return () => {
      cancelAnimationFrame(frame);
      const parent = root.current;
      for (const mesh of batches) { parent?.remove(mesh); mesh.dispose(); (mesh.material as THREE.Material).dispose(); }
      geometry?.dispose();
    };
  }, []);
  return <group ref={root}>{children}</group>;
}

function Door({ id, z, doorRef, width = 3.3 }: { id: DoorId; z: number; doorRef: React.MutableRefObject<DoorState>; width?: number; wall?: string }) {
  const left = useRef<THREE.Group>(null), right = useRef<THREE.Group>(null);
  const base = width / 4;
  useFrame((_, delta) => {
    const travel = width * 0.54 * doorRef.current[id];
    if (left.current) left.current.position.x = -base - travel;
    if (right.current) right.current.position.x = base + travel;
  });
  return <group>
    <Box p={[-width / 2 - 0.13, FLOOR + 1.58, z]} s={[0.26, 3.18, 0.44]} color="#222f37" />
    <Box p={[width / 2 + 0.13, FLOOR + 1.58, z]} s={[0.26, 3.18, 0.44]} color="#222f37" />
    <Box p={[0, FLOOR + 3.22, z]} s={[width + 0.5, 0.36, 0.55]} color="#85929a" />
    <group ref={left} position={[-base, 0, 0]}><PressureDoorLeaf width={width} z={z} /></group>
    <group ref={right} position={[base, 0, 0]}><PressureDoorLeaf width={width} z={z} /></group>
    <GreenAirlockFrame width={width} z={z} />
  </group>;
}

function CommandHub({ doorRef, roofRef, interact }: { doorRef: React.MutableRefObject<DoorState>; roofRef: React.RefObject<THREE.Mesh | null>; interact: () => void }) {
  const wall = "#647177", armor = "#859197", ceramic = "#c0c9cc", glass = "#17313d";
  const consoles = useMemo(() => CREW_CONSOLES.map((station, i) => ({ ...station, color: i === 1 ? "#7748aa" : "#35b5c2" })), []);
  return <group userData={{ genesisRoom: "control" }}>
    <Box p={[0, FLOOR - 0.14, 0]} s={[16.5, 0.28, 18.5]} color="#59666a" metalness={0.26} roughness={0.78} />
    {/* The segmented shell is thick, pressure-rated in appearance, and open only at two doorways. */}
    <Box p={[-7.92, FLOOR + 2.45, 0]} s={[0.42, 4.9, 18]} color={wall} />
    <Box p={[7.92, FLOOR + 2.45, 0]} s={[0.42, 4.9, 18]} color={wall} />
    <Box p={[-5.0, FLOOR + 2.45, -8.92]} s={[6, 4.9, 0.42]} color={wall} />
    <Box p={[5.0, FLOOR + 2.45, -8.92]} s={[6, 4.9, 0.42]} color={wall} />
    <Box p={[-5.35, FLOOR + 2.45, 8.92]} s={[5.2, 4.9, 0.42]} color={wall} />
    <Box p={[5.35, FLOOR + 2.45, 8.92]} s={[5.2, 4.9, 0.42]} color={wall} />
    <mesh ref={roofRef} position={[0, FLOOR + 4.96, 0]}><boxGeometry args={[16.7, 0.32, 18.7]} /><meshStandardMaterial color="#28363d" metalness={0.58} roughness={0.52} transparent opacity={0.96} depthWrite={false} /></mesh>
    {[-7.55, 7.55].map(x => <group key={x}>{[-7, -3.5, 0, 3.5, 7].map(z => <Box key={z} p={[x, FLOOR + 2.4, z]} s={[0.35, 4.9, 0.34]} color={armor} />)}</group>)}
    {[-5.6, -2.8, 0, 2.8, 5.6].map(z => <Box key={z} p={[0, FLOOR + 4.5, z]} s={[15.1, 0.16, 0.16]} color="#73828a" />)}
    {[-1, 1].map(side => <group key={`interior-wall-${side}`}>
      {[-6.2, -3.1, 0, 3.1, 6.2].map(z => <Box key={z} p={[side * 7.69, FLOOR + 2.42, z]} s={[0.035, 3.85, 2.78]} color={side < 0 ? "#748187" : "#69777d"} metalness={0.38} roughness={0.7} />)}
      <Box p={[side * 7.64, FLOOR + 0.24, 0]} s={[0.08, 0.035, 14.5]} color={side < 0 ? "#53d0d5" : "#9c6ac6"} emissive={side < 0 ? "#176f78" : "#4f2870"} intensity={0.42} metalness={0} />
    </group>)}
    {[-4.2, -1.4, 1.4, 4.2].map(z => <group key={`ceiling-light-${z}`}>
      <Box p={[0, FLOOR + 4.62, z]} s={[3.4, 0.08, 0.52]} color="#293941" />
      <Box p={[0, FLOOR + 4.56, z]} s={[2.7, 0.035, 0.23]} color="#d7ebe5" emissive="#63c6bd" intensity={0.65} metalness={0} />
    </group>)}
    {/* Panoramic command glazing and cyan operational trim. */}
    {[-5.6, 5.6].map(x => <group key={x}>
      <Box p={[x, FLOOR + 2.85, -8.65]} s={[4.5, 2.1, 0.08]} color={glass} metalness={0.8} roughness={0.2} emissive="#163e52" intensity={0.22} />
      <Box p={[x, FLOOR + 1.76, -8.53]} s={[4.42, 0.055, 0.045]} color="#48c5d0" emissive="#20a7b6" intensity={0.8} metalness={0.1} />
    </group>)}
    <group userData={{ genesisRoom: "control", genesisDetails: true }}>
    {/* Three side-bay crew stations; the center remains a continuous walkway. */}
    {consoles.map((c, i) => <group key={i}>
      <Box p={[c.x, FLOOR + 0.36, c.z + 1.2]} s={[1.05, 0.5, 0.85]} color={i % 2 ? "#404a50" : "#353f45"} />
    </group>)}
    </group>
    <Box p={[-6.92, FLOOR + 1.42, 0.3]} s={[0.08, 2.65, 4.7]} color="#a7b2b6" metalness={0.22} />
    <Box p={[6.92, FLOOR + 1.42, -1.0]} s={[0.08, 2.65, 4.7]} color="#a7b2b6" metalness={0.22} />
    <Box p={[0, FLOOR + 0.04, 0]} s={[0.11, 0.025, 15.2]} color="#945ec5" emissive="#66309a" intensity={0.8} metalness={0} />
    <Box p={[0, FLOOR + 4.43, 0]} s={[12.4, 0.075, 0.08]} color="#64d5dc" emissive="#20bbc8" intensity={1} metalness={0} />
    <Door id="surface" z={9.02} doorRef={doorRef} />
    <Door id="hub" z={-9.02} doorRef={doorRef} width={3.6} />
    <group onPointerDown={e => { e.stopPropagation(); interact(); }}>
      <Box batch={false} p={[-6.72, FLOOR + 1.85, -2.2]} s={[0.3, 0.72, 1.2]} color="#38d0d1" emissive="#17aeb7" intensity={0.7} metalness={0.15} />
      <mesh position={[-6.72, FLOOR + 1.85, -2.2]}><boxGeometry args={[0.44, 0.86, 1.35]} /><meshBasicMaterial transparent opacity={0} depthWrite={false} /></mesh>
    </group>
    {/* Surface navigation beacons sit outside the portal. */}
    {[-2.2, 2.2].map(x => <group key={x}>
      <mesh position={[x, FLOOR + 2.55, 9.9]}><cylinderGeometry args={[0.09, 0.14, 2.6, 8]} /><meshStandardMaterial color="#718087" metalness={0.75} roughness={0.28} /></mesh>
      <mesh position={[x, FLOOR + 3.9, 9.9]}><sphereGeometry args={[0.13, 12, 8]} /><meshBasicMaterial color="#ffb85c" toneMapped={false} /></mesh>
    </group>)}
    <Box p={[0, FLOOR + 5.28, -0.8]} s={[7.6, 0.08, 0.12]} color="#52dce1" emissive="#2bb8cc" intensity={1} metalness={0} />
    <Box p={[0, FLOOR + 5.48, -0.8]} s={[3.7, 0.16, 0.06]} color="#cbdae0" emissive="#809ba5" intensity={0.18} metalness={0.08} />
    {[-4.8, 4.8].map(x => <pointLight key={x} position={[x, FLOOR + 4.15, -1.5]} color="#a7e5e3" intensity={2.25} distance={11} decay={2} />)}
    <pointLight position={[0, FLOOR + 4.5, 4]} color="#a6dce0" intensity={1.75} distance={10} decay={2} />
    <group userData={{ genesisRoom: "control", genesisDetails: true }}><CommandDisplaySurfaces /></group>
  </group>;
}

function Corridor() {
  const ribZ = [-11, -14.5, -18, -21.5, -25];
  return <group userData={{ genesisRoom: "corridor" }}>
    <Box p={[0, FLOOR - 0.13, -17.5]} s={[4.25, 0.26, 17.2]} color="#5b686b" metalness={0.26} roughness={0.78} />
    <Box p={[-2.06, FLOOR + 1.85, -17.5]} s={[0.22, 3.7, 17.2]} color="#758389" />
    <Box p={[2.06, FLOOR + 1.85, -17.5]} s={[0.22, 3.7, 17.2]} color="#758389" />
    <Box p={[0, FLOOR + 3.73, -17.5]} s={[4.25, 0.18, 17.2]} color="#79868a" />
    {[-1, 1].map(side => <group key={`corridor-conduit-${side}`}>
      {[4.14, 4.36].map((y, index) => <mesh key={y} position={[side * 1.76, y, -17.5]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[index ? 0.055 : 0.09, index ? 0.055 : 0.09, 16.2, 9]} />
        <meshStandardMaterial color={index ? (side < 0 ? "#9573ab" : "#66aeb2") : "#68777d"} metalness={0.72} roughness={0.36} emissive={index ? (side < 0 ? "#4e2c69" : "#18555a") : "#000000"} emissiveIntensity={0.32} />
      </mesh>)}
      {[-12.8, -17.5, -22.2].map(z => <Box key={z} p={[side * 1.7, FLOOR + 1.88, z]} s={[0.08, 2.9, 0.1]} color="#bdc2bf" metalness={0.68} roughness={0.34} />)}
    </group>)}
    {[-1, 1].map(side => <group key={`service-panel-${side}`}>
      <Box p={[side * 1.941, FLOOR + .34, -17.5]} s={[.012, .025, 15.8]} color="#72b8be" />
      {[-12.8, -16.3, -19.8, -23.3].map(z => <group key={z}>
        <Box p={[side * 1.941, FLOOR + 1.72, z]} s={[.012, 2.4, .025]} color="#384951" />
        {[0, 1, 2, 3].map(i => <Box key={i} p={[side * 1.938, FLOOR + .66 + i * .09, z + .6]} s={[.015, .025, .65]} color="#384951" />)}
      </group>)}
    </group>)}
    {ribZ.map(z => <group key={z}>
      <Box p={[-1.86, FLOOR + 1.86, z]} s={[0.22, 3.72, 0.38]} color="#9aa6ab" />
      <Box p={[1.86, FLOOR + 1.86, z]} s={[0.22, 3.72, 0.38]} color="#9aa6ab" />
      <Box p={[0, FLOOR + 3.54, z]} s={[3.9, 0.16, 0.38]} color="#9aa6ab" />
      <Box p={[-1.72, FLOOR + 0.035, z]} s={[0.035, 0.028, 1.4]} color="#37c7ce" emissive="#158d9c" intensity={0.55} metalness={0} />
      <Box p={[1.72, FLOOR + 0.035, z]} s={[0.035, 0.028, 1.4]} color="#a967da" emissive="#6e36a3" intensity={0.45} metalness={0} />
      <Box p={[0, FLOOR + 0.016, z]} s={[2.65, 0.018, 0.045]} color="#b4babb" metalness={0.35} roughness={0.74} />
    </group>)}
    {[-13, -18, -23].map(z => <group key={z}>
      <Box p={[0, FLOOR + 3.38, z]} s={[2.1, 0.08, 0.64]} color="#23323a" />
      <Box p={[0, FLOOR + 3.32, z]} s={[1.65, 0.035, 0.38]} color="#d6e2e3" emissive="#4bcbd0" intensity={0.68} metalness={0.1} />
      <pointLight position={[0, FLOOR + 3.05, z]} color="#74cdd0" intensity={1.2} distance={5} decay={2} />
    </group>)}
  </group>;
}

function HabitatCropPlants() {
  const plants = useMemo(() => {
    const geometry = new THREE.OctahedronGeometry(.2, 0);
    const material = new THREE.MeshStandardMaterial({ color: "#7ac27e", roughness: .7 });
    const mesh = new THREE.InstancedMesh(geometry, material, 9);
    const transform = new THREE.Object3D();
    let index = 0;
    for (const row of [0, 1, 2]) for (const x of [-.8, 0, .8]) {
      transform.position.set(x, row * .72 + .28, 0);
      transform.rotation.set(0, .1 * x, .18);
      transform.updateMatrix(); mesh.setMatrixAt(index++, transform.matrix);
    }
    mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
    mesh.computeBoundingBox(); mesh.computeBoundingSphere();
    return mesh;
  }, []);
  useEffect(() => () => { plants.dispose(); plants.geometry.dispose(); (plants.material as THREE.Material).dispose(); }, [plants]);
  return <primitive object={plants} dispose={null} />;
}

function Habitat({ roofRef, doorRef }: { roofRef: React.RefObject<THREE.Mesh | null>; doorRef: React.MutableRefObject<DoorState> }) {
  return <group userData={{ genesisRoom: "habitat" }}>
    <Box p={[0, FLOOR - 0.14, -34.5]} s={[14.5, 0.28, 17.3]} color="#616d70" metalness={0.24} roughness={0.8} />
    <Box p={[-7.03, FLOOR + 2.35, -34.5]} s={[0.32, 4.7, 16.9]} color="#859195" />
    <Box p={[7.03, FLOOR + 2.35, -34.5]} s={[0.32, 4.7, 16.9]} color="#859195" />
    <Box p={[0, FLOOR + 2.35, -42.82]} s={[14.2, 4.7, 0.32]} color="#859195" />
    <Box p={[-4.55, FLOOR + 2.35, -26.05]} s={[5.1, 4.7, 0.32]} color="#859195" />
    <Box p={[4.55, FLOOR + 2.35, -26.05]} s={[5.1, 4.7, 0.32]} color="#859195" />
    {[-5.9, -3.0, 3.0, 5.9].map(x => <Box key={`hab-rib-${x}`} p={[x, FLOOR + 2.35, -42.61]} s={[0.12, 4.35, 0.08]} color="#aeb9b9" metalness={0.68} roughness={0.38} />)}
    {[-6.8, 6.8].map(x => <Box key={x} p={[x, FLOOR + 2.38, -34.5]} s={[0.22, 4.35, 0.38]} color="#a6b0b1" metalness={0.46} />)}
    {[-1, 1].map(side => <group key={`hab-wall-detail-${side}`}>
      {[-40.5, -37.0, -33.5, -30.0].map(z => <Box key={z} p={[side * 6.82, FLOOR + 2.3, z]} s={[0.045, 3.75, 3.05]} color={side < 0 ? "#77858a" : "#6e7a80"} metalness={0.42} roughness={0.72} />)}
      <Box p={[side * 6.77, FLOOR + 0.28, -34.5]} s={[0.05, 0.035, 14.8]} color={side < 0 ? "#55cbd1" : "#a26cd0"} emissive={side < 0 ? "#145c66" : "#502d6d"} intensity={0.34} metalness={0} />
    </group>)}
    <mesh ref={roofRef} position={[0, FLOOR + 4.86, -34.5]}><boxGeometry args={[14.7, 0.26, 17.5]} /><meshStandardMaterial color="#29373e" metalness={0.55} roughness={0.48} transparent opacity={0.96} depthWrite={false} /></mesh>
    <group userData={{ genesisRoom: "habitat", genesisDetails: true }}>
    {/* Sleep alcoves, lockers, common table, and a small crop rack. */}
    <group position={[4.7, FLOOR, -29.2]}>
      <HabitatCropPlants />
      {[0, 1, 2].map(row => <group key={row} position={[0, row * 0.72, 0]}>
        <Box p={[0, 0.1, 0]} s={[2.35, 0.11, 0.68]} color="#34454a" />

        <Box p={[0, .166, .25]} s={[2.2, .02, .04]} color="#72b8be" />
        <Box p={[0, 0.34, -0.29]} s={[2.35, 0.1, 0.08]} color="#78898b" />
      </group>)}
    </group>
    <Box p={[-6.35, FLOOR + 0.08, -34.5]} s={[0.085, 0.035, 8.5]} color="#945ec5" emissive="#66309a" intensity={0.7} metalness={0} />
    {[-5, 5].map(x => <group key={x}>
      <Box p={[x, FLOOR + 3.2, -42.62]} s={[3.5, 1.65, 0.07]} color="#163540" emissive="#0c4650" intensity={0.35} metalness={0.76} roughness={0.2} />
      {[0, 1, 2, 3].map(row => <Box key={row} p={[x - 0.95 + row * 0.16, FLOOR + 3.65 - row * 0.22, -42.56]} s={[0.72 + (row % 2) * 0.34, 0.045, 0.018]} color="#57bbc1" emissive="#277a84" intensity={0.42} metalness={0} />)}
      <Box p={[x, FLOOR + 2.31, -42.56]} s={[3.45, 0.055, 0.04]} color="#41c5cb" emissive="#168b9a" intensity={0.7} metalness={0} />
    </group>)}
    <HabitatDisplaySurfaces />
    </group>
    <Door id="habitat" z={-26.05} doorRef={doorRef} width={3.4} wall="#9daeb1" />
    {[-4, 0, 4].map(x => <group key={x}>
      <Box p={[x, FLOOR + 4.42, -34.2]} s={[2.2, 0.08, 0.7]} color="#293941" />
      <Box p={[x, FLOOR + 4.35, -34.2]} s={[1.8, 0.04, 0.42]} color="#c1dad8" emissive="#6ac8c1" intensity={0.78} metalness={0.05} />
      <pointLight position={[x, FLOOR + 4.12, -34.2]} color="#a9d8d7" intensity={1.85} distance={10} decay={2} />
    </group>)}
    {[-38.5, -30.5].map(z => <group key={`hab-ceiling-${z}`}>
      <Box p={[0, FLOOR + 4.43, z]} s={[2.5, 0.075, 0.55]} color="#303e44" />
      <Box p={[0, FLOOR + 4.37, z]} s={[1.9, 0.035, 0.22]} color="#d2e3dc" emissive="#5bb4b2" intensity={0.58} metalness={0} />
    </group>)}

  </group>;
}

export type GenesisSharedBaseSceneProps = {
  /** Base placement in the host's world coordinate frame. */
  position?: [number, number, number];
  rotationY?: number;
  /** The host can consume door state changes to update its own collider list. */
  doorStateRef?: React.MutableRefObject<GenesisDoorState>;
  /** Read-only host player reference; no controller is created here. */
  targetRef?: React.RefObject<THREE.Group | null>;
  onDoorMotion?: (id: string, open: boolean, position: [number, number, number]) => void;
  onDoorStateChange?: (id: GenesisDoorId, open: boolean) => void;
  /** Production-terrain sample expressed in this base's local Y frame. */
  surfaceAtLocal?: (x: number, z: number) => number | null;
  interact?: () => void;
  rampEndLocalY?: number;
};

/**
 * Reusable building-only R3F scene. This component owns architectural meshes,
 * local door animation, and local material effects only. It owns no Canvas,
 * camera, player, terrain, sky, audio system, or global input listeners.
 */
export function GenesisSharedBaseScene({
  position = [0, 0, 0],
  rotationY = 0,
  doorStateRef,
  targetRef,
  onDoorStateChange,
  onDoorMotion,
  surfaceAtLocal,
  rampEndLocalY,
  interact = () => {},
}: GenesisSharedBaseSceneProps) {
  const localDoors = useRef<DoorState>({ surface: 0, hub: 0, habitat: 0 });
  const doors = doorStateRef ?? localDoors;
  const root = useRef<THREE.Group>(null);
  const roofHub = useRef<THREE.Mesh>(null);
  const roofHabitat = useRef<THREE.Mesh>(null);
  const reported = useRef<Record<DoorId, boolean>>({ surface: false, hub: false, habitat: false });
  const motionTargets = useRef<DoorState>({ surface: 0, hub: 0, habitat: 0 });
  const soundPosition = useMemo(() => new THREE.Vector3(), []);
  const playerLocal = useMemo(() => new THREE.Vector3(), []);

  const cameraLocal = useMemo(() => new THREE.Vector3(), []);
  const registry = useRef<{ object: THREE.Object3D; room: Room; detail: boolean }[]>([]);
  useEffect(() => {
    // Children build their batches first. Cache references once; no frame traversal.
    const frame = requestAnimationFrame(() => {
      root.current?.traverse(object => {
        if (!(object instanceof THREE.Light) && !object.userData.genesisDetails && !(object instanceof THREE.InstancedMesh)) return;
        let owner: THREE.Object3D | null = object;
        while (owner && !owner.userData.genesisRoom) owner = owner.parent;
        if (owner) registry.current.push({ object, room: owner.userData.genesisRoom, detail: !!object.userData.genesisDetails });
      });
    });
    return () => { cancelAnimationFrame(frame); registry.current = []; Object.assign(interiorMetrics, {room: 'exterior', visibleRoomBatches: 0, activeLights: 0, shadowBatches: 0}); };
  }, []);
  useFrame(({ camera }, delta) => {
    let inHub = false;
    let inHabitat = false;
    if (targetRef?.current && root.current) {
      root.current.updateWorldMatrix(true, false);
      targetRef.current.getWorldPosition(playerLocal);
      root.current.worldToLocal(playerLocal);
      const target: DoorState = {
        surface: Math.abs(playerLocal.x) < 1.9 && Math.abs(playerLocal.z - 11.1) < 4.5 ? 1 : 0,
        hub: Math.abs(playerLocal.x) < 1.9 && Math.abs(playerLocal.z + 9.02) < 2.4 ? 1 : 0,
        habitat: Math.abs(playerLocal.x) < 2 && Math.abs(playerLocal.z + 26.05) < 2.4 ? 1 : 0,
      };
      for (const id of ["surface", "hub", "habitat"] as const) {
        if (delta > 0 && motionTargets.current[id] !== target[id]) {
          motionTargets.current[id] = target[id];
          const portals = id === "surface" ? [["genesis-surface-airlock", 13.2], ["genesis-command-front", 9.02]] as const
            : id === "hub" ? [["genesis-internal-connector", -9.02]] as const : [["genesis-habitat", -26.05]] as const;
          for (const [doorId, z] of portals) {
            soundPosition.set(0, 2.4, z); root.current.localToWorld(soundPosition);
            onDoorMotion?.(doorId, target[id] === 1, [soundPosition.x, soundPosition.y, soundPosition.z]);
          }
        }
        doors.current[id] = THREE.MathUtils.damp(doors.current[id], target[id], 3.4, Math.min(delta, 0.05));
      }
      inHub = Math.abs(playerLocal.x) < 8.15 && playerLocal.z > -9.1 && playerLocal.z < 9.1;
      inHabitat = Math.abs(playerLocal.x) < 7.2 && playerLocal.z >= -43 && playerLocal.z <= -26;
    }
    if (root.current) {
      camera.getWorldPosition(cameraLocal); root.current.worldToLocal(cameraLocal);
      const viewer = roomAt(cameraLocal.x, cameraLocal.z);
      const playerRoom = targetRef?.current ? roomAt(playerLocal.x, playerLocal.z) : viewer;
      interiorMetrics.room = playerRoom;
      interiorMetrics.visibleRoomBatches = 0; interiorMetrics.activeLights = 0; interiorMetrics.shadowBatches = 0;
      for (const { object, room, detail } of registry.current) {
        const visible = roomVisible(room, viewer, doors.current) || roomVisible(room, playerRoom, doors.current);
        if (object instanceof THREE.Light) {
          object.visible = interiorOptions.lights && visible;
          if (object.visible) interiorMetrics.activeLights++;
        } else {
          object.visible = !detail || interiorOptions.remoteDetails || visible;
          if (object instanceof THREE.InstancedMesh && object.visible) {
            interiorMetrics.visibleRoomBatches++;
            if (object.castShadow) interiorMetrics.shadowBatches++;
          }
        }
      }
    }
    const hubMaterial = roofHub.current?.material as THREE.MeshStandardMaterial | undefined;
    const habitatMaterial = roofHabitat.current?.material as THREE.MeshStandardMaterial | undefined;
    if (hubMaterial) hubMaterial.opacity = THREE.MathUtils.damp(hubMaterial.opacity, interiorOptions.roofTransparency && inHub ? 0.08 : 1, 2.8, Math.min(delta, 0.05));
    if (habitatMaterial) habitatMaterial.opacity = THREE.MathUtils.damp(habitatMaterial.opacity, interiorOptions.roofTransparency && inHabitat ? 0.08 : 1, 2.8, Math.min(delta, 0.05));
    for (const material of [hubMaterial, habitatMaterial]) {
      if (!material) continue;
      const transparent = material.opacity < .999;
      if (material.transparent !== transparent) { material.transparent = transparent; material.depthWrite = !transparent; material.needsUpdate = true; }
    }
    for (const id of ["surface", "hub", "habitat"] as const) {
      const open = doors.current[id] >= 0.5;
      if (reported.current[id] !== open) {
        reported.current[id] = open;
        onDoorStateChange?.(id, open);
      }
    }
  });

  return <group ref={root} position={position} rotation={[0, rotationY, 0]}>
    <BoxBatch>
      <CommandHub doorRef={doors} roofRef={roofHub} interact={interact} />
      {surfaceAtLocal && <group userData={{ genesisRoom: "control" }}>
        {/* Staging vestibule: coupled proximity doors, no pressure-cycle simulation. */}
        <Box p={[0, FLOOR - .14, 11.1]} s={[4.4,.28,4.5]} color="#59666a" />
        {[-2.06,2.06].map(x => <Box key={x} p={[x,FLOOR+1.65,11.1]} s={[.22,3.3,4.4]} color="#647177" />)}
        <Box p={[0,FLOOR+3.4,11.1]} s={[4.4,.2,4.5]} color="#28363d" />
        <Door id="surface" z={13.2} doorRef={doors} />
        <pointLight position={[0,FLOOR+2.8,11.1]} color="#82d5db" intensity={1.5} distance={5} />
      </group>}
      <CinematicExterior />
      <GenesisMasterIdentity />
      {surfaceAtLocal && <GenesisMasterFoundations surfaceAtLocal={surfaceAtLocal} />}
      <CinematicRooms />
      <InteriorIdentification />
      <Corridor />
      <Habitat roofRef={roofHabitat} doorRef={doors} />
      <ExteriorApron groundY={rampEndLocalY ?? surfaceAtLocal?.(0, 26) ?? floorY(0, 26)} startZ={surfaceAtLocal ? 13.2 : 13} />
      <CrystalReactor groundY={surfaceAtLocal?.(-13, -1) ?? floorY(-13, -1)} />
      {surfaceAtLocal && <FoundationSupports surfaceAtLocal={surfaceAtLocal} />}
    </BoxBatch>
  </group>;
}

function CrystalReactor({ groundY }: { groundY: number }) {
  const core = useRef<THREE.Group>(null), orbit = useRef<THREE.Group>(null), glow = useRef<THREE.PointLight>(null);
  const crystalGeometry = useMemo(() => {
    const vertices: number[] = [], colors: number[] = [], sides = 7;
    const palette = [[0.38, 0.19, 0.58], [0.79, 0.55, 0.94], [0.40, 0.65, 0.78], [0.61, 0.35, 0.81]];
    const ring = (level: number, side: number) => {
      const angle = side / sides * Math.PI * 2 + level * 0.11;
      const radius = level === 0 ? 0.46 + 0.06 * Math.sin(side * 3.1) : level === 1 ? 0.35 + 0.035 * Math.cos(side * 2.4) : 0;
      return [Math.cos(angle) * radius, level === 0 ? -0.5 : level === 1 ? 0.07 + 0.05 * Math.sin(side * 1.9) : 0.57, Math.sin(angle) * radius];
    };
    const triangle = (a: number[], b: number[], c: number[], tint: number[]) => { for (const p of [a, b, c]) { vertices.push(...p); colors.push(...tint); } };
    for (let side = 0; side < sides; side++) {
      const next = (side + 1) % sides, tint = palette[side % palette.length];
      const a = ring(0, side), b = ring(0, next), c = ring(1, next), d = ring(1, side), tip = ring(2, side);
      triangle(a, b, d, tint); triangle(b, c, d, tint.map(v => Math.min(1, v * 1.1)));
      triangle(d, c, tip, palette[(side + 1) % palette.length]);
    }
    const geometry = new THREE.BufferGeometry(); geometry.setAttribute("position", new THREE.Float32BufferAttribute(vertices, 3)); geometry.setAttribute("color", new THREE.Float32BufferAttribute(colors, 3)); geometry.computeVertexNormals(); return geometry;
  }, []);
  const crystalMaterial = useMemo(() => new THREE.MeshStandardMaterial({ color: "#d7c7ed", vertexColors: true, emissive: "#67299e", emissiveIntensity: 0.9, roughness: 0.24, metalness: 0.12, flatShading: true }), []);
  useEffect(() => () => { crystalGeometry.dispose(); crystalMaterial.dispose(); }, [crystalGeometry, crystalMaterial]);
  useFrame(({ clock }) => {
    if (core.current) { core.current.rotation.y = clock.elapsedTime * 0.075; core.current.rotation.z = Math.sin(clock.elapsedTime * 0.45) * 0.018; }
    if (orbit.current) orbit.current.rotation.y = -clock.elapsedTime * 0.12;
    crystalMaterial.emissiveIntensity = 0.84 + Math.sin(clock.elapsedTime * 1.4) * 0.12;
    if (glow.current) glow.current.intensity = 3.2 + Math.sin(clock.elapsedTime * 1.1) * 0.22;
  });
  return <group position={[-13, groundY, -1]}>
    <mesh position={[0, 1.05, 0]} castShadow><cylinderGeometry args={[2.3, 2.65, 1.9, 12]} /><meshStandardMaterial color="#313b43" metalness={0.74} roughness={0.35} /></mesh>
    <mesh position={[0, 2.08, 0]}><cylinderGeometry args={[2, 2, 0.13, 12]} /><meshStandardMaterial color="#7b5b8c" metalness={0.7} roughness={0.28} emissive="#602da1" emissiveIntensity={0.45} /></mesh>
    <mesh position={[0, 2.18, 0]} rotation={[Math.PI / 2, 0, 0]}><torusGeometry args={[2.12, 0.035, 8, 64]} /><meshStandardMaterial color="#bd8de2" metalness={0.4} roughness={0.35} emissive="#7935bc" emissiveIntensity={0.42} /></mesh>
    {[0, 1, 2, 3].map(i => <mesh key={i} position={[Math.cos(i * Math.PI / 2) * 2.75, 0.3, Math.sin(i * Math.PI / 2) * 2.75]}><cylinderGeometry args={[0.08, 0.16, 3.8, 8]} /><meshStandardMaterial color="#505d63" metalness={0.68} roughness={0.3} /></mesh>)}
    {[0, 1, 2, 3].map(i => <mesh key={`conduit-${i}`} position={[Math.cos(i * Math.PI / 2) * 2.28, 1.95, Math.sin(i * Math.PI / 2) * 2.28]} rotation={[Math.PI / 2, 0, i * Math.PI / 2]}><cylinderGeometry args={[0.055, 0.055, 1.15, 8]} /><meshStandardMaterial color="#a27eb6" metalness={0.54} roughness={0.38} emissive="#52217c" emissiveIntensity={0.55} /></mesh>)}
    <group ref={core} position={[0, 3.15, 0]}>
      {[-1, 0, 1].map((side, i) => <mesh key={side} geometry={crystalGeometry} material={crystalMaterial} position={[side * 0.65, i === 1 ? 0.12 : -0.12, 0]} rotation={[0.04 * i, 0.16 * i, side * -0.12]} scale={[i === 1 ? 1.08 : 0.8, i === 1 ? 2.65 : 2.0, i === 1 ? 1.04 : 0.8]} castShadow />)}
      <mesh position={[0, 0.08, 0]}><sphereGeometry args={[0.34, 16, 12]} /><meshBasicMaterial color="#e6cfff" toneMapped={false} /></mesh>
    </group>
    <mesh position={[0, 3.15, 0]}><sphereGeometry args={[2.25, 18, 14]} /><meshBasicMaterial color="#954ce0" transparent opacity={0.055} depthWrite={false} /></mesh>
    <group ref={orbit} position={[0, 3.15, 0]}>
      <mesh rotation={[Math.PI / 2, 0.36, 0]}><torusGeometry args={[2.02, 0.018, 6, 80]} /><meshBasicMaterial color="#bd83e8" transparent opacity={0.58} /></mesh>
      <mesh rotation={[Math.PI / 2, -0.48, 0]} scale={[1, 0.7, 1]}><torusGeometry args={[2.18, 0.012, 6, 80]} /><meshBasicMaterial color="#71d8e2" transparent opacity={0.36} /></mesh>
    </group>
    <pointLight ref={glow} position={[0, 3.15, 0]} color="#a25be2" intensity={3.2} distance={9} decay={2} />
  </group>;
}

function ExteriorApron({ groundY, startZ = 13 }: { groundY: number; startZ?: number }) {
  const horizontalLength = 26 - startZ;
  const centerZ = (startZ + 26) / 2;
  const endY = groundY, length = Math.hypot(horizontalLength, FLOOR - endY), angle = Math.atan2(FLOOR - endY, horizontalLength);
  return <group>
    <mesh position={[0, (FLOOR + endY) / 2 - 0.045, centerZ]} rotation={[angle, 0, 0]} receiveShadow>
      <boxGeometry args={[4.2, 0.18, length]} /><meshStandardMaterial color="#515c60" metalness={0.42} roughness={0.68} />
    </mesh>
    {[-1.95, 1.95].map(side => <group key={side}>
      <mesh position={[side, (FLOOR + endY) / 2 + 0.43, centerZ]} rotation={[angle, 0, 0]} castShadow>
        <boxGeometry args={[0.12, 0.86, length]} /><meshStandardMaterial color="#737e80" metalness={0.66} roughness={0.4} />
      </mesh>
      <mesh position={[side * 0.82, (FLOOR + endY) / 2 - 0.01, centerZ]} rotation={[angle, 0, 0]}>
        <boxGeometry args={[0.06, 0.035, length - 0.5]} /><meshBasicMaterial color={side < 0 ? "#9c61d3" : "#52d6d4"} toneMapped={false} />
      </mesh>
      {Array.from({ length: 4 }, (_, i) => {
        const z = startZ + 1 + i * ((horizontalLength - 2) / 3), y = FLOOR + (endY - FLOOR) * ((z - startZ) / horizontalLength);
        return <mesh key={i} position={[side, y + 0.49, z]}><cylinderGeometry args={[0.055, 0.08, 0.98, 8]} /><meshStandardMaterial color="#879194" metalness={0.7} roughness={0.36} /></mesh>;
      })}
    </group>)}
    {[-1, 1].map(side => <group key={side} position={[side * 2.65, groundY, 26]}>
      <mesh position={[0, 1.45, 0]}><cylinderGeometry args={[0.075, 0.12, 2.9, 8]} /><meshStandardMaterial color="#707d80" metalness={0.76} roughness={0.32} /></mesh>
      <mesh position={[0, 2.98, 0]}><sphereGeometry args={[0.14, 12, 8]} /><meshBasicMaterial color="#ffb85d" toneMapped={false} /></mesh>
      <pointLight position={[0, 2.8, 0]} color="#ff9f53" intensity={0.6} distance={4} />
    </group>)}
  </group>;
}

function FoundationSupports({ surfaceAtLocal }: { surfaceAtLocal: (x: number, z: number) => number | null }) {
  const supports = useMemo(() => [[-7.4,-40],[7.4,-40],[-7.4,-27],[7.4,-27],[-8.25,5],[8.25,5],[-2.15,-13],[2.15,-13]].map(([x,z]) => {
    const ground = surfaceAtLocal(x, z);
    if (ground === null || !Number.isFinite(ground) || FLOOR - ground < 0.08) return null;
    return { x, z, ground, height: FLOOR - ground };
  }).filter((item): item is { x: number; z: number; ground: number; height: number } => item !== null), [surfaceAtLocal]);
  return <group>
    {supports.map(({ x, z, ground, height }) => <mesh key={`${x}:${z}`} position={[x, (FLOOR + ground) / 2, z]} castShadow receiveShadow>
      <cylinderGeometry args={[0.19, 0.27, height, 8]} />
      <meshStandardMaterial color="#465258" metalness={0.72} roughness={0.4} />
    </mesh>)}
  </group>;
}

function PlayerVisual({ moving }: { moving: React.MutableRefObject<boolean> }) {
  const group = useRef<THREE.Group>(null);
  const left = useRef<THREE.Group>(null), right = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    const swing = moving.current ? Math.sin(clock.elapsedTime * 8.2) * 0.38 : 0;
    if (left.current) left.current.rotation.x = swing;
    if (right.current) right.current.rotation.x = -swing;
    if (group.current) group.current.position.y = moving.current ? Math.abs(Math.sin(clock.elapsedTime * 8.2)) * 0.025 : 0;
  });
  return <group ref={group}>
    {/* Original low-poly pressure suit silhouette: boots, articulated limbs, chest plate, visor and B crest. */}
    <mesh position={[-0.17, 0.16, 0]}><boxGeometry args={[0.28, 0.32, 0.45]} /><meshStandardMaterial color="#263239" metalness={0.56} roughness={0.38} /></mesh>
    <mesh position={[0.17, 0.16, 0]}><boxGeometry args={[0.28, 0.32, 0.45]} /><meshStandardMaterial color="#263239" metalness={0.56} roughness={0.38} /></mesh>
    <mesh position={[0, 0.92, 0]} castShadow><capsuleGeometry args={[0.38, 0.74, 5, 10]} /><meshStandardMaterial color="#c8d0d0" metalness={0.24} roughness={0.56} /></mesh>
    <mesh position={[0, 1.15, 0.31]}><boxGeometry args={[0.48, 0.6, 0.08]} /><meshStandardMaterial color="#41545b" metalness={0.66} roughness={0.36} /></mesh>
    <mesh position={[0.17, 1.15, 0.36]}><boxGeometry args={[0.12, 0.1, 0.025]} /><meshStandardMaterial color="#9b61d2" emissive="#712ab2" emissiveIntensity={0.95} metalness={0.12} /></mesh>
    <mesh position={[0, 0.98, 0.373]}><boxGeometry args={[0.05, 0.23, 0.025]} /><meshBasicMaterial color="#b879e8" toneMapped={false} /></mesh>
    <mesh position={[0, 1.76, 0]} castShadow><sphereGeometry args={[0.34, 20, 14]} /><meshStandardMaterial color="#d0d7d8" metalness={0.32} roughness={0.4} /></mesh>
    <mesh position={[0, 1.77, 0.275]}><sphereGeometry args={[0.255, 20, 14]} /><meshPhysicalMaterial color="#173445" metalness={0.48} roughness={0.15} clearcoat={0.9} clearcoatRoughness={0.1} /></mesh>
    <mesh position={[0, 1.86, 0.47]}><boxGeometry args={[0.13, 0.035, 0.018]} /><meshBasicMaterial color="#9ce5e0" toneMapped={false} /></mesh>
    <mesh position={[0, 0.79, -0.12]}><boxGeometry args={[0.72, 0.62, 0.35]} /><meshStandardMaterial color="#637179" metalness={0.48} roughness={0.46} /></mesh>
    <group ref={left} position={[-0.48, 1.25, 0]}><mesh rotation={[0, 0, -0.1]}><capsuleGeometry args={[0.15, 0.55, 4, 8]} /><meshStandardMaterial color="#bbc5c6" metalness={0.25} roughness={0.53} /></mesh></group>
    <group ref={right} position={[0.48, 1.25, 0]}><mesh rotation={[0, 0, 0.1]}><capsuleGeometry args={[0.15, 0.55, 4, 8]} /><meshStandardMaterial color="#bbc5c6" metalness={0.25} roughness={0.53} /></mesh></group>
    <mesh position={[-0.54, 0.92, 0.03]}><sphereGeometry args={[0.17, 10, 8]} /><meshStandardMaterial color="#33434a" metalness={0.55} roughness={0.42} /></mesh>
    <mesh position={[0.54, 0.92, 0.03]}><sphereGeometry args={[0.17, 10, 8]} /><meshStandardMaterial color="#33434a" metalness={0.55} roughness={0.42} /></mesh>
    <mesh position={[-0.2, 0.53, 0]}><capsuleGeometry args={[0.16, 0.47, 4, 8]} /><meshStandardMaterial color="#d0d7d8" metalness={0.24} roughness={0.56} /></mesh>
    <mesh position={[0.2, 0.53, 0]}><capsuleGeometry args={[0.16, 0.47, 4, 8]} /><meshStandardMaterial color="#d0d7d8" metalness={0.24} roughness={0.56} /></mesh>
    <mesh position={[0, 0.49, 0.18]}><boxGeometry args={[0.46, 0.08, 0.055]} /><meshStandardMaterial color="#596b72" metalness={0.5} roughness={0.42} /></mesh>
  </group>;
}

function Controls({ playerRef, doorRef, setHud, moving }: { playerRef: React.RefObject<THREE.Group | null>; doorRef: React.MutableRefObject<DoorState>; setHud: (s: string) => void; moving: React.MutableRefObject<boolean> }) {
  const { camera, gl, scene } = useThree();
  const yaw = useRef(0); const pitch = useRef(0.31); const distance = useRef(6.6);
  const keys = useRef(new Set<string>()); const joystick = useRef({ x: 0, y: 0 });
  const previousZone = useRef("");
  const indoorMode = useRef(false);
  const indoorSolids = useRef(cameraSolids({surface:0,hub:0,habitat:0}));
  const doorKey = useRef("");
  const lookHeight = useRef(1.14);
  const cameraLook = useRef(new THREE.Vector3());
  const cameraDesired = useRef(new THREE.Vector3());
  const characterBounds = {height:2.4,radius:.85};
  useEffect(() => {
    const down = (e: KeyboardEvent) => { if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "ShiftLeft", "ShiftRight"].includes(e.code)) { keys.current.add(e.code); e.preventDefault(); } if (e.code === "KeyE" && !e.repeat) window.__genesis3d?.interact?.(); };
    const up = (e: KeyboardEvent) => keys.current.delete(e.code);
    const blur = () => keys.current.clear();
    window.addEventListener("keydown", down); window.addEventListener("keyup", up); window.addEventListener("blur", blur);
    return () => { window.removeEventListener("keydown", down); window.removeEventListener("keyup", up); window.removeEventListener("blur", blur); };
  }, []);
  useEffect(() => {
    const el = gl.domElement; let drag = false, px = 0, py = 0;
    const down = (e: PointerEvent) => { if (e.button !== 0 || (e.target as Element).closest?.("button, [data-ui]")) return; drag = true; px = e.clientX; py = e.clientY; el.setPointerCapture?.(e.pointerId); };
    const move = (e: PointerEvent) => { if (!drag) return; yaw.current -= (e.clientX - px) * 0.006; pitch.current = THREE.MathUtils.clamp(pitch.current + (e.clientY - py) * 0.003, -0.08, indoorMode.current ? Math.PI / 2 - .02 : .75); px = e.clientX; py = e.clientY; };
    const up = () => { drag = false; };
    const wheel = (e: WheelEvent) => { distance.current = THREE.MathUtils.clamp(distance.current + e.deltaY * 0.005, 3.1, 10); };
    el.addEventListener("pointerdown", down); el.addEventListener("pointermove", move); el.addEventListener("pointerup", up); el.addEventListener("pointercancel", up); el.addEventListener("wheel", wheel, { passive: true });
    return () => { el.removeEventListener("pointerdown", down); el.removeEventListener("pointermove", move); el.removeEventListener("pointerup", up); el.removeEventListener("pointercancel", up); el.removeEventListener("wheel", wheel); };
  }, [gl]);
  useFrame((_, delta) => {
    const player = playerRef.current; if (!player) return;
    if (window.__genesis3d) window.__genesis3d.frameDelta = delta;
    const p = player.position, frameDt = Math.min(Math.max(delta, 0), 0.12), set = keys.current;
    // This prototype is kinematic (no jump/gravity action). The root is the
    // boot/foot plane and is snapped to the same rendered terrain triangles.
    const grounded = groundAt(p.x, p.z);
    if (grounded) p.y = grounded.height;
    const f = (set.has("KeyW") || set.has("ArrowUp") ? 1 : 0) - (set.has("KeyS") || set.has("ArrowDown") ? 1 : 0) - joystick.current.y;
    const r = (set.has("KeyD") || set.has("ArrowRight") ? 1 : 0) - (set.has("KeyA") || set.has("ArrowLeft") ? 1 : 0) + joystick.current.x;
    const len = Math.hypot(f, r), speed = (set.has("ShiftLeft") || set.has("ShiftRight") ? 6.5 : 4.25) * (window.__genesis3d?.testSpeedScale ?? 1);
    if (window.__genesis3d) window.__genesis3d.motionIntent = { keys: [...set], forward: f, right: r, speed, vx: 0, vz: 0 };
    moving.current = len > 0.08;
    const forwardX = -Math.sin(yaw.current), forwardZ = -Math.cos(yaw.current), rightX = Math.cos(yaw.current), rightZ = -Math.sin(yaw.current);
    const vx = (forwardX * f + rightX * r) / Math.max(1, len), vz = (forwardZ * f + rightZ * r) / Math.max(1, len);
    if (window.__genesis3d?.motionIntent) { window.__genesis3d.motionIntent.vx = vx; window.__genesis3d.motionIntent.vz = vz; }
    const travelDistance = Math.hypot(vx * speed * frameDt, vz * speed * frameDt);
    const steps = Math.max(1, Math.ceil(travelDistance / 0.1)), dt = frameDt / steps;
    for (let step = 0; step < steps; step++) {
      const near = (z: number) => Math.abs(p.z - z) < 2.4;
      const target: DoorState = { surface: near(9.02) ? 1 : 0, hub: near(-9.02) ? 1 : 0, habitat: near(-26.05) ? 1 : 0 };
      for (const id of ["surface", "hub", "habitat"] as const) doorRef.current[id] = THREE.MathUtils.damp(doorRef.current[id], target[id], 3.4, dt);
      if (window.__genesis3d) {
        const peaks = window.__genesis3d.doorPeaks || (window.__genesis3d.doorPeaks = { surface: 0, hub: 0, habitat: 0 });
        for (const id of ["surface", "hub", "habitat"] as const) peaks[id] = Math.max(peaks[id], doorRef.current[id]);
      }
      if (len > 0.08) {
        const nx = p.x + vx * speed * dt, nz = p.z + vz * speed * dt, doors = doorRef.current;
        const tryGroundedStep = (nextX: number, nextZ: number) => {
          if (blockedMove(p.x, p.z, nextX, nextZ, doors)) {
            if (window.__genesis3d?.collisionDebug) window.__genesis3d.lastMoveAttempt = { from: [p.x, p.z], to: [nextX, nextZ], blocked: true };
            return false;
          }
          const nextGround = groundAt(nextX, nextZ);
          if (!nextGround || !canFollowGround(p.y, nextGround, { maxSlopeDegrees: MAX_WALKABLE_SLOPE_DEGREES })) {
            if (window.__genesis3d) window.__genesis3d.lastGroundBlock = { from: [p.x, p.y, p.z], to: [nextX, nextGround?.height ?? Number.NaN, nextZ], sample: nextGround };
            return false;
          }
          if (window.__genesis3d?.collisionDebug) window.__genesis3d.lastMoveAttempt = { from: [p.x, p.z], to: [nextX, nextZ], blocked: false, ground: nextGround };
          p.x = nextX; p.z = nextZ; p.y = nextGround.height;
          return true;
        };
        if (!tryGroundedStep(nx, nz)) {
          tryGroundedStep(nx, p.z);
          tryGroundedStep(p.x, nz);
        }
        player.rotation.y = Math.atan2(vx, vz);
      }
      const exactGround = groundAt(p.x, p.z);
      if (exactGround) p.y = exactGround.height;
    }
    const target: DoorState = { surface: Math.abs(p.z - 9.02) < 2.4 ? 1 : 0, hub: Math.abs(p.z + 9.02) < 2.4 ? 1 : 0, habitat: Math.abs(p.z + 26.05) < 2.4 ? 1 : 0 };
    if (window.__genesis3d) {
      window.__genesis3d.doorTargets = target;
      const peaks = window.__genesis3d.doorPeaks || (window.__genesis3d.doorPeaks = { surface: 0, hub: 0, habitat: 0 });
      for (const id of ["surface", "hub", "habitat"] as const) peaks[id] = Math.max(peaks[id], doorRef.current[id]);
    }
    const zone = zoneAt(p.x, p.z); if (zone !== previousZone.current) { previousZone.current = zone; setHud(zone); }
    const look = cameraLook.current.set(p.x, p.y + 1.14, p.z);
    const outdoorPitch = Math.min(pitch.current, .75);
    const desired = cameraDesired.current.set(Math.sin(yaw.current) * Math.cos(outdoorPitch), Math.sin(outdoorPitch), Math.cos(yaw.current) * Math.cos(outdoorPitch)).multiplyScalar(distance.current).add(look);
    const indoors = (Math.abs(p.x) <= HUB.halfW && p.z >= HUB.z0 && p.z <= HUB.z1) || (Math.abs(p.x) <= CORRIDOR.halfW && p.z >= CORRIDOR.z0 && p.z <= CORRIDOR.z1) || (Math.abs(p.x) <= HABITAT.halfW && p.z >= HABITAT.z0 && p.z <= HABITAT.z1);
    indoorMode.current = indoors;
    const open = {surface: Number(doorRef.current.surface >= .5), hub: Number(doorRef.current.hub >= .5), habitat: Number(doorRef.current.habitat >= .5)};
    const key = `${open.surface}${open.hub}${open.habitat}`;
    if (key !== doorKey.current) { doorKey.current = key; indoorSolids.current = cameraSolids(open); }
    if (indoors) {
      const aim = solveInteriorOrbit(p, Math.PI-yaw.current, pitch.current, characterBounds, (a,b)=>constrainGenesisEye(a,b,indoorSolids.current), desired);
      lookHeight.current = THREE.MathUtils.damp(lookHeight.current, aim.y-p.y, 8, frameDt);
      look.y = p.y + lookHeight.current;
    } else {
      lookHeight.current = THREE.MathUtils.damp(lookHeight.current, 1.14, 8, frameDt);
      look.y = p.y + lookHeight.current;
      keepCameraInFrontOfFurniture(look, desired, CAMERA_SOLIDS, 0.1);
      keepCameraAboveTerrain(look, desired);
    }
    camera.position.lerp(desired, 1 - Math.exp(-7 * frameDt));
    if (indoors) {
      constrainGenesisEye(look,camera.position,indoorSolids.current);
    } else {
      keepCameraInFrontOfFurniture(look,camera.position,CAMERA_SOLIDS,.1);
      keepCameraAboveTerrain(look,camera.position);
    }
    camera.lookAt(look);
    if (window.__genesis3d) window.__genesis3d.camera = camera;
    window.__genesis3d && (window.__genesis3d.frames = (window.__genesis3d.frames || 0) + 1);
  });
  useEffect(() => {
  const api = window.__genesis3d || (window.__genesis3d = {});
    api.input = joystick;
    api.renderer = gl;
    api.scene = scene;
    return () => { if (window.__genesis3d) delete window.__genesis3d.input; };
  }, [gl, scene]);
  return null;
}

function Scene({ setHud, setConsole }: { setHud: (s: string) => void; setConsole: (s: string) => void }) {
  window.__genesis3d ||= { frames: 0 };
  const player = useRef<THREE.Group>(null); const moving = useRef(false);
  const doors = useRef<DoorState>({ surface: 0, hub: 0, habitat: 0 });
  const interaction = useCallback(() => {
    const p = player.current?.position; if (!p) return;
    if (p.x < -3.7 && Math.abs(p.z + 2.2) < 2.2) setConsole("COMMAND CONSOLE · Synthetic offline mission table. No live colony, mission or inventory state.");
    else if (Math.abs(p.x - 4.7) < 2.3 && p.z < -27 && p.z > -31) setConsole("HABITAT ENVIRONMENT PANEL · Local display mock. No live oxygen, water or power telemetry.");
    else setConsole("Approach a cyan console and press E to inspect.");
  }, [setConsole]);
  useEffect(() => {
    const api = window.__genesis3d || (window.__genesis3d = {});
    api.player = { moveTo(x, z) {
      const ground = groundAt(x, z);
      if (!player.current || !Number.isFinite(x) || !Number.isFinite(z) || Math.abs(x) > WORLD_LIMIT || Math.abs(z) > WORLD_LIMIT || !ground || ground.slopeDegrees > MAX_WALKABLE_SLOPE_DEGREES) return false;
      player.current.position.set(x, ground.height, z); return true;
    }, position() { const p = player.current?.position; return p ? [p.x, p.y, p.z] : [0, 0, 0]; }, zone() { const p = player.current?.position; return p ? zoneAt(p.x, p.z) : "loading"; } };
    api.groundAt = groundAt;
    api.terrainAt = sampleTerrainSurface;
    api.terrainClassAt = (x, z) => {
      const sample = sampleTerrainSurface(x, z);
      if (!sample) return { classification: "outside terrain mesh" };
      return { classification: sample.slopeDegrees <= MAX_WALKABLE_SLOPE_DEGREES ? "walkable terrain" : "impassable slope", height: sample.height, slopeDegrees: sample.slopeDegrees };
    };
    api.playableBoundary = PLAYABLE_BOUNDARY;
    api.cameraFurniture = CAMERA_SOLIDS;
    api.colliders = WORLD_COLLISION_VOLUMES;
    api.structuralColliders = STRUCTURAL_COLLIDERS;
    api.furnitureColliders = FURNITURE_COLLIDERS;
    api.environmentColliders = ENVIRONMENT_COLLIDERS;
    api.doors = () => ({ ...doors.current }); api.interact = interaction; api.ready = true;
    return () => { if (window.__genesis3d) { window.__genesis3d.ready = false; delete window.__genesis3d.player; } };
  }, [interaction]);
  return <>
    <color attach="background" args={["#b48b8c"]} /><fog attach="fog" args={["#b48b8c", 76, 190]} />
    <hemisphereLight args={["#f1c4b5", "#68463a", 1.38]} />
    <ambientLight color="#d6e2df" intensity={0.38} />
    <directionalLight color="#ffd7b0" position={[-42, 64, 26]} intensity={2.45} castShadow shadow-mapSize={[1536, 1536]} shadow-camera-left={-72} shadow-camera-right={72} shadow-camera-top={72} shadow-camera-bottom={-72} shadow-bias={-0.00025} />
    <Terrain /> <TerrainStones /> <AtmosphericDust />
    {BACKGROUND_RIDGES.map(ridge => <HorizonRidge key={ridge.seed} {...ridge} />)}
    <GenesisSharedBaseScene doorStateRef={doors} targetRef={player} interact={interaction} />
    <BoulderField entries={BOULDER_LAYOUT} />
    <CollisionDebugOverlay doorRef={doors} />
    <group ref={player} position={[0, floorY(0, 28), 28]}><PlayerVisual moving={moving} /></group>
    <Controls playerRef={player} doorRef={doors} setHud={setHud} moving={moving} />
  </>;
}

// HUD state lives outside the R3F root. Memoizing the scene prevents a
// console/help panel update from rebuilding or reallocating static geometry.
const MemoScene = memo(Scene);

function Joystick() {
  const [active, setActive] = useState(false);
  const pointer = useRef<number | null>(null);
  const set = (e: React.PointerEvent<HTMLDivElement>) => {
    const r = e.currentTarget.getBoundingClientRect(), x = (e.clientX - (r.left + r.width / 2)) / (r.width * 0.36), y = (e.clientY - (r.top + r.height / 2)) / (r.height * 0.36);
    const len = Math.hypot(x, y); const v = len > 1 ? { x: x / len, y: y / len } : { x, y };
    if (window.__genesis3d?.input) window.__genesis3d.input.current = v;
    const knob = e.currentTarget.querySelector<HTMLElement>("[data-knob]"); if (knob) knob.style.transform = `translate(${v.x * 30}px, ${v.y * 30}px)`;
  };
  const stop = () => { pointer.current = null; setActive(false); if (window.__genesis3d?.input) window.__genesis3d.input.current = { x: 0, y: 0 }; const knob = document.querySelector<HTMLElement>("[data-knob]"); if (knob) knob.style.transform = "translate(0,0)"; };
  return <div aria-label="Movement joystick" data-ui className="genesis-joystick" onPointerDown={e => { e.currentTarget.setPointerCapture(e.pointerId); pointer.current = e.pointerId; setActive(true); set(e); }} onPointerMove={e => { if (pointer.current === e.pointerId) set(e); }} onPointerUp={stop} onPointerCancel={stop}>
    <span className="genesis-joystick-ring" /><span data-knob className={`genesis-joystick-knob${active ? " active" : ""}`} />
  </div>;
}

function CollisionDebugOverlay({ doorRef }: { doorRef: React.MutableRefObject<DoorState> }) {
  const [enabled, setEnabled] = useState(() => new URLSearchParams(window.location.search).get("collisionDebug") === "1");
  const surfaceGate = useRef<THREE.Mesh>(null), hubGate = useRef<THREE.Mesh>(null), habitatGate = useRef<THREE.Mesh>(null);
  const objects = useMemo(() => {
    const geometry = new THREE.BoxGeometry(1, 1, 1), dummy = new THREE.Object3D();
    const categories = ["wall", "structure", "frame", "furniture", "rock"];
    const entries = categories.map(category => {
      const volumes = WORLD_COLLISION_VOLUMES.filter(volume => volume.category === category && volume.shape !== "circle");
      const material = new THREE.MeshBasicMaterial({ color: category === "furniture" ? "#ffae54" : category === "rock" ? "#ffcf48" : category === "frame" ? "#b66aff" : category === "structure" ? "#51e5d2" : "#ff5268", wireframe: true, transparent: true, opacity: 0.9, depthWrite: false, toneMapped: false });
      const mesh = new THREE.InstancedMesh(geometry, material, volumes.length);
      volumes.forEach((volume, index) => {
        const bounds = colliderBounds(volume);
        dummy.position.set((bounds.xMin + bounds.xMax) / 2, (bounds.yMin + bounds.yMax) / 2, (bounds.zMin + bounds.zMax) / 2);
        dummy.scale.set(bounds.xMax - bounds.xMin, bounds.yMax - bounds.yMin, bounds.zMax - bounds.zMin); dummy.updateMatrix(); mesh.setMatrixAt(index, dummy.matrix);
      });
      mesh.instanceMatrix.needsUpdate = true; mesh.computeBoundingSphere();
      return { mesh, material };
    }).filter(entry => entry.mesh.count > 0);
    const classificationGeometry = new THREE.PlaneGeometry(TERRAIN_SIZE, TERRAIN_SIZE, TERRAIN_SEGMENTS, TERRAIN_SEGMENTS);
    classificationGeometry.rotateX(-Math.PI / 2);
    const terrainPositions = classificationGeometry.attributes.position as THREE.BufferAttribute;
    const terrainColors: number[] = [];
    const walkableColor = new THREE.Color("#55dbe0"), blockedColor = new THREE.Color("#ff5268");
    for (let i = 0; i < terrainPositions.count; i++) {
      const x = terrainPositions.getX(i), z = terrainPositions.getZ(i), sample = sampleTerrainSurface(x, z);
      terrainPositions.setY(i, terrainVertexHeight(x, z) + 0.035);
      const color = sample && sample.slopeDegrees <= MAX_WALKABLE_SLOPE_DEGREES ? walkableColor : blockedColor;
      terrainColors.push(color.r, color.g, color.b);
    }
    classificationGeometry.setAttribute("color", new THREE.Float32BufferAttribute(terrainColors, 3));
    const classificationMaterial = new THREE.MeshBasicMaterial({ vertexColors: true, wireframe: true, transparent: true, opacity: 0.62, depthWrite: false, toneMapped: false, side: THREE.DoubleSide });

    const boundaryPositions: number[] = [];
    const boundarySample = (x: number, z: number) => {
      const ground = sampleTerrainSurface(x, z);
      boundaryPositions.push(x, (ground?.height ?? 0) + 0.07, z);
    };
    for (let i = 0; i < TERRAIN_SEGMENTS; i++) boundarySample(-TERRAIN_HALF_SIZE + i * TERRAIN_SIZE / TERRAIN_SEGMENTS, -TERRAIN_HALF_SIZE);
    for (let i = 0; i < TERRAIN_SEGMENTS; i++) boundarySample(TERRAIN_HALF_SIZE, -TERRAIN_HALF_SIZE + i * TERRAIN_SIZE / TERRAIN_SEGMENTS);
    for (let i = 0; i < TERRAIN_SEGMENTS; i++) boundarySample(TERRAIN_HALF_SIZE - i * TERRAIN_SIZE / TERRAIN_SEGMENTS, TERRAIN_HALF_SIZE);
    for (let i = 0; i < TERRAIN_SEGMENTS; i++) boundarySample(-TERRAIN_HALF_SIZE, TERRAIN_HALF_SIZE - i * TERRAIN_SIZE / TERRAIN_SEGMENTS);
    const boundaryGeometry = new THREE.BufferGeometry(); boundaryGeometry.setAttribute("position", new THREE.Float32BufferAttribute(boundaryPositions, 3));
    const boundaryMaterial = new THREE.LineBasicMaterial({ color: "#ffcf48", transparent: true, opacity: 0.96, toneMapped: false });

    const reactor = REACTOR_COLLIDERS[0];
    const reactorGeometry = new THREE.CylinderGeometry(reactor.radius, reactor.radius, reactor.yMax - reactor.yMin, 32, 1, true);
    const reactorMaterial = new THREE.MeshBasicMaterial({ color: "#ff9c52", wireframe: true, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false });
    return { geometry, entries, classificationGeometry, classificationMaterial, boundaryGeometry, boundaryMaterial, reactorGeometry, reactorMaterial, reactorPosition: [reactor.x, (reactor.yMin + reactor.yMax) / 2, reactor.z] as [number, number, number] };
  }, []);
  const gateMaterial = useMemo(() => new THREE.MeshBasicMaterial({ color: "#ff5268", wireframe: true, transparent: true, opacity: 0.95, depthWrite: false, toneMapped: false }), []);
  useFrame(() => {
    if (surfaceGate.current) surfaceGate.current.visible = doorRef.current.surface < 0.5;
    if (hubGate.current) hubGate.current.visible = doorRef.current.hub < 0.5;
    if (habitatGate.current) habitatGate.current.visible = doorRef.current.habitat < 0.5;
  });
  useEffect(() => {
    const api = window.__genesis3d || (window.__genesis3d = {});
    api.collisionDebug = enabled;
    api.toggleCollisionDebug = () => setEnabled(value => !value);
    const toggle = () => setEnabled(value => !value);
    const keydown = (event: KeyboardEvent) => { if (event.code === "F3") { event.preventDefault(); toggle(); } };
    window.addEventListener("genesis-collision-debug-toggle", toggle);
    window.addEventListener("keydown", keydown);
    return () => {
      window.removeEventListener("genesis-collision-debug-toggle", toggle);
      window.removeEventListener("keydown", keydown);
      if (window.__genesis3d) { window.__genesis3d.collisionDebug = false; delete window.__genesis3d.toggleCollisionDebug; }
    };
  }, [enabled]);
  useEffect(() => () => { objects.entries.forEach(({ mesh, material }) => { mesh.dispose(); material.dispose(); }); objects.geometry.dispose(); objects.classificationGeometry.dispose(); objects.classificationMaterial.dispose(); objects.boundaryGeometry.dispose(); objects.boundaryMaterial.dispose(); objects.reactorGeometry.dispose(); objects.reactorMaterial.dispose(); gateMaterial.dispose(); }, [objects, gateMaterial]);
  return enabled ? <group>
    {objects.entries.map(({ mesh }, index) => <primitive key={index} object={mesh} dispose={null} />)}
    <mesh name="genesis-terrain-classification-debug" geometry={objects.classificationGeometry} material={objects.classificationMaterial} renderOrder={8} />
    <lineLoop name="genesis-playable-boundary-debug" geometry={objects.boundaryGeometry} material={objects.boundaryMaterial} renderOrder={9} />
    <mesh name="genesis-reactor-collider-debug" geometry={objects.reactorGeometry} material={objects.reactorMaterial} position={objects.reactorPosition} renderOrder={10} />
    <mesh ref={surfaceGate} geometry={objects.geometry} material={gateMaterial} position={[0, FLOOR + 1.5, 9.02]} scale={[3.3, 2.98, 0.19]} />
    <mesh ref={hubGate} geometry={objects.geometry} material={gateMaterial} position={[0, FLOOR + 1.5, -9.02]} scale={[3.6, 2.98, 0.19]} />
    <mesh ref={habitatGate} geometry={objects.geometry} material={gateMaterial} position={[0, FLOOR + 1.5, -26.05]} scale={[3.4, 2.98, 0.19]} />
  </group> : null;
}

export function GenesisV5Experience() {
  const [zone, setZone] = useState("ARES SURFACE · GENESIS OUTPOST");
  const [consoleMessage, setConsole] = useState("");
  const [showHelp, setShowHelp] = useState(true);
  const hud = useCallback((value: string) => setZone(value), []);
  const consoleState = useCallback((value: string) => setConsole(value), []);
  return <main className="genesis3d-shell">
    <Canvas shadows dpr={[1, 1.25]} camera={{ position: [0, 5.4, 35], fov: 57, near: 0.1, far: 260 }} gl={{ antialias: true, powerPreference: "high-performance", alpha: false, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.08 }} onCreated={({ gl }) => { gl.shadowMap.type = THREE.PCFSoftShadowMap; if (window.__genesis3d) window.__genesis3d.errors = []; }}>
      <MemoScene setHud={hud} setConsole={consoleState} />
    </Canvas>
    <header className="genesis-hud" data-ui>
      <div className="genesis-brand"><span className="brand-mark">B</span><span><b>ARES GENESIS</b><small>LOCAL EXPLORATION PROTOTYPE · V5</small></span></div>
      <div className="genesis-zone"><i />{zone}</div>
      <button className="hud-button" onClick={() => setShowHelp(v => !v)}>{showHelp ? "HIDE CONTROLS" : "CONTROLS"}</button>
    </header>
    <aside className="genesis-status" data-ui><span>SIMULATION ONLY</span><span>● NO NETWORK</span><span>● NO PERSISTENCE</span></aside>
    {showHelp && <section className="genesis-help" data-ui><b>EXPLORATION</b><span>W A S D · Move</span><span>SHIFT · Run</span><span>Drag · Orbit camera</span><span>Scroll · Camera distance</span><span>E · Inspect nearby console</span><span>F3 · Collision volumes</span></section>}
    {consoleMessage && <section className="genesis-console-panel" role="status" data-ui><button aria-label="Close panel" onClick={() => setConsole("")}>×</button><b>BOBU SYSTEMS</b><p>{consoleMessage}</p></section>}
    <div className="genesis-crosshair" aria-hidden="true">＋</div><Joystick />
    <footer className="genesis-footer" data-ui><span>PROCEDURAL LOCAL SCENE</span><span>Walk from the surface through Operations to Habitat</span></footer>
  </main>;
}
