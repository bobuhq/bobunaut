import {
  useGLTF,
} from "@react-three/drei";

import * as THREE from "three";

type Piece = {
  path: string;
  position?: [
    number,
    number,
    number,
  ];
  rotationY?: number;
  scale?: number;
};

type Props = {
  buildingKey: string;
  preview?: boolean;
};

const BASE =
  "/models/mars/buildings/kaykit";

function AssetPiece({
  path,
  position = [0, 0, 0],
  rotationY = 0,
  scale = 1,
}: Piece) {
  const gltf =
    useGLTF(
      `${BASE}/${path}`,
    );

  const scene =
    gltf.scene.clone(true);

  scene.traverse((object) => {
    if (
      object instanceof
      THREE.Mesh
    ) {
      object.castShadow = true;
      object.receiveShadow = true;
    }
  });

  return (
    <primitive
      object={scene}
      position={position}
      rotation={[
        0,
        THREE.MathUtils.degToRad(
          rotationY,
        ),
        0,
      ]}
      scale={scale}
    />
  );
}

function ReactorCrystal({
  position,
  scale = 1,
  rotationZ = 0,
}: {
  position: [number, number, number];
  scale?: number;
  rotationZ?: number;
}) {
  return (
    <group
      position={position}
      scale={scale}
      rotation={[0, 0, rotationZ]}
    >
      <mesh castShadow>
        <octahedronGeometry args={[0.28, 0]} />

        <meshStandardMaterial
          color="#d47cff"
          emissive="#831fe4"
          emissiveIntensity={3.2}
          metalness={0.28}
          roughness={0.16}
        />
      </mesh>

      <pointLight
        intensity={1.8}
        distance={2.2}
        color="#bd5cff"
      />
    </group>
  );
}


function BobuCrystalReactor() {
  return (
    <group>
      <mesh
        position={[0, 0.72, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry
          args={[0.72, 0.075, 12, 48]}
        />

        <meshStandardMaterial
          color="#a840ff"
          emissive="#6817b8"
          emissiveIntensity={2.25}
          metalness={0.76}
          roughness={0.18}
        />
      </mesh>

      <mesh
        position={[0, 0.72, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      >
        <torusGeometry
          args={[0.48, 0.035, 10, 40]}
        />

        <meshStandardMaterial
          color="#edb4ff"
          emissive="#ad43ff"
          emissiveIntensity={3}
          metalness={0.48}
          roughness={0.12}
        />
      </mesh>

      <mesh
        castShadow
        position={[0, 0.57, 0]}
      >
        <cylinderGeometry
          args={[0.42, 0.54, 0.3, 12]}
        />

        <meshStandardMaterial
          color="#17121d"
          metalness={0.86}
          roughness={0.2}
        />
      </mesh>

      <group
        position={[0, 1.2, 0]}
        scale={[0.82, 1.65, 0.82]}
      >
        <mesh castShadow>
          <octahedronGeometry args={[0.42, 0]} />

          <meshStandardMaterial
            color="#db83ff"
            emissive="#821be0"
            emissiveIntensity={3.8}
            metalness={0.24}
            roughness={0.12}
          />
        </mesh>
      </group>

      <ReactorCrystal
        position={[-0.65, 0.92, 0]}
        scale={0.62}
        rotationZ={0.18}
      />

      <ReactorCrystal
        position={[0.65, 0.92, 0]}
        scale={0.62}
        rotationZ={-0.18}
      />

      <ReactorCrystal
        position={[0, 0.92, -0.65]}
        scale={0.62}
        rotationZ={0.12}
      />

      <ReactorCrystal
        position={[0, 0.92, 0.65]}
        scale={0.62}
        rotationZ={-0.12}
      />

      <pointLight
        position={[0, 1.45, 0]}
        intensity={5}
        distance={6}
        color="#b84dff"
      />
    </group>
  );
}


function EnergyComplex() {
  const pieces: Piece[] = [
    {
      path: "basemodule_A.gltf",
    },

    {
      path: "roofmodule_base.gltf",
      position: [0, 0.02, 0],
    },
  ];

  return (
    <group>
      {pieces.map(
        (piece, index) => (
          <AssetPiece
            key={`${piece.path}:${index}`}
            {...piece}
          />
        ),
      )}

      <BobuCrystalReactor />
    </group>
  );
}


function WaterComplex() {
  const pieces: Piece[] = [
    {
      path: "basemodule_B.gltf",
    },

    {
      path: "containers_A.gltf",
      position: [-1.35, 0, 0.65],
      rotationY: 90,
    },

    {
      path: "containers_A.gltf",
      position: [1.35, 0, 0.65],
      rotationY: 90,
    },

    {
      path: "structure_low.gltf",
      position: [0, 0, -1.4],
    },
  ];

  return (
    <group>
      {pieces.map(
        (piece, index) => (
          <AssetPiece
            key={`${piece.path}:${index}`}
            {...piece}
          />
        ),
      )}

      <pointLight
        position={[0, 1.4, 0]}
        intensity={1.6}
        distance={5}
        color="#5bdfff"
      />
    </group>
  );
}

function ScienceComplex() {
  const pieces: Piece[] = [
    {
      path: "basemodule_C.gltf",
    },

    {
      path: "structure_tall.gltf",
      position: [0, 0, -1.3],
    },

    {
      path: "lights.gltf",
      position: [-1.4, 0, 0.8],
    },

    {
      path: "lights.gltf",
      position: [1.4, 0, 0.8],
      rotationY: 180,
    },
  ];

  return (
    <group>
      {pieces.map(
        (piece, index) => (
          <AssetPiece
            key={`${piece.path}:${index}`}
            {...piece}
          />
        ),
      )}

      <pointLight
        position={[0, 1.8, 0]}
        intensity={1.8}
        distance={5}
        color="#bf79ff"
      />
    </group>
  );
}

function HabitatComplex() {
  const pieces: Piece[] = [
    {
      path: "basemodule_D.gltf",
    },

    {
      path: "roofmodule_base.gltf",
      position: [0, 0.02, 0],
    },

    {
      path: "lights.gltf",
      position: [-1.15, 0, 0.65],
    },

    {
      path: "lights.gltf",
      position: [1.15, 0, 0.65],
      rotationY: 180,
    },
  ];

  return (
    <group>
      {pieces.map(
        (piece, index) => (
          <AssetPiece
            key={`${piece.path}:${index}`}
            {...piece}
          />
        ),
      )}

      <pointLight
        position={[0, 1.3, 0]}
        intensity={1.25}
        distance={4}
        color="#d6b0ff"
      />
    </group>
  );
}


export default function MarsKayKitBuilding({
  buildingKey,
  preview = false,
}: Props) {
  const key =
    buildingKey.toLowerCase();

  return (
    <group
      scale={
        preview
          ? 0.9
          : 0.94
      }
    >
      {key.includes("energy") && (
        <EnergyComplex />
      )}

      {key.includes("water") && (
        <WaterComplex />
      )}

      {key.includes("science") && (
        <ScienceComplex />
      )}

      {key.includes("habitat") && (
        <HabitatComplex />
      )}
    </group>
  );
}
