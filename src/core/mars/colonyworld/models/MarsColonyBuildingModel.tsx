import * as THREE from "three";

import {
  useGLTF,
} from "@react-three/drei";

import {
  Suspense,
} from "react";

import {
  getMarsBuildingAsset,
} from "../assets";

import MarsKayKitBuilding from "./MarsKayKitBuilding";


type LoadedMarsBuildingProps = {
  modelPath: string;
  scale: number;
  positionY: number;
  rotationY: number;
};

function LoadedMarsBuilding({
  modelPath,
  scale,
  positionY,
  rotationY,
}: LoadedMarsBuildingProps) {
  const gltf = useGLTF(modelPath);

  return (
    <primitive
      object={gltf.scene.clone(true)}
      scale={scale}
      position={[0, positionY, 0]}
      rotation={[
        0,
        THREE.MathUtils.degToRad(
          rotationY,
        ),
        0,
      ]}
    />
  );
}

type Props = {
  buildingKey: string;
  selected?: boolean;
  preview?: boolean;
};

function EnergyBuilding({
  selected = false,
}: {
  selected?: boolean;
}) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.22, 0]}>
        <cylinderGeometry args={[0.72, 0.82, 0.44, 8]} />
        <meshStandardMaterial
          color="#292533"
          metalness={0.78}
          roughness={0.3}
        />
      </mesh>

      <mesh castShadow position={[0, 0.68, 0]}>
        <cylinderGeometry args={[0.34, 0.48, 0.72, 8]} />
        <meshStandardMaterial
          color="#51465f"
          metalness={0.72}
          roughness={0.28}
        />
      </mesh>

      <mesh position={[0, 1.12, 0]}>
        <sphereGeometry args={[0.23, 20, 20]} />
        <meshStandardMaterial
          color="#ff9e42"
          emissive="#ff5a00"
          emissiveIntensity={2.4}
          toneMapped={false}
        />
      </mesh>

      <pointLight
        position={[0, 1.25, 0]}
        intensity={selected ? 4 : 2.4}
        distance={4}
        color="#ff8a32"
      />

      {[0, 1, 2, 3].map((index) => {
        const angle = index * Math.PI / 2;

        return (
          <mesh
            key={index}
            castShadow
            position={[
              Math.cos(angle) * 0.85,
              0.16,
              Math.sin(angle) * 0.85,
            ]}
            rotation={[0, -angle, 0]}
          >
            <boxGeometry args={[0.72, 0.08, 0.42]} />
            <meshStandardMaterial
              color="#241f32"
              metalness={0.82}
              roughness={0.24}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function WaterBuilding({
  selected = false,
}: {
  selected?: boolean;
}) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.78, 0.9, 0.36, 12]} />
        <meshStandardMaterial
          color="#252d38"
          metalness={0.7}
          roughness={0.32}
        />
      </mesh>

      <mesh castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.56, 0.62, 0.92, 16]} />
        <meshStandardMaterial
          color="#33485a"
          metalness={0.58}
          roughness={0.3}
        />
      </mesh>

      <mesh position={[0, 0.72, 0]}>
        <cylinderGeometry args={[0.4, 0.4, 0.72, 16]} />
        <meshStandardMaterial
          color="#53d7ff"
          transparent
          opacity={0.52}
          emissive="#007ca8"
          emissiveIntensity={1.5}
        />
      </mesh>

      <mesh castShadow position={[0, 1.22, 0]}>
        <sphereGeometry
          args={[
            0.48,
            20,
            12,
            0,
            Math.PI * 2,
            0,
            Math.PI / 2,
          ]}
        />
        <meshStandardMaterial
          color="#6f8798"
          metalness={0.66}
          roughness={0.26}
        />
      </mesh>

      <pointLight
        position={[0, 1.0, 0]}
        intensity={selected ? 3.5 : 1.8}
        distance={4}
        color="#46d9ff"
      />
    </group>
  );
}

