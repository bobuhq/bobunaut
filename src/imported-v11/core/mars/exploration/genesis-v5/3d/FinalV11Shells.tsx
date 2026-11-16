// Extracted from final V11. Only architecture dependencies retained.
import { PressureDoorLeaf, GreenAirlockFrame } from './CinematicEnvironment';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useEffect, useMemo, useRef } from 'react';
const FLOOR = 1.2;
export type GenesisDoorId = "surface" | "hub" | "habitat";
export type GenesisDoorState = Record<GenesisDoorId, number>;
type DoorId = GenesisDoorId;
type DoorState = GenesisDoorState;
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
function HabitatDisplaySurfaces() {
  const texture = useMemo(() => createDashboardTexture("#77d4c5"), []);
  useEffect(() => () => texture.dispose(), [texture]);
  return <group>
    {[-5, 5].map(x => <DisplaySurface key={x} position={[x, FLOOR + 3.2, -42.55]} size={[3.32, 1.48]} texture={texture} />)}
  </group>;
}
function Box({ p, s, color, metalness = 0.48, roughness = 0.58, emissive, intensity = 0, batch = true }: { p: [number, number, number]; s: [number, number, number]; color: string; metalness?: number; roughness?: number; emissive?: string; intensity?: number; batch?: boolean }) {
  return <mesh position={p} scale={s} userData={batch ? { genesisStaticBox: true } : undefined} castShadow={s[0] > 1 && s[1] > 1.8 && s[2] > 1} receiveShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={color} metalness={metalness} roughness={roughness} emissive={emissive} emissiveIntensity={intensity} /></mesh>;
}
export function Door({ id, z, doorRef, width = 3.3 }: { id: DoorId; z: number; doorRef: React.MutableRefObject<DoorState>; width?: number; wall?: string }) {
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
export function Corridor() {
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
export function Habitat({ roofRef, doorRef }: { roofRef: React.RefObject<THREE.Mesh | null>; doorRef: React.MutableRefObject<DoorState> }) {
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
