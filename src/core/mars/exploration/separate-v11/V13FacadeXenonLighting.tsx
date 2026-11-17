import { useMemo } from 'react';
import type { PlannedBuilding } from './connected-campus-layout.mjs';

type Props = {
  buildings: PlannedBuilding[];
  terrainAt: (x: number, z: number) => number;
};

const XENON = '#d5f1ff';
const SOFT_XENON = '#a9deff';
const WARM = '#ffd5a5';
const PURPLE = '#ba87ff';

/**
 * V13-only facade illumination. Light-only, no collision bodies or ground meshes.
 * Positioned off the world coordinates of the ORIGINAL Command Hub and loaded
 * campus buildings. Does not alter shared GLTF materials or ARES gameplay.
 */
export function V13FacadeXenonLighting({ buildings, terrainAt }: Props) {
  const hubLights = useMemo(() => {
    // Original hub front exterior spans roughly X -60..-28, near Z -59.
    // The nearest approach is to the south (increasing Z).
    const xPositions = [-56.2, -51.2, -36.8, -31.8];
    return xPositions.map(x => ({ x, y: terrainAt(x, -56.9) + 3.1 }));
  }, [terrainAt]);

  return (
    <group name="v13-front-facade-xenon-lights" userData={{ cameraIgnore: true }}>
      {/* Glass bays of the central Command Hub and both wings. */}
      {hubLights.map(({x, y}, i) => (
        <group key={`hub-window-${i}`}>
          <pointLight
            position={[x, y, -57.0]}
            color={XENON}
            intensity={20}
            distance={12}
            decay={2}
          />
          <pointLight
            position={[x, y + 1.9, -58.2]}
            color={SOFT_XENON}
            intensity={10}
            distance={9}
            decay={2}
          />
        </group>
      ))}
      {/* Light the complete central dome entrance without covering its door. */}
      <pointLight position={[-44, terrainAt(-44, -57) + 4.3, -56.5]}
        color={WARM} intensity={32} distance={13} decay={2} />
      <pointLight position={[-44, terrainAt(-44, -57) + 6.3, -58.2]}
        color={PURPLE} intensity={9} distance={10} decay={2} />
      {[-48.1, -39.9].map(x => (
        <pointLight key={`hub-entry-${x}`}
          position={[x, terrainAt(x, -56.7) + 2.7, -56.7]}
          color={XENON} intensity={16} distance={8} decay={2} />
      ))}
      {/* Only physically present campus buildings receive front illumination. */}
      {buildings.map(building => {
        const front = building.worldZ + building.footprint.halfZ;
        const deck = building.plan.sites[0]?.deck;
        if (!Number.isFinite(deck)) return null;
        const half = Math.max(2.3, Math.min(building.footprint.halfX * 0.68, 5.2));
        return (
          <group key={`facade-${building.id}`}>
            {[-1, 1].map(side => (
              <pointLight
                key={side}
                position={[building.worldX + side * half, deck + 3.3, front + 1.15]}
                color={XENON}
                intensity={20}
                distance={11}
                decay={2}
              />
            ))}
            <pointLight
              position={[building.worldX, deck + 4.4, front + 1.5]}
              color={WARM}
              intensity={24}
              distance={11}
              decay={2}
            />
          </group>
        );
      })}
    </group>
  );
}
