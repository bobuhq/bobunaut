import * as THREE from "three";


/*
 * BOBU Mars Cinematic Environment V1
 *
 * Lightweight environment layer.
 * No textures.
 * No post-processing.
 * No additional animation loop.
 *
 * Purpose:
 * - curved planetary horizon
 * - distant Mars silhouette
 * - cinematic warm/cold light contrast
 */
export default function MarsCinematicEnvironment() {
  return (
    <group>
      {/*
       * CURVED PLANET SURFACE
       *
       * Large sphere placed below the colony creates a real
       * planetary curvature instead of an endless flat plane.
       */}
      <mesh
        position={[0, -58, 0]}
        receiveShadow
      >
        <sphereGeometry
          args={[
            64,
            64,
            32,
          ]}
        />

        <meshStandardMaterial
          color="#5f2118"
          roughness={0.96}
          metalness={0.02}
        />
      </mesh>


      {/*
       * DISTANT MARS HORIZON
       *
       * Low-poly mountain silhouettes are deliberately cheap.
       * They create depth behind the colony without GLTF cost.
       */}
      <group
        position={[
          0,
          -0.6,
          -30,
        ]}
      >
        <mesh
          position={[-19, 3.4, 0]}
          scale={[9, 4.5, 3]}
        >
          <coneGeometry
            args={[
              1,
              2,
              7,
            ]}
          />

          <meshStandardMaterial
            color="#35100d"
            roughness={1}
          />
        </mesh>

        <mesh
          position={[-7, 4.2, -2]}
          scale={[11, 5.5, 4]}
        >
          <coneGeometry
            args={[
              1,
              2,
              8,
            ]}
          />

          <meshStandardMaterial
            color="#42140f"
            roughness={1}
          />
        </mesh>

        <mesh
          position={[8, 3.6, -1]}
          scale={[12, 4.6, 4]}
        >
          <coneGeometry
            args={[
              1,
              2,
              7,
            ]}
          />

          <meshStandardMaterial
            color="#39110d"
            roughness={1}
          />
        </mesh>

        <mesh
          position={[21, 4.8, -4]}
          scale={[10, 6.2, 4]}
        >
          <coneGeometry
            args={[
              1,
              2,
              8,
            ]}
          />

          <meshStandardMaterial
            color="#2c0d0b"
            roughness={1}
          />
        </mesh>
      </group>


      {/*
       * ATMOSPHERIC HORIZON GLOW
       *
       * Transparent additive ring approximates Mars atmospheric
       * scattering without a full-screen shader pass.
       */}
      <mesh
        position={[
          0,
          1.4,
          -43,
        ]}
        scale={[
          30,
          5,
          1,
        ]}
      >
        <sphereGeometry
          args={[
            1,
            48,
            20,
          ]}
        />

        <meshBasicMaterial
          color="#d64b2e"
          transparent
          opacity={0.09}
          blending={
            THREE.AdditiveBlending
          }
          depthWrite={false}
          side={THREE.BackSide}
        />
      </mesh>
    </group>
  );
}