function ScienceBuilding({
  selected = false,
}: {
  selected?: boolean;
}) {
  return (
    <group>
      <mesh castShadow receiveShadow position={[0, 0.18, 0]}>
        <cylinderGeometry args={[0.82, 0.92, 0.36, 6]} />
        <meshStandardMaterial
          color="#282631"
          metalness={0.72}
          roughness={0.3}
        />
      </mesh>

      <mesh castShadow position={[0, 0.7, 0]}>
        <cylinderGeometry args={[0.5, 0.66, 0.9, 6]} />
        <meshStandardMaterial
          color="#4d435d"
          metalness={0.62}
          roughness={0.28}
        />
      </mesh>

      <mesh position={[0, 1.2, 0]}>
        <octahedronGeometry args={[0.34, 0]} />
        <meshStandardMaterial
          color="#d28cff"
          emissive="#7c20c8"
          emissiveIntensity={2.3}
          metalness={0.35}
          roughness={0.2}
        />
      </mesh>

      <mesh
        castShadow
        position={[0.7, 0.72, 0]}
        rotation={[0, 0, -0.38]}
      >
        <cylinderGeometry args={[0.055, 0.055, 1.15, 8]} />
        <meshStandardMaterial
          color="#9c91a8"
          metalness={0.9}
          roughness={0.2}
        />
      </mesh>

      <mesh
        position={[0.88, 1.22, 0]}
        rotation={[0, 0, -0.35]}
      >
        <cylinderGeometry args={[0.28, 0.28, 0.05, 20]} />
        <meshStandardMaterial
          color="#d7d0df"
          metalness={0.8}
          roughness={0.2}
          side={THREE.DoubleSide}
        />
      </mesh>

      <pointLight
        position={[0, 1.35, 0]}
        intensity={selected ? 4 : 2}
        distance={4}
        color="#c56dff"
      />
    </group>
  );
}

export default function MarsColonyBuildingModel({
  buildingKey,
  selected = false,
  preview = false,
}: Props) {
  const asset =
    getMarsBuildingAsset(
      buildingKey,
    );

  const key =
    buildingKey.toLowerCase();

  const usesKayKitComplex =
    key.includes("energy") ||
    key.includes("water") ||
    key.includes("science");

  if (usesKayKitComplex) {
    return (
      <MarsKayKitBuilding
        buildingKey={
          buildingKey
        }
        preview={preview}
      />
    );
  }

  if (
    asset.available &&
    asset.modelPath
  ) {
    return (
      <Suspense fallback={null}>
        <group
          scale={
            preview
              ? 0.96
              : 1
          }
        >
          <LoadedMarsBuilding
            modelPath={
              asset.modelPath
            }
            scale={
              asset.scale
            }
            positionY={
              asset.positionY
            }
            rotationY={
              asset.rotationY
            }
          />
        </group>
      </Suspense>
    );
  }

  /*
   * Temporary fallback.
   *
   * Final production visuals must come from registered GLB
   * assets. This keeps placement usable until each asset
   * is installed.
   */
  return (
    <group
      scale={
        preview
          ? 0.96
          : 1
      }
    >
      {key.includes("energy") && (
        <EnergyBuilding
          selected={selected}
        />
      )}

      {key.includes("water") && (
        <WaterBuilding
          selected={selected}
        />
      )}

      {key.includes("science") && (
        <ScienceBuilding
          selected={selected}
        />
      )}

      {!key.includes("energy") &&
        !key.includes("water") &&
        !key.includes("science") && (
          <group>
            <mesh
              castShadow
              receiveShadow
              position={[
                0,
                0.32,
                0,
              ]}
            >
              <cylinderGeometry
                args={[
                  0.72,
                  0.82,
                  0.64,
                  8,
                ]}
              />

              <meshStandardMaterial
                color="#60536c"
                metalness={0.62}
                roughness={0.34}
              />
            </mesh>

            <mesh
              position={[
                0,
                0.82,
                0,
              ]}
            >
              <sphereGeometry
                args={[
                  0.18,
                  16,
                  16,
                ]}
              />

              <meshStandardMaterial
                color="#d28cff"
                emissive="#7022a4"
                emissiveIntensity={1.4}
              />
            </mesh>
          </group>
        )}
    </group>
  );
}
