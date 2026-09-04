import {
  useEffect,
  useMemo,
  useRef,
} from "react";
import {
  ClampToEdgeWrapping,
  Color,
  DataTexture,
  NearestFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
  ShaderMaterial,
  Vector2,
  Vector4,
} from "three";
import {
  useFrame,
} from "@react-three/fiber";
import type {
  ThreeEvent,
} from "@react-three/fiber";
import type {
  MarsPixelPublicAllocation,
  MarsPixelPublicReservedZone,
} from "../MarsPixelNetworkService";

import {
  MARS_PIXEL_SALE_BLOCK_SIZE,
  marsPixelToBlockCoordinateV1,
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
  reservedZones: MarsPixelPublicReservedZone[];
  visible: boolean;
  aresMapX?: number | null;
  aresMapY?: number | null;
  onAresSelect?: () => void;
  selectedPixel?: MarsPixelCoordinate | null;
  lockedSelectionPixel?: MarsPixelCoordinate | null;
  territorySelectionColor?: [number, number, number] | null;
  onPixelSelect?: (
    coordinate: MarsPixelCoordinate,
    allocation: MarsPixelPublicAllocation | null,
  ) => void;
  onPixelDragStart?: (
    anchor: MarsPixelCoordinate,
  ) => void;
  onPixelDragSelect?: (
    anchor: MarsPixelCoordinate,
    target: MarsPixelCoordinate,
  ) => void;
  onDragStateChange?: (
    dragging: boolean,
  ) => void;
  onPixelHover?: (
    coordinate: {
      x: number;
      y: number;
      blockX: number;
      blockY: number;
    } | null,
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
  reservedZones,
  visible,
  aresMapX = null,
  aresMapY = null,
  onAresSelect,
  selectedPixel = null,
  lockedSelectionPixel = null,
  territorySelectionColor = null,
  onPixelSelect,
  onPixelDragStart,
  onPixelDragSelect,
  onDragStateChange,
  onPixelHover,
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

  const blockStatusTexture = useMemo(() => {
    const blockWidth =
      Math.ceil(
        gridWidth /
          MARS_PIXEL_SALE_BLOCK_SIZE,
      );

    const blockHeight =
      Math.ceil(
        gridHeight /
          MARS_PIXEL_SALE_BLOCK_SIZE,
      );

    const data = new Uint8Array(
      blockWidth * blockHeight * 4,
    );

    const paintRegion = (
      xStart: number,
      yStart: number,
      width: number,
      height: number,
      status: number,
    ) => {
      if (
        width <= 0 ||
        height <= 0
      ) {
        return;
      }

      const xEnd =
        Math.min(
          gridWidth - 1,
          xStart + width - 1,
        );

      const yEnd =
        Math.min(
          gridHeight - 1,
          yStart + height - 1,
        );

      const blockXStart =
        Math.max(
          0,
          Math.floor(
            xStart /
              MARS_PIXEL_SALE_BLOCK_SIZE,
          ),
        );

      const blockYStart =
        Math.max(
          0,
          Math.floor(
            yStart /
              MARS_PIXEL_SALE_BLOCK_SIZE,
          ),
        );

      const blockXEnd =
        Math.min(
          blockWidth - 1,
          Math.floor(
            xEnd /
              MARS_PIXEL_SALE_BLOCK_SIZE,
          ),
        );

      const blockYEnd =
        Math.min(
          blockHeight - 1,
          Math.floor(
            yEnd /
              MARS_PIXEL_SALE_BLOCK_SIZE,
          ),
        );

      for (
        let blockY = blockYStart;
        blockY <= blockYEnd;
        blockY += 1
      ) {
        for (
          let blockX = blockXStart;
          blockX <= blockXEnd;
          blockX += 1
        ) {
          const textureY =
            blockHeight -
            1 -
            blockY;

          const offset =
            (
              textureY * blockWidth +
              blockX
            ) * 4;

          data[offset] = status;
          data[offset + 1] = 0;
          data[offset + 2] = 0;
          data[offset + 3] = 255;
        }
      }
    };

    for (const allocation of allocations) {
      paintRegion(
        allocation.x_start,
        allocation.y_start,
        allocation.width,
        allocation.height,
        2,
      );
    }

    for (const zone of reservedZones) {
      paintRegion(
        zone.x_start,
        zone.y_start,
        zone.width,
        zone.height,
        1,
      );
    }

    const nextTexture = new DataTexture(
      data,
      blockWidth,
      blockHeight,
      RGBAFormat,
      UnsignedByteType,
    );

    nextTexture.wrapS = ClampToEdgeWrapping;
    nextTexture.wrapT = ClampToEdgeWrapping;
    nextTexture.magFilter = NearestFilter;
    nextTexture.minFilter = NearestFilter;
    nextTexture.generateMipmaps = false;
    nextTexture.flipY = false;
    nextTexture.needsUpdate = true;

    return nextTexture;
  }, [
    allocations,
    gridHeight,
    gridWidth,
    reservedZones,
  ]);

  useEffect(
    () => () => {
      blockStatusTexture.dispose();
    },
    [blockStatusTexture],
  );

  const aresPixelRegion = useMemo(
    () => ({
      xStart: 520,
      yStart: 370,
      xEnd: 529,
      yEnd: 379,
    }),
    [],
  );

  const materialRef =
    useRef<ShaderMaterial | null>(null);

  const dragStartRef =
    useRef<MarsPixelCoordinate | null>(null);

  const dragCurrentRef =
    useRef<MarsPixelCoordinate | null>(null);

  const dragPointerIdRef =
    useRef<number | null>(null);

  const dragMovedRef =
    useRef(false);

  const selectedBlock = useMemo(
    () =>
      selectedPixel
        ? marsPixelToBlockCoordinateV1(
            selectedPixel.x,
            selectedPixel.y,
          )
        : null,
    [selectedPixel],
  );

  const lockedSelectionBlock = useMemo(
    () =>
      lockedSelectionPixel
        ? marsPixelToBlockCoordinateV1(
            lockedSelectionPixel.x,
            lockedSelectionPixel.y,
          )
        : null,
    [lockedSelectionPixel],
  );

  useEffect(() => {
    const material = materialRef.current;

    if (!material) {
      return;
    }

    material.uniforms.selectedBlock.value.set(
      selectedBlock?.blockX ?? -1,
      selectedBlock?.blockY ?? -1,
    );
  }, [selectedBlock]);

  useEffect(() => {
    const material = materialRef.current;

    if (!material) {
      return;
    }

    material.uniforms.lockedSelectionBlock.value.set(
      lockedSelectionBlock?.blockX ?? -1,
      lockedSelectionBlock?.blockY ?? -1,
    );
  }, [lockedSelectionBlock]);

  useEffect(() => {
    const material = materialRef.current;

    if (!material) {
      return;
    }

    const color =
      territorySelectionColor ?? [0.08, 0.92, 1.0];

    material.uniforms.territorySelectionColor.value.set(
      color[0],
      color[1],
      color[2],
    );

    material.uniforms.useTerritorySelectionColor.value =
      territorySelectionColor ? 1 : 0;
  }, [territorySelectionColor]);

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

    material.uniforms.time.value =
      performance.now() * 0.001;
  });

  if (
    !visible ||
    gridVersion !== 1
  ) {
    return null;
  }

  return (
    <mesh
      onPointerMove={(
        event: ThreeEvent<PointerEvent>,
      ) => {
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

        const block =
          marsPixelToBlockCoordinateV1(
            coordinate.x,
            coordinate.y,
          );

        materialRef.current?.uniforms.hoveredBlock.value.set(
          block.blockX,
          block.blockY,
        );

        materialRef.current?.uniforms.selectionHoverBlock.value.set(
          block.blockX,
          block.blockY,
        );

        if (
          dragStartRef.current &&
          dragPointerIdRef.current === event.pointerId
        ) {
          dragCurrentRef.current = coordinate;

          if (
            coordinate.x !== dragStartRef.current.x ||
            coordinate.y !== dragStartRef.current.y
          ) {
            dragMovedRef.current = true;
          }
        }

        onPixelHover?.({
          x: coordinate.x,
          y: coordinate.y,
          blockX: block.blockX,
          blockY: block.blockY,
        });
      }}
      onPointerOut={() => {
        materialRef.current?.uniforms.hoveredBlock.value.set(
          -1,
          -1,
        );

        materialRef.current?.uniforms.selectionHoverBlock.value.set(
          -1,
          -1,
        );

        onPixelHover?.(null);
      }}
      onPointerDown={(
        event: ThreeEvent<PointerEvent>,
      ) => {
        if (
          event.button !== 0 ||
          !onPixelSelect
        ) {
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

        dragStartRef.current = coordinate;
        dragCurrentRef.current = coordinate;
        dragPointerIdRef.current = event.pointerId;
        dragMovedRef.current = false;

        onPixelDragStart?.(coordinate);
        onDragStateChange?.(true);

        const target =
          event.target as EventTarget & {
            setPointerCapture?: (
              pointerId: number,
            ) => void;
          };

        target.setPointerCapture?.(
          event.pointerId,
        );
      }}
      onPointerUp={(
        event: ThreeEvent<PointerEvent>,
      ) => {
        if (
          event.button !== 0 ||
          !onPixelSelect ||
          dragPointerIdRef.current !==
            event.pointerId
        ) {
          return;
        }

        event.stopPropagation();

        const start =
          dragStartRef.current;

        const uv = event.uv;

        const end =
          uv
            ? marsUvToPixelCoordinateV1(
                uv.x,
                uv.y,
                gridWidth,
                gridHeight,
              )
            : dragCurrentRef.current;

        const moved =
          dragMovedRef.current;

        dragStartRef.current = null;
        dragCurrentRef.current = null;
        dragPointerIdRef.current = null;
        dragMovedRef.current = false;

        onDragStateChange?.(false);

        const target =
          event.target as EventTarget & {
            releasePointerCapture?: (
              pointerId: number,
            ) => void;
          };

        target.releasePointerCapture?.(
          event.pointerId,
        );

        if (!start || !end) {
          return;
        }

        if (
          !moved &&
          onAresSelect &&
          start.x >= aresPixelRegion.xStart &&
          start.x <= aresPixelRegion.xEnd &&
          start.y >= aresPixelRegion.yStart &&
          start.y <= aresPixelRegion.yEnd
        ) {
          onAresSelect();
          return;
        }

        if (!moved) {
          const allocation =
            allocations.find((candidate) =>
              containsCoordinate(
                candidate,
                start,
              ),
            ) ?? null;

          onPixelSelect(
            start,
            allocation,
          );

          return;
        }

        onPixelDragSelect?.(
          start,
          end,
        );
      }}
      onPointerCancel={(
        event: ThreeEvent<PointerEvent>,
      ) => {
        if (
          dragPointerIdRef.current !==
          event.pointerId
        ) {
          return;
        }

        dragStartRef.current = null;
        dragCurrentRef.current = null;
        dragPointerIdRef.current = null;
        dragMovedRef.current = false;

        onDragStateChange?.(false);
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
          blockStatusTexture: {
            value: blockStatusTexture,
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
          time: {
            value: 0,
          },
          aresPixelRegion: {
            value: new Vector4(
              aresPixelRegion.xStart,
              aresPixelRegion.yStart,
              aresPixelRegion.xEnd,
              aresPixelRegion.yEnd,
            ),
          },

          hoveredBlock: {
            value: new Vector2(-1, -1),
          },
          selectedBlock: {
            value: new Vector2(
              selectedBlock?.blockX ?? -1,
              selectedBlock?.blockY ?? -1,
            ),
          },
          selectionHoverBlock: {
            value: new Vector2(-1, -1),
          },
          lockedSelectionBlock: {
            value: new Vector2(
              lockedSelectionBlock?.blockX ?? -1,
              lockedSelectionBlock?.blockY ?? -1,
            ),
          },
          saleBlockSize: {
            value: MARS_PIXEL_SALE_BLOCK_SIZE,
          },
          territorySelectionColor: {
            value: new Color(0.08, 0.92, 1.0),
          },
          useTerritorySelectionColor: {
            value: 0,
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
          uniform sampler2D blockStatusTexture;
          uniform vec2 gridSize;
          uniform float cameraDistance;
          uniform float time;
          uniform vec4 aresPixelRegion;
          uniform vec2 hoveredBlock;
          uniform vec2 selectedBlock;
          uniform vec2 selectionHoverBlock;
          uniform vec2 lockedSelectionBlock;
          uniform float saleBlockSize;
          uniform vec3 territorySelectionColor;
          uniform float useTerritorySelectionColor;

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
                1.0 - vUv.y
              );

            float overviewFactor =
              1.0 -
              smoothstep(
                6.2,
                7.8,
                cameraDistance
              );

            float regionalFactor =
              1.0 -
              smoothstep(
                5.0,
                6.5,
                cameraDistance
              );

            float pixelFactor =
              1.0 -
              smoothstep(
                3.75,
                5.15,
                cameraDistance
              );

            float majorGrid =
              gridLayer(
                canonicalUv,
                vec2(20.0),
                0.010
              ) *
              overviewFactor;

            float regionalGrid =
              gridLayer(
                canonicalUv,
                vec2(100.0),
                0.014
              ) *
              regionalFactor;

            float pixelGrid =
              gridLayer(
                canonicalUv,
                gridSize,
                0.050
              ) *
              pixelFactor;

            float gridAlpha =
              max(
                majorGrid * 0.075,
                max(
                  regionalGrid * 0.060,
                  pixelGrid * 0.032
                )
              );

            vec2 aresPixelCoord =
              floor(
                canonicalUv * gridSize
              );

            float isAresCell =
              step(
                aresPixelRegion.x,
                aresPixelCoord.x
              ) *
              step(
                aresPixelCoord.x,
                aresPixelRegion.z
              ) *
              step(
                aresPixelRegion.y,
                aresPixelCoord.y
              ) *
              step(
                aresPixelCoord.y,
                aresPixelRegion.w
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

            vec2 pixelCoord =
              floor(
                canonicalUv * gridSize
              );

            vec2 currentBlock =
              floor(
                pixelCoord / saleBlockSize
              );

            vec2 blockLocal =
              fract(
                pixelCoord / saleBlockSize
              );

            float blockEdgeDistance =
              min(
                min(
                  blockLocal.x,
                  1.0 - blockLocal.x
                ),
                min(
                  blockLocal.y,
                  1.0 - blockLocal.y
                )
              );

            float blockBorder =
              1.0 -
              smoothstep(
                0.08,
                0.16,
                blockEdgeDistance
              );

            float isHovered =
              step(
                length(
                  currentBlock -
                  hoveredBlock
                ),
                0.01
              ) *
              step(
                0.0,
                hoveredBlock.x
              );

            float isSelected =
              step(
                length(
                  currentBlock -
                  selectedBlock
                ),
                0.01
              ) *
              step(
                0.0,
                selectedBlock.x
              );

            float hasLockedSelection =
              step(
                0.0,
                lockedSelectionBlock.x
              ) *
              step(
                0.0,
                lockedSelectionBlock.y
              );

            vec2 activeSelectionTarget =
              mix(
                selectionHoverBlock,
                lockedSelectionBlock,
                hasLockedSelection
              );

            float hasSelectionPreview =
              step(
                0.0,
                selectedBlock.x
              ) *
              step(
                0.0,
                activeSelectionTarget.x
              );

            vec2 selectionMin =
              min(
                selectedBlock,
                activeSelectionTarget
              );

            vec2 selectionMax =
              max(
                selectedBlock,
                activeSelectionTarget
              );

            float insideSelectionX =
              step(
                selectionMin.x,
                currentBlock.x
              ) *
              step(
                currentBlock.x,
                selectionMax.x
              );

            float insideSelectionY =
              step(
                selectionMin.y,
                currentBlock.y
              ) *
              step(
                currentBlock.y,
                selectionMax.y
              );

            float isSelectionPreview =
              hasSelectionPreview *
              insideSelectionX *
              insideSelectionY;

            float selectionOuterBorder =
              isSelectionPreview *
              max(
                max(
                  step(
                    abs(
                      currentBlock.x -
                      selectionMin.x
                    ),
                    0.01
                  ),
                  step(
                    abs(
                      currentBlock.x -
                      selectionMax.x
                    ),
                    0.01
                  )
                ),
                max(
                  step(
                    abs(
                      currentBlock.y -
                      selectionMin.y
                    ),
                    0.01
                  ),
                  step(
                    abs(
                      currentBlock.y -
                      selectionMax.y
                    ),
                    0.01
                  )
                )
              ) *
              blockBorder;

            vec2 blockTextureSize =
              gridSize / saleBlockSize;

            vec2 blockStatusUv =
              (
                currentBlock +
                vec2(0.5)
              ) /
              blockTextureSize;

            blockStatusUv.y =
              1.0 - blockStatusUv.y;

            float blockStatus =
              texture2D(
                blockStatusTexture,
                blockStatusUv
              ).r * 255.0;

            float isReserved =
              1.0 -
              step(
                0.5,
                abs(blockStatus - 1.0)
              );

            float isOwned =
              1.0 -
              step(
                0.5,
                abs(blockStatus - 2.0)
              );

            float isAvailable =
              1.0 -
              max(
                isReserved,
                isOwned
              );

            float availablePulse =
              0.82 +
              sin(time * 1.65) * 0.18;

            float reservedPulse =
              0.78 +
              sin(time * 3.4) * 0.22;

            float ownedPulse =
              0.84 +
              sin(time * 2.15) * 0.16;

            vec3 availableFill =
              vec3(
                0.0,
                0.96,
                1.0
              );

            vec3 availableEdge =
              vec3(
                0.0,
                1.0,
                0.53
              );

            vec3 reservedFill =
              vec3(
                1.0,
                0.06,
                0.14
              );

            vec3 reservedEdge =
              vec3(
                1.0,
                0.38,
                0.0
              );

            vec3 ownedFill =
              vec3(
                0.54,
                0.16,
                0.89
              );

            vec3 ownedEdge =
              vec3(
                1.0,
                0.72,
                0.08
              );

            vec3 statusFill =
              availableFill * isAvailable +
              reservedFill * isReserved +
              ownedFill * isOwned;

            vec3 statusEdge =
              availableEdge * isAvailable +
              reservedEdge * isReserved +
              ownedEdge * isOwned;

            float statusPulse =
              availablePulse * isAvailable +
              reservedPulse * isReserved +
              ownedPulse * isOwned;

            vec3 hoverColor =
              mix(
                statusFill,
                statusEdge,
                blockBorder * 0.82
              );

            vec3 selectedColor =
              mix(
                statusFill,
                statusEdge,
                blockBorder * 0.94
              );

            finalColor =
              mix(
                finalColor,
                hoverColor,
                isHovered *
                  statusPulse *
                  (
                    0.14 +
                    blockBorder * 0.76
                  )
              );

            finalColor =
              mix(
                finalColor,
                selectedColor,
                isSelected *
                  (
                    0.18 +
                    blockBorder * 0.88
                  )
              );

            vec3 defaultSelectionPreviewColor =
              vec3(
                0.08,
                0.92,
                1.0
              );

            vec3 selectionPreviewColor =
              mix(
                defaultSelectionPreviewColor,
                territorySelectionColor,
                useTerritorySelectionColor *
                  hasLockedSelection
              );

            finalColor =
              mix(
                finalColor,
                selectionPreviewColor,
                isSelectionPreview *
                  (
                    0.34 +
                    selectionOuterBorder * 0.54
                  )
              );

            float interactionAlpha =
              max(
                isHovered *
                  (
                    0.18 +
                    blockBorder * 0.72
                  ),
                max(
                  isSelected *
                    (
                      0.16 +
                      blockBorder * 0.82
                    ),
                  isSelectionPreview *
                    (
                      0.36 +
                      selectionOuterBorder * 0.50
                    )
                )
              );

            float finalAlpha =
              max(
                max(
                  max(
                    gridAlpha,
                    allocation.a
                  ),
                  isAresCell * 0.58
                ),
                interactionAlpha
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
