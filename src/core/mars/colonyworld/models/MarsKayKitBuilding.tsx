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

function EnergyComplex() {
  const pieces: Piece[] = [
    {
      path: "basemodule_A.gltf",
    },
    {
      path:
        "roofmodule_solarpanels.gltf",
      position: [0, 0.02, 0],
    },

    {
      path: "solarpanel.gltf",
      position: [-1.7, 0, -1.0],
      rotationY: 15,
    },
    {
      path: "solarpanel.gltf",
      position: [-1.7, 0, 0.7],
      rotationY: 15,
    },
    {
      path: "solarpanel.gltf",
      position: [1.7, 0, -1.0],
      rotationY: -15,
    },
    {
      path: "solarpanel.gltf",
      position: [1.7, 0, 0.7],
      rotationY: -15,
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
        position={[0, 1.6, 0]}
        intensity={1.8}
        distance={5}
        color="#ff9c46"
      />
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
