import {
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  ClampToEdgeWrapping,
  DataTexture,
  NearestFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  ShaderMaterial,
} from "three";
import {
  useFrame,
} from "@react-three/fiber";
import type {
  ThreeEvent,
} from "@react-three/fiber";
import type {
  MarsPixelPublicAllocation,
} from "../MarsPixelNetworkService";

import {
  marsPixelXToTextureXv1,
  marsPixelYToTextureYv1,
  marsUvToPixelCoordinateV1,
} from "./MarsPixelGridMapper";

import type {
  MarsPixelCoordinate,
} from "./MarsPixelGridMapper";

type MarsPixelOverlayProps = {
  radius: number;
  gridWidth: number;
  gridHeight: number;
  gridVersion: number;
  allocations: MarsPixelPublicAllocation[];
  visible: boolean;
  aresMapX?: number | null;
  aresMapY?: number | null;
  onAresEnter?: () => void;
  onPixelSelect?: (
    coordinate: MarsPixelCoordinate,
    allocation: MarsPixelPublicAllocation | null,
  ) => void;
};

function allocationColor(
  allocationId: string,
): [number, number, number, number] {
  let hash = 2166136261;

  for (let index = 0; index < allocationId.length; index += 1) {
    hash ^= allocationId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const red = 110 + ((hash >>> 16) & 0x5f);
  const green = 70 + ((hash >>> 8) & 0x6f);
  const blue = 150 + (hash & 0x69);

  return [
    Math.min(255, red),
    Math.min(255, green),
    Math.min(255, blue),
    176,
  ];
}

function containsCoordinate(
  allocation: MarsPixelPublicAllocation,
  coordinate: MarsPixelCoordinate,
) {
  return (
    coordinate.x >= allocation.x_start &&
    coordinate.x <
      allocation.x_start + allocation.width &&
    coordinate.y >= allocation.y_start &&
    coordinate.y <
      allocation.y_start + allocation.height
  );
}

export function MarsPixelOverlay({
  radius,
  gridWidth,
  gridHeight,
  gridVersion,
  allocations,
  visible,
  aresMapX = null,
  aresMapY = null,
  onAresEnter,
  onPixelSelect,
}: MarsPixelOverlayProps) {
  const texture = useMemo(() => {
    const data = new Uint8Array(
      gridWidth * gridHeight * 4,
    );

    for (const allocation of allocations) {
      const [
        red,
        green,
        blue,
        alpha,
      ] = allocationColor(
        allocation.allocation_id,
      );

      const xEnd = Math.min(
        gridWidth,
        allocation.x_start + allocation.width,
      );

      const yEnd = Math.min(
        gridHeight,
        allocation.y_start + allocation.height,
      );

      for (
        let y = Math.max(0, allocation.y_start);
        y < yEnd;
        y += 1
      ) {
        for (
          let x = Math.max(0, allocation.x_start);
          x < xEnd;
          x += 1
        ) {
          const textureX =
            marsPixelXToTextureXv1(
              x,
              gridWidth,
            );

          const textureY =
            marsPixelYToTextureYv1(
              y,
              gridHeight,
            );

          const offset =
            (
              textureY * gridWidth +
              textureX
            ) * 4;

          data[offset] = red;
          data[offset + 1] = green;
          data[offset + 2] = blue;
          data[offset + 3] = alpha;
        }
      }
    }

    const nextTexture = new DataTexture(
      data,
      gridWidth,
      gridHeight,
      RGBAFormat,
      UnsignedByteType,
    );

    nextTexture.wrapS = RepeatWrapping;
    nextTexture.wrapT = ClampToEdgeWrapping;
    nextTexture.magFilter = NearestFilter;
    nextTexture.minFilter = NearestFilter;
    nextTexture.generateMipmaps = false;
    nextTexture.flipY = false;
    nextTexture.colorSpace = SRGBColorSpace;
    nextTexture.needsUpdate = true;

    return nextTexture;
  }, [
    allocations,
    gridHeight,
    gridWidth,
  ]);

  useEffect(
    () => () => {
      texture.dispose();
    },
    [texture],
  );

  const aresMajorCell =
    useMemo(() => {
      if (
        aresMapX === null ||
        aresMapY === null
      ) {
        return null;
      }

      const clampedX =
        Math.min(
          0.999999,
          Math.max(0, aresMapX / 100),
        );

      const clampedY =
        Math.min(
          0.999999,
          Math.max(0, aresMapY / 100),
        );

      return {
        x: Math.min(
          19,
          Math.floor(clampedX * 20),
        ),
        y: Math.min(
          19,
          Math.floor(
            (1 - clampedY) * 20,
          ),
        ),
      };
    }, [
      aresMapX,
      aresMapY,
      gridHeight,
      gridWidth,
    ]);

  const materialRef =
    useRef<ShaderMaterial | null>(null);

  useFrame(({ camera }) => {
    const material =
      materialRef.current;

    if (!material) {
      return;
    }

    const distance =
      camera.position.length();

    material.uniforms.cameraDistance.value =
      distance;
  });

  if (
    !visible ||
    gridVersion !== 1
  ) {
    return null;
  }

  return (
    <mesh
      onClick={(
        event: ThreeEvent<MouseEvent>,
      ) => {
        if (!onPixelSelect) {
          return;
        }

        const uv = event.uv;

        if (!uv) {
          return;
        }

        event.stopPropagation();

        const coordinate =
          marsUvToPixelCoordinateV1(
            uv.x,
            uv.y,
            gridWidth,
            gridHeight,
          );

        if (
          aresMajorCell &&
          onAresEnter
        ) {
          const majorCellX =
            Math.floor(
              (coordinate.x / gridWidth) * 20,
            );

          const majorCellY =
            Math.floor(
              (
                1 -
                coordinate.y / gridHeight
              ) * 20,
            );

          if (
            majorCellX === aresMajorCell.x &&
            majorCellY === aresMajorCell.y
          ) {
            onAresEnter();
            return;
          }
        }

        const allocation =
          allocations.find((candidate) =>
            containsCoordinate(
              candidate,
              coordinate,
            ),
          ) ?? null;

        onPixelSelect?.(
          coordinate,
          allocation,
        );
      }}
    >
      <sphereGeometry
        args={[
          radius * 1.0015,
          96,
          96,
        ]}
      />

      <shaderMaterial
        ref={materialRef}
        uniforms={{
          allocationTexture: {
            value: texture,
          },
          gridSize: {
            value: [
              gridWidth,
              gridHeight,
            ],
          },
          cameraDistance: {
            value: 6.45,
          },
          aresMajorCell: {
            value: aresMajorCell
              ? [
                  aresMajorCell.x,
                  aresMajorCell.y,
                ]
              : [-1, -1],
          },
        }}
        vertexShader={`
          varying vec2 vUv;

          void main() {
            vUv = uv;

            gl_Position =
              projectionMatrix *
              modelViewMatrix *
              vec4(position, 1.0);
          }
        `}
        fragmentShader={`
          uniform sampler2D allocationTexture;
          uniform vec2 gridSize;
          uniform float cameraDistance;
          uniform vec2 aresMajorCell;

          varying vec2 vUv;

          float gridLayer(
            vec2 uv,
            vec2 divisions,
            float lineWidth
          ) {
            vec2 cell =
              fract(
                uv * divisions
              );

            vec2 edgeDistance =
              min(
                cell,
                1.0 - cell
              );

            return (
              1.0 -
              smoothstep(
                lineWidth,
                lineWidth * 1.8,
                min(
                  edgeDistance.x,
                  edgeDistance.y
                )
              )
            );
          }

          void main() {
            vec4 allocation =
              texture2D(
                allocationTexture,
                vUv
              );

            vec2 canonicalUv =
              vec2(
                fract(vUv.x + 0.25),
                vUv.y
              );

            float nearFactor =
              1.0 -
              smoothstep(
                3.7,
                5.1,
                cameraDistance
              );

            float mediumFactor =
              1.0 -
              smoothstep(
                4.8,
                6.6,
                cameraDistance
              );

            float majorGrid =
              gridLayer(
                canonicalUv,
                vec2(20.0),
                0.010
              );

            float mediumGrid =
              gridLayer(
                canonicalUv,
                vec2(100.0),
                0.010
              ) *
              mediumFactor;

            float pixelGrid =
              gridLayer(
                canonicalUv,
                gridSize,
                0.055
              ) *
              nearFactor;

            float gridAlpha =
              max(
                majorGrid * 0.12,
                max(
                  mediumGrid * 0.09,
                  pixelGrid * 0.07
                )
              );

            vec2 currentMajorCell =
              floor(
                canonicalUv * 20.0
              );

            float isAresCell =
              step(
                length(
                  currentMajorCell -
                  aresMajorCell
                ),
                0.01
              );

            vec3 gridColor =
              vec3(
                0.38,
                0.84,
                1.0
              );

            vec3 finalColor =
              mix(
                gridColor,
                allocation.rgb,
                allocation.a
              );

            vec3 aresColor =
              vec3(
                0.05,
                0.72,
                1.0
              );

            finalColor =
              mix(
                finalColor,
                aresColor,
                isAresCell
              );

            float finalAlpha =
              max(
                max(
                  gridAlpha,
                  allocation.a
                ),
                isAresCell * 0.58
              );

            if (
              finalAlpha <= 0.001
            ) {
              discard;
            }

            gl_FragColor =
              vec4(
                finalColor,
                finalAlpha
              );
          }
        `}
        transparent
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
