import { useMemo } from 'react';
import * as THREE from 'three';
import { CampusIlluminatedSign } from './CampusIlluminatedSign';
// BOBU_V13_EXTENDED_ENTRY_HALLS_V2
import type { PlannedBuilding } from './connected-campus-layout.mjs';

type TerrainAt = (x: number, z: number) => number;
type PortalProps = {
  label: string;
  x: number;
  frontZ: number;
  width: number;
  depth: number;
  roofHeight: number;
  terrainAt: TerrainAt;
  mobile: boolean;
};

// Every support is outside the 5m-wide centre approach. No road ribbons,
// stepping-stone grid, second terrain slab, planters, or rock scatter.
function EntrancePortal({label, x, frontZ, width, depth, roofHeight, terrainAt, mobile}: PortalProps) {
  const isHub = label === 'command-hub';
  const half = width / 2;
  const zCenter = frontZ + depth / 2;
  const offsets = [-half, half];
  const floor = terrainAt(x, zCenter);
  const topY = Math.max(
    floor,
    ...offsets.flatMap(dx => [terrainAt(x + dx, frontZ + .35), terrainAt(x + dx, frontZ + depth - .3)])
  ) + roofHeight;
  const supports = useMemo(() => offsets.flatMap((dx, side) => [
    {key: `${side}-inner`, px: x + dx, pz: frontZ + .35},
    {key: `${side}-outer`, px: x + dx, pz: frontZ + depth - .3},
  ]), [x, frontZ, depth, half]);

  return <group name={`v13-entry-hall-${label}`}>
    {/* Entrance fascia: readable purple title, oriented toward the exterior (+Z). */}
    <group name={`v13-entry-sign-${label}`} position={[x,topY-.51,frontZ+depth+.27]}>
      <mesh position={[0,0,-.075]}>
        <boxGeometry args={[Math.min(width-.35,7.8),.74,.12]}/>
        <meshStandardMaterial color="#151b29" metalness={.7} roughness={.32}/>
      </mesh>
      <CampusIlluminatedSign
        position={[0, 0, .012]}
        width={width - 1.05}
        height={.59}
        text={isHub ? 'COMMAND HUB' : 'GENESIS'}
        tint={isHub ? '#e6aaff' : '#c8afff'}
        phase={isHub ? 0 : 2.1}
        mobile={mobile}
      />
    </group>
    {/* Elevated titanium canopy, open central passage, warm underside. */}
    <mesh position={[x, topY, zCenter]} castShadow receiveShadow>
      <boxGeometry args={[width + .65, .24, depth + .55]}/>
      <meshStandardMaterial color="#424e5e" metalness={.78} roughness={.29}/>
    </mesh>
    <mesh position={[x, topY - .16, zCenter]}>
      <boxGeometry args={[width - .12, .045, depth - .15]}/>
      <meshStandardMaterial color="#bec4c8" metalness={.68} roughness={.34}/>
    </mesh>
    <mesh position={[x, topY + .142, zCenter]}>
      <boxGeometry args={[width - .55, .037, depth - .3]}/>
      <meshPhysicalMaterial color="#6f8da5" metalness={.45} roughness={.22} transparent opacity={.52} depthWrite={false}/>
    </mesh>
    {/* Structural piers are set to the sides; never across the doors. */}
    {supports.map(s => {
      const groundY = terrainAt(s.px, s.pz);
      const height = Math.max(.1, topY - groundY - .1);
      return <group key={s.key}>
        <mesh position={[s.px, groundY + height / 2, s.pz]} castShadow>
          <boxGeometry args={[.23, height, .26]}/>
          <meshStandardMaterial color="#929da8" metalness={.73} roughness={.32}/>
        </mesh>
        <mesh position={[s.px, groundY + .14, s.pz]}>
          <boxGeometry args={[.42, .28, .42]}/>
          <meshStandardMaterial color="#343d48" metalness={.62} roughness={.4}/>
        </mesh>
      </group>;
    })}
    {/* Open side bays: translucent glazing with 2m-high clear central sightline. */}
    {offsets.map((dx, index) => <group key={index}>
      <mesh position={[x + dx, topY - .54, zCenter]}>
        <boxGeometry args={[.095, .095, depth - .25]}/>
        <meshStandardMaterial color="#aebbc8" metalness={.62} roughness={.32}/>
      </mesh>
      <mesh position={[x + dx, topY - 1.02, zCenter]}>
        <boxGeometry args={[.045, .72, depth - .52]}/>
        <meshPhysicalMaterial color="#93afc2" transparent opacity={.14} depthWrite={false} metalness={.24} roughness={.12} side={THREE.DoubleSide}/>
      </mesh>
    </group>)}
    {/* Discrete lamps instead of the deleted neon roadside strips. */}
    {offsets.map((dx, i) => <group key={`lamp-${i}`}>
      <mesh position={[x + dx * .76, topY - .205, frontZ + depth - .65]}>
        <cylinderGeometry args={[.12, .12, .042, 20]}/>
        <meshStandardMaterial color="#edc38b" emissive="#ffba72" emissiveIntensity={1.15} roughness={.32}/>
      </mesh>
      <pointLight position={[x + dx * .76, topY - .42, frontZ + depth - .65]} color="#ffc995" intensity={7.0} distance={9.5} decay={2}/>
    </group>)}
    {/* Mid-span illumination: lights stay mounted under the canopy, not in the walkway. */}
    {!mobile && offsets.map((dx,i)=><pointLight
      key={`mid-light-${i}`}
      position={[x+dx*.68,topY-.35,frontZ+depth*.52]}
      color="#ffd2a6" intensity={4.6} distance={7.5} decay={2}
    />)}
    {/* Restrained BOBU purple identity inset at the crown, not a ground band. */}
    <mesh position={[x, topY + .137, frontZ + depth / 2]}>
      <boxGeometry args={[1.2, .025, .16]}/>
      <meshStandardMaterial color="#a17bc4" emissive="#6a3d96" emissiveIntensity={.65} metalness={.42}/>
    </mesh>
  </group>;
}

export function V13EntranceHalls({terrainAt, buildings, mobile}: {terrainAt: TerrainAt; buildings: PlannedBuilding[]; mobile: boolean}) {
  const habitat = buildings.find(building => building.id === 'habitat');
  return <group name="v13-two-architectural-entry-halls">
    {/* Existing Hub entrance/stairs at Z≈-59. The portal fronts toward +Z. */}
    <EntrancePortal label="command-hub" x={-44} frontZ={-57.1} width={8.4} depth={7.9} roofHeight={4.5} terrainAt={terrainAt} mobile={mobile}/>
    {habitat && <EntrancePortal
      label="genesis-habitat"
      x={habitat.worldX}
      frontZ={habitat.worldZ + habitat.footprint.halfZ + .55}
      width={7.0}
      depth={6.7}
      roofHeight={4.35}
      terrainAt={terrainAt} mobile={mobile}
    />}
  </group>;
}
