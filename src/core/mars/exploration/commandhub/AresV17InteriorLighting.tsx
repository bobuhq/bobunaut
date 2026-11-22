import { memo } from "react";

/**
 * Lightweight architectural accents.
 * No dynamic lights, shadows, polling or database calls.
 * Positioned against existing interior boundaries.
 */
export const AresV17InteriorLighting = memo(function AresV17InteriorLighting() {
  return (
    <group name="ARES_V17_INTERIOR_LIGHTING">
      {[-1, 1].map((side) => (
        <group key={side}>
          <mesh
            position={[side * 7.35, 3.65, 0]}
            rotation={[0, 0, Math.PI / 2]}
          >
            <boxGeometry args={[0.055, 0.075, 15.5]} />
            <meshBasicMaterial color="#64eaff" toneMapped={false} />
          </mesh>

          <mesh position={[side * 6.9, 0.055, -1.0]}>
            <boxGeometry args={[0.065, 0.018, 12.5]} />
            <meshBasicMaterial color="#af59ff" toneMapped={false} />
          </mesh>

          {[-5.6, 0, 5.6].map((z) => (
            <mesh key={z} position={[side * 7.34, 2.15, z]}>
              <boxGeometry args={[0.045, 1.3, 0.07]} />
              <meshBasicMaterial color="#f5e2c7" toneMapped={false} />
            </mesh>
          ))}
        </group>
      ))}

      <mesh position={[0, 3.95, -8.36]}>
        <boxGeometry args={[12.6, 0.075, 0.055]} />
        <meshBasicMaterial color="#c475ff" toneMapped={false} />
      </mesh>
    </group>
  );
});
