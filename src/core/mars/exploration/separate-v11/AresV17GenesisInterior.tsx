import { memo } from "react";

type Props = {
  deck: number;
  halfWidth: number;
  halfDepth: number;
};

function ResearchConsole({
  x,
  z,
  side,
}: {
  x: number;
  z: number;
  side: number;
}) {
  return (
    <group position={[x, 0, z]}>
      {/* Silver workstation */}
      <mesh position={[0, 0.68, 0]}>
        <boxGeometry args={[0.85, 0.17, 1.55]} />
        <meshStandardMaterial
          color="#a9bcc9"
          metalness={0.65}
          roughness={0.34}
        />
      </mesh>

      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[0.22, 0.65, 0.3]} />
        <meshStandardMaterial
          color="#283747"
          metalness={0.55}
        />
      </mesh>

      {/* Upright holographic display */}
      <mesh position={[-side * 0.12, 1.28, 0]}>
        <boxGeometry args={[0.065, 0.95, 1.3]} />
        <meshBasicMaterial
          color="#315d96"
          toneMapped={false}
        />
      </mesh>

      <mesh position={[-side * 0.175, 1.3, 0]}>
        <boxGeometry args={[0.025, 0.72, 1.08]} />
        <meshBasicMaterial
          color="#63dfff"
          toneMapped={false}
        />
      </mesh>

      {/* Violet status and data strips */}
      {[-0.32, -0.08, 0.16, 0.4].map((offset, index) => (
        <mesh
          key={index}
          position={[
            -side * 0.196,
            1.48 - index * 0.13,
            offset,
          ]}
        >
          <boxGeometry args={[0.012, 0.035, 0.17]} />
          <meshBasicMaterial
            color={index % 2 ? "#c282ff" : "#e9faff"}
            toneMapped={false}
          />
        </mesh>
      ))}

      <mesh position={[0, 0.78, 0]}>
        <boxGeometry args={[0.72, 0.025, 1.42]} />
        <meshBasicMaterial
          color="#9b59ef"
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export const AresV17GenesisInterior = memo(
  function AresV17GenesisInterior({
    deck,
    halfWidth,
    halfDepth,
  }: Props) {
    // Furnish the central traversable hall, not the
    // outer GLB laboratory wings.
    const consoleX = Math.min(2.75, halfWidth - 2.0);
    const stationZ = Math.min(2.15, halfDepth - 3.5);

    return (
      <group
        name="ARES_V17_GENESIS_INTERIOR_V2"
        position={[0, deck + 0.4, 0]}
      >
        {/* Static, shadow-free indoor illumination */}
        <pointLight
          position={[0, 3.05, 0]}
          color="#f5ecdf"
          intensity={3.0}
          distance={10}
          decay={2}
          castShadow={false}
        />

        <pointLight
          position={[-2.4, 2.8, -2]}
          color="#9d9fff"
          intensity={1.5}
          distance={7}
          decay={2}
          castShadow={false}
        />

        {/* Ceiling light bars */}
        {[-2.6, 2.6].map((x) => (
          <group key={x}>
            <mesh position={[x, 3.5, 0]}>
              <boxGeometry args={[0.17, 0.06, 7.6]} />
              <meshBasicMaterial
                color="#d5f7ff"
                toneMapped={false}
              />
            </mesh>

            <mesh position={[x, 3.42, 0]}>
              <boxGeometry args={[0.065, 0.025, 7.3]} />
              <meshBasicMaterial
                color="#61dfff"
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}

        {/* Four visible research workstations */}
        {[-1, 1].flatMap((side) =>
          [-stationZ, stationZ].map((z) => (
            <ResearchConsole
              key={`${side}-${z}`}
              x={side * consoleX}
              z={z}
              side={side}
            />
          ))
        )}

        {/* Flat floor guidance, leaving the aisle open */}
        {[-1.25, 1.25].map((x) => (
          <mesh key={x} position={[x, 0.045, 0]}>
            <boxGeometry args={[0.055, 0.012, 7.6]} />
            <meshBasicMaterial
              color="#a26cff"
              toneMapped={false}
            />
          </mesh>
        ))}

        {/* Energy status modules */}
        {[-1, 1].map((side) => (
          <group
            key={side}
            position={[side * consoleX, 0, 0]}
          >
            <mesh position={[0, 0.94, 0]}>
              <boxGeometry args={[0.55, 0.1, 0.5]} />
              <meshStandardMaterial
                color="#b7bfc9"
                metalness={0.7}
                roughness={0.3}
              />
            </mesh>
            <mesh position={[0, 1.07, 0]}>
              <octahedronGeometry args={[0.17, 0]} />
              <meshBasicMaterial
                color="#b468ff"
                toneMapped={false}
              />
            </mesh>
          </group>
        ))}
      </group>
    );
  }
);
