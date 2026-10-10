import {
  useEffect,
  useMemo,
  useRef,
  useState,
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
  Group,
  Mesh,
  BufferGeometry,
  Float32BufferAttribute,
  CanvasTexture,
  Texture,
  TextureLoader,
  Vector2,
  Vector3,
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
  recordMarsPixelAdEvent,
} from "../MarsPixelNetworkService";
import { useLanguage } from "../../language";

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

import {
  marsPixelTerritoryColorRgb,
} from "./MarsPixelTerritoryColors";
import { Html } from "@react-three/drei";

export type MarsPixelOwnerHoverPreview = {
  allocation_id: string;
  pixel_count: number;
  creative_status: string | null;
  title: string | null;
  image_url: string | null;
  destination_url: string | null;
  cta_label: string | null;
};

type MarsPixelOverlayProps = {
  radius: number;
  gridWidth: number;
  gridHeight: number;
  gridVersion: number;
  allocations: MarsPixelPublicAllocation[];
  reservedZones: MarsPixelPublicReservedZone[];
  visible: boolean;
  selectionEnabled?: boolean;
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
  ownerHoverPreview?: MarsPixelOwnerHoverPreview | null;
  onOwnedTerritoryHover?: (
    allocationId: string | null,
  ) => void;
};

function allocationColor(
  allocation: MarsPixelPublicAllocation,
): [number, number, number, number] {
  const persistedColor =
    marsPixelTerritoryColorRgb(
      allocation.color_key,
    );

  if (persistedColor) {
    return [
      persistedColor[0],
      persistedColor[1],
      persistedColor[2],
      255,
    ];
  }

  let hash = 2166136261;

  for (
    let index = 0;
    index < allocation.allocation_id.length;
    index += 1
  ) {
    hash ^=
      allocation.allocation_id.charCodeAt(index);

    hash =
      Math.imul(hash, 16777619);
  }

  const red =
    110 + ((hash >>> 16) & 0x5f);

  const green =
    70 + ((hash >>> 8) & 0x6f);

  const blue =
    150 + (hash & 0x69);

  return [
    Math.min(255, red),
    Math.min(255, green),
    Math.min(255, blue),
    255,
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
  selectionEnabled = false,
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
  ownerHoverPreview = null,
  onOwnedTerritoryHover,
}: MarsPixelOverlayProps) {
  const { t } = useLanguage();

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
        allocation,
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

  const dragPointerStartRef =
    useRef<{ x: number; y: number } | null>(null);

  const selectedBlock = useMemo(
    () =>
      selectionEnabled && selectedPixel
        ? marsPixelToBlockCoordinateV1(
            selectedPixel.x,
            selectedPixel.y,
          )
        : null,
    [selectedPixel, selectionEnabled],
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

  const reducedMotionRef = useRef(false);
  useEffect(() => {
    const preference = window.matchMedia("(prefers-reduced-motion: reduce)");
    const update = () => { reducedMotionRef.current = preference.matches; };
    update();
    preference.addEventListener("change", update);
    return () => preference.removeEventListener("change", update);
  }, []);

  const cameraDirection = useMemo(() => new Vector3(), []);
  const territoryWorldPosition = useMemo(() => new Vector3(), []);
  const territoryWorldNormal = useMemo(() => new Vector3(), []);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const projectedPosition = useMemo(() => new Vector3(), []);

  /*
   * V40 real advertising impressions.
   *
   * An active ad must remain on the camera-facing side of
   * Mars at its eligible zoom level for at least one second.
   * Each allocation is recorded once per mounted Mars view.
   */
  const impressionVisibleSinceRef =
    useRef<Record<string, number>>({});

  const impressionRecordedRef =
    useRef<Set<string>>(new Set());

  useEffect(() => {
    const resetImpressionDwell = () => {
      impressionVisibleSinceRef.current = {};
    };
    document.addEventListener("visibilitychange", resetImpressionDwell);
    return () => document.removeEventListener("visibilitychange", resetImpressionDwell);
  }, []);

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
      reducedMotionRef.current ? 0 : performance.now() * 0.001;

    // Use the surface horizon, rather than a fixed normal-dot threshold.
    // Elevated plates and DOM cards must not reveal allocations behind Mars.
    cameraDirection.copy(camera.position).normalize();
    for (const { allocation } of territoryPlates) {
      const territory = territoryPulseRefs.current[allocation.allocation_id];
      if (!territory) continue;
      const worldPosition = territory.getWorldPosition(territoryWorldPosition);
      const normal = territoryWorldNormal.copy(worldPosition).normalize();
      projectedPosition.copy(normal).multiplyScalar(radius).project(camera);
      const facing = normal.dot(camera.position) > radius;
      territory.visible = facing;
      const card = cardRefs.current[allocation.allocation_id];
      if (card) {
        card.style.display = facing && visible && gridVersion === 1 &&
          Math.abs(projectedPosition.x) <= 1 && Math.abs(projectedPosition.y) <= 1 &&
          projectedPosition.z >= -1 && projectedPosition.z <= 1 ? "" : "none";
        card.style.translate = "12px 8px";
      }
    }

    const now =
      performance.now();

    for (const allocation of allocations) {
      const allocationId =
        allocation.allocation_id;

      if (
        impressionRecordedRef.current.has(
          allocationId,
        )
      ) {
        continue;
      }

      /*
       * Public allocations without an active creative are
       * territories, not advertisements.
       */
      const hasActiveAd =
        Boolean(
          allocation.creative_title?.trim() ||
            allocation.creative_image_url?.trim() ||
            allocation.destination_url?.trim(),
        );

      if (!hasActiveAd) {
        delete impressionVisibleSinceRef.current[
          allocationId
        ];
        continue;
      }

      const pixels =
        allocation.width *
        allocation.height;

      const maxDistance =
        pixels >= 5000
          ? 9.2
          : pixels >= 1000
            ? 8.0
            : pixels >= 500
              ? 7.0
              : pixels >= 200
                ? 6.15
                : pixels >= 100
                  ? 5.65
                  : 5.25;

      const territory =
        territoryPulseRefs.current[
          allocationId
        ];

      if (
        !territory ||
        distance > maxDistance
      ) {
        delete impressionVisibleSinceRef.current[
          allocationId
        ];
        continue;
      }

      const worldPosition =
        territory.getWorldPosition(
          territoryWorldPosition,
        );

      const worldNormal =
        territoryWorldNormal.copy(worldPosition).normalize();

      const facingCamera =
        worldNormal.dot(
          cameraDirection,
        ) > 0.16;

      projectedPosition.copy(worldNormal).multiplyScalar(radius).project(camera);
      if (
        !visible || gridVersion !== 1 || document.visibilityState !== "visible" ||
        !facingCamera || worldNormal.dot(camera.position) <= radius ||
        Math.abs(projectedPosition.x) > 1 || Math.abs(projectedPosition.y) > 1 ||
        projectedPosition.z < -1 || projectedPosition.z > 1
      ) {
        delete impressionVisibleSinceRef.current[
          allocationId
        ];
        continue;
      }

      const visibleSince =
        impressionVisibleSinceRef.current[
          allocationId
        ];

      if (visibleSince === undefined) {
        impressionVisibleSinceRef.current[
          allocationId
        ] = now;
        continue;
      }

      if (now - visibleSince < 1000) {
        continue;
      }

      impressionRecordedRef.current.add(
        allocationId,
      );

      delete impressionVisibleSinceRef.current[
        allocationId
      ];

      void recordMarsPixelAdEvent(
        allocationId,
        "impression",
      );
    }
  });

  const [hoveredTerritoryId, setHoveredTerritoryId] =
    useState<string | null>(null);

  const [pinnedTerritoryId, setPinnedTerritoryId] =
    useState<string | null>(null);

  const territoryHoverLeaveTimerRef =
    useRef<number | null>(null);

  const cancelTerritoryHoverLeave = () => {
    if (territoryHoverLeaveTimerRef.current !== null) {
      window.clearTimeout(
        territoryHoverLeaveTimerRef.current,
      );
      territoryHoverLeaveTimerRef.current = null;
    }
  };

  const scheduleTerritoryHoverLeave = (
    allocationId: string,
  ) => {
    if (pinnedTerritoryId === allocationId) {
      return;
    }

    cancelTerritoryHoverLeave();

    territoryHoverLeaveTimerRef.current =
      window.setTimeout(() => {
        setHoveredTerritoryId((current) =>
          current === allocationId ? null : current,
        );
        onOwnedTerritoryHover?.(null);
        territoryHoverLeaveTimerRef.current = null;
      }, 500);
  };

  const territoryPulseRefs =
    useRef<Record<string, Group | null>>({});

  const territoryPlates = useMemo(() => allocations.map((allocation) => {
    const longitude = ((allocation.x_start + allocation.width / 2) / gridWidth - 0.5) * Math.PI * 2;
    const latitude = (0.5 - (allocation.y_start + allocation.height / 2) / gridHeight) * Math.PI;
    const position = new Vector3(
      Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude),
      Math.cos(latitude) * Math.cos(longitude),
    ).multiplyScalar(radius * 1.002);
    const rgb = allocationColor(allocation);
    return { allocation, position, color: new Color(rgb[0] / 255, rgb[1] / 255, rgb[2] / 255) };
  }), [allocations, gridWidth, gridHeight, radius]);

  if (
    !visible ||
    gridVersion !== 1
  ) {
    return null;
  }

  return (
    <>
      <mesh
      onClick={(event) => {
        if (!onPixelSelect) {
          return;
        }

        const uv = event.uv;

        if (!uv) {
          return;
        }

        const coordinate =
          marsUvToPixelCoordinateV1(
            uv.x,
            uv.y,
            gridWidth,
            gridHeight,
          );

        const allocation =
          allocations.find((candidate) =>
            containsCoordinate(
              candidate,
              coordinate,
            ),
          ) ?? null;

        /*
         * Owned Mars Pixel territories use the same direct
         * click principle as the Ares marker. They do not
         * depend on the purchase-selection drag lifecycle.
         */
        if (allocation) {
          event.stopPropagation();

          /*
           * Public Mars Pixel advertisements use one stable interaction
           * model on desktop and mobile:
           * click/tap pins the ad card until the visitor closes it.
           *
           * This keeps CTA links reachable and does not alter the
           * empty-pixel purchase-selection flow.
           */
          cancelTerritoryHoverLeave();
          setPinnedTerritoryId(allocation.allocation_id);
          setHoveredTerritoryId(allocation.allocation_id);
          onOwnedTerritoryHover?.(
            allocation.allocation_id,
          );
          return;
        }
      }}
      onPointerOver={(event) => {
        const uv = event.uv;

        if (!uv) {
          return;
        }

        const coordinate =
          marsUvToPixelCoordinateV1(
            uv.x,
            uv.y,
            gridWidth,
            gridHeight,
          );

        const allocation =
          allocations.find((candidate) =>
            containsCoordinate(
              candidate,
              coordinate,
            ),
          );

        if (allocation) {
          document.body.style.cursor =
            "pointer";
        }
      }}
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

        const hoveredAllocation =
          allocations.find((candidate) =>
            containsCoordinate(
              candidate,
              coordinate,
            ),
          );

        document.body.style.cursor =
          hoveredAllocation
            ? "pointer"
            : "";

        const block =
          marsPixelToBlockCoordinateV1(
            coordinate.x,
            coordinate.y,
          );

        materialRef.current?.uniforms.hoveredBlock.value.set(
          block.blockX,
          block.blockY,
        );

        if (selectionEnabled) {
          materialRef.current?.uniforms.selectionHoverBlock.value.set(
            block.blockX,
            block.blockY,
          );
        } else {
          materialRef.current?.uniforms.selectionHoverBlock.value.set(
            -1,
            -1,
          );
        }

        if (
          dragStartRef.current &&
          dragPointerIdRef.current === event.pointerId
        ) {
          dragCurrentRef.current = coordinate;

          const pointerStart =
            dragPointerStartRef.current;

          if (pointerStart) {
            const deltaX =
              event.clientX - pointerStart.x;

            const deltaY =
              event.clientY - pointerStart.y;

            // A tiny hand/mouse movement must still count as a click.
            // The 1000x1000 Mars grid is far too sensitive to use
            // territory-coordinate changes as the drag threshold.
            if (
              deltaX * deltaX +
                deltaY * deltaY >=
              36
            ) {
              dragMovedRef.current = true;
            }
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
        document.body.style.cursor = "";

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
        dragPointerStartRef.current = {
          x: event.clientX,
          y: event.clientY,
        };

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
        dragPointerStartRef.current = null;

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

        if (!moved) {
          // Use the actual pointer-up coordinate for click hit testing.
          // Pointer capture can make the pointer-down coordinate stale,
          // especially on small owned Mars Pixel territories.
          const clickCoordinate = end;

          const allocation =
            allocations.find((candidate) =>
              containsCoordinate(
                candidate,
                clickCoordinate,
              ),
            ) ?? null;

          // Existing Mars Pixel ownership has click priority.
          if (allocation) {
            onPixelSelect(
              clickCoordinate,
              allocation,
            );
            return;
          }

          if (
            onAresSelect &&
            clickCoordinate.x >= aresPixelRegion.xStart &&
            clickCoordinate.x <= aresPixelRegion.xEnd &&
            clickCoordinate.y >= aresPixelRegion.yStart &&
            clickCoordinate.y <= aresPixelRegion.yEnd
          ) {
            onAresSelect();
            return;
          }

          onPixelSelect(
            clickCoordinate,
            null,
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
        dragPointerStartRef.current = null;

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

            vec3 vividAllocationColor =
              min(
                vec3(1.0),
                allocation.rgb * 1.30 +
                allocation.rgb * allocation.rgb * 0.18
              );

            vec3 finalColor =
              mix(
                gridColor,
                vividAllocationColor,
                step(0.01, allocation.a)
              );

            // Ares remains an interactive navigation region,
            // but it must not paint a cyan territory over Mars.
            // Ownership and Mars Pixel territory colors are rendered
            // independently below.

            vec2 allocationTexel =
              vec2(
                1.0 / gridSize.x,
                1.0 / gridSize.y
              );

            vec4 allocationLeft =
              texture2D(
                allocationTexture,
                vUv - vec2(allocationTexel.x, 0.0)
              );

            vec4 allocationRight =
              texture2D(
                allocationTexture,
                vUv + vec2(allocationTexel.x, 0.0)
              );

            vec4 allocationUp =
              texture2D(
                allocationTexture,
                vUv + vec2(0.0, allocationTexel.y)
              );

            vec4 allocationDown =
              texture2D(
                allocationTexture,
                vUv - vec2(0.0, allocationTexel.y)
              );

            vec4 allocationLeft2 =
              texture2D(
                allocationTexture,
                vUv - vec2(allocationTexel.x * 2.0, 0.0)
              );

            vec4 allocationRight2 =
              texture2D(
                allocationTexture,
                vUv + vec2(allocationTexel.x * 2.0, 0.0)
              );

            vec4 allocationUp2 =
              texture2D(
                allocationTexture,
                vUv + vec2(0.0, allocationTexel.y * 2.0)
              );

            vec4 allocationDown2 =
              texture2D(
                allocationTexture,
                vUv - vec2(0.0, allocationTexel.y * 2.0)
              );

            float hasAllocation =
              step(0.01, allocation.a);

            float allocationEdge =
              hasAllocation *
              max(
                max(
                  step(
                    0.04,
                    abs(allocation.a - allocationLeft.a) +
                    distance(allocation.rgb, allocationLeft.rgb)
                  ),
                  step(
                    0.04,
                    abs(allocation.a - allocationRight.a) +
                    distance(allocation.rgb, allocationRight.rgb)
                  )
                ),
                max(
                  step(
                    0.04,
                    abs(allocation.a - allocationUp.a) +
                    distance(allocation.rgb, allocationUp.rgb)
                  ),
                  step(
                    0.04,
                    abs(allocation.a - allocationDown.a) +
                    distance(allocation.rgb, allocationDown.rgb)
                  )
                )
              );

            float allocationGlow =
              hasAllocation *
              max(
                max(
                  step(
                    0.04,
                    abs(allocation.a - allocationLeft2.a) +
                    distance(allocation.rgb, allocationLeft2.rgb)
                  ),
                  step(
                    0.04,
                    abs(allocation.a - allocationRight2.a) +
                    distance(allocation.rgb, allocationRight2.rgb)
                  )
                ),
                max(
                  step(
                    0.04,
                    abs(allocation.a - allocationUp2.a) +
                    distance(allocation.rgb, allocationUp2.rgb)
                  ),
                  step(
                    0.04,
                    abs(allocation.a - allocationDown2.a) +
                    distance(allocation.rgb, allocationDown2.rgb)
                  )
                )
              );

            float territoryPulse =
              0.90 +
              sin(time * 1.55) * 0.10;

            vec3 territoryEdgeColor =
              min(
                vec3(1.0),
                vividAllocationColor * 1.65 +
                allocation.rgb * 0.35
              );

            // Owned territory behaves visually as one luminous plate.
            // Preserve the purchased color while giving the entire area
            // a bright raised-energy appearance.
            vec3 territoryCoreColor =
              min(
                vec3(1.0),
                vividAllocationColor *
                  (
                    1.18 +
                    territoryPulse * 0.24
                  )
              );

            vec3 territoryPlateColor =
              min(
                vec3(1.0),
                territoryCoreColor * 1.08 +
                vividAllocationColor *
                  vividAllocationColor * 0.18
              );

            finalColor =
              mix(
                finalColor,
                territoryPlateColor,
                hasAllocation * 0.97
              );

            vec4 allocationLeft4 =
              texture2D(
                allocationTexture,
                vUv - vec2(allocationTexel.x * 4.0, 0.0)
              );

            vec4 allocationRight4 =
              texture2D(
                allocationTexture,
                vUv + vec2(allocationTexel.x * 4.0, 0.0)
              );

            vec4 allocationUp4 =
              texture2D(
                allocationTexture,
                vUv + vec2(0.0, allocationTexel.y * 4.0)
              );

            vec4 allocationDown4 =
              texture2D(
                allocationTexture,
                vUv - vec2(0.0, allocationTexel.y * 4.0)
              );

            vec4 allocationLeft8 =
              texture2D(
                allocationTexture,
                vUv - vec2(allocationTexel.x * 8.0, 0.0)
              );

            vec4 allocationRight8 =
              texture2D(
                allocationTexture,
                vUv + vec2(allocationTexel.x * 8.0, 0.0)
              );

            vec4 allocationUp8 =
              texture2D(
                allocationTexture,
                vUv + vec2(0.0, allocationTexel.y * 8.0)
              );

            vec4 allocationDown8 =
              texture2D(
                allocationTexture,
                vUv - vec2(0.0, allocationTexel.y * 8.0)
              );

            float nearWeight =
              allocationLeft.a +
              allocationRight.a +
              allocationUp.a +
              allocationDown.a;

            float midWeight =
              allocationLeft2.a +
              allocationRight2.a +
              allocationUp2.a +
              allocationDown2.a;

            float farWeight =
              allocationLeft4.a +
              allocationRight4.a +
              allocationUp4.a +
              allocationDown4.a;

            float wideWeight =
              allocationLeft8.a +
              allocationRight8.a +
              allocationUp8.a +
              allocationDown8.a;

            vec3 nearColor =
              (
                allocationLeft.rgb * allocationLeft.a +
                allocationRight.rgb * allocationRight.a +
                allocationUp.rgb * allocationUp.a +
                allocationDown.rgb * allocationDown.a
              ) /
              max(nearWeight, 0.001);

            vec3 midColor =
              (
                allocationLeft2.rgb * allocationLeft2.a +
                allocationRight2.rgb * allocationRight2.a +
                allocationUp2.rgb * allocationUp2.a +
                allocationDown2.rgb * allocationDown2.a
              ) /
              max(midWeight, 0.001);

            vec3 farColor =
              (
                allocationLeft4.rgb * allocationLeft4.a +
                allocationRight4.rgb * allocationRight4.a +
                allocationUp4.rgb * allocationUp4.a +
                allocationDown4.rgb * allocationDown4.a
              ) /
              max(farWeight, 0.001);

            vec3 wideColor =
              (
                allocationLeft8.rgb * allocationLeft8.a +
                allocationRight8.rgb * allocationRight8.a +
                allocationUp8.rgb * allocationUp8.a +
                allocationDown8.rgb * allocationDown8.a
              ) /
              max(wideWeight, 0.001);

            float outsideAllocation =
              1.0 - hasAllocation;

            float glowNear =
              outsideAllocation *
              step(0.01, nearWeight);

            float glowMid =
              outsideAllocation *
              (1.0 - glowNear) *
              step(0.01, midWeight);

            float glowFar =
              outsideAllocation *
              (1.0 - glowNear) *
              (1.0 - glowMid) *
              step(0.01, farWeight);

            float glowWide =
              outsideAllocation *
              (1.0 - glowNear) *
              (1.0 - glowMid) *
              (1.0 - glowFar) *
              step(0.01, wideWeight);

            vec3 glowColor =
              nearColor * glowNear +
              midColor * glowMid +
              farColor * glowFar +
              wideColor * glowWide;

            glowColor =
              min(
                vec3(1.0),
                glowColor * 2.75 +
                glowColor * glowColor * 0.72
              );

            // Four-stage same-color halo. The strong near band creates
            // separation from the Mars surface while the wide band gives
            // the territory the Ares-style energy presence.
            float territoryGlowAlpha =
              glowNear *
                (
                  0.78 +
                  territoryPulse * 0.18
                ) +
              glowMid *
                (
                  0.48 +
                  territoryPulse * 0.16
                ) +
              glowFar *
                (
                  0.25 +
                  territoryPulse * 0.10
                ) +
              glowWide *
                (
                  0.12 +
                  territoryPulse * 0.06
                );

            finalColor =
              mix(
                finalColor,
                glowColor,
                clamp(
                  territoryGlowAlpha,
                  0.0,
                  0.98
                )
              );

            finalColor =
              mix(
                finalColor,
                territoryEdgeColor,
                allocationGlow *
                  (
                    0.78 +
                    territoryPulse * 0.20
                  )
              );

            finalColor =
              mix(
                finalColor,
                territoryEdgeColor,
                allocationEdge *
                  (
                    0.96 +
                    territoryPulse * 0.04
                  )
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

            // Owned hover/selection must preserve the territory's
            // purchased color instead of replacing it with purple/gold.
            vec3 ownedFill =
              mix(
                vividAllocationColor,
                territoryCoreColor,
                ownedPulse * 0.34
              );

            vec3 ownedEdge =
              territoryEdgeColor;

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
                useTerritorySelectionColor
              );

            float selectionColorStrength =
              mix(
                0.34 +
                  selectionOuterBorder * 0.54,
                0.58 +
                  selectionOuterBorder * 0.34,
                useTerritorySelectionColor
              );

            finalColor =
              mix(
                finalColor,
                selectionPreviewColor,
                isSelectionPreview *
                  selectionColorStrength
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
                max(
                  interactionAlpha,
                  territoryGlowAlpha
                )
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

      <group name="mars-pixel-owned-territory-plates">
        {territoryPlates.map(({ allocation, position, color }) => (
          <group key={allocation.allocation_id} position={position}
            ref={(group) => { territoryPulseRefs.current[allocation.allocation_id] = group; }}>
            <MarsTerritoryLight allocation={allocation} radius={radius} gridWidth={gridWidth}
              gridHeight={gridHeight} center={position} color={color} reducedMotionRef={reducedMotionRef} />
            <MarsTerritoryCreative allocation={allocation} radius={radius} gridWidth={gridWidth}
              gridHeight={gridHeight} center={position} color={color}
              onHover={() => {
                if (selectionEnabled) return;
                cancelTerritoryHoverLeave();
                setHoveredTerritoryId(allocation.allocation_id);
                onOwnedTerritoryHover?.(allocation.allocation_id);
              }}
              onLeave={() => scheduleTerritoryHoverLeave(allocation.allocation_id)}
              onOpen={() => {
                if (selectionEnabled) return;
                cancelTerritoryHoverLeave();
                setPinnedTerritoryId(allocation.allocation_id);
                setHoveredTerritoryId(allocation.allocation_id);
                onOwnedTerritoryHover?.(allocation.allocation_id);
                void recordMarsPixelAdEvent(allocation.allocation_id, "card_open");
              }} selectionEnabled={selectionEnabled} />
          </group>
        ))}
      </group>

      {territoryPlates.map(
        ({
          allocation,
          position,
        }) => {
          if (
            hoveredTerritoryId !==
              allocation.allocation_id &&
            pinnedTerritoryId !==
              allocation.allocation_id
          ) {
            return null;
          }

          const ownerPreview =
            ownerHoverPreview?.allocation_id ===
            allocation.allocation_id
              ? ownerHoverPreview
              : null;

          const activeOwnerPreview =
            ownerPreview?.creative_status === "active"
              ? ownerPreview
              : null;

          const title =
            allocation.creative_title?.trim() ||
            allocation.advertiser_name?.trim() ||
            activeOwnerPreview?.title?.trim() ||
            "MARS PIXEL";

          const imageUrl =
            allocation.creative_image_url ||
            activeOwnerPreview?.image_url ||
            null;

          const pixels =
            allocation.width * allocation.height;

          const reviewStatus =
            !allocation.creative_title &&
            ownerPreview?.creative_status
              ? ownerPreview.creative_status
              : null;

          const destinationUrl =
            allocation.destination_url?.trim() ||
            activeOwnerPreview?.destination_url?.trim() ||
            null;

          const ctaLabel =
            allocation.cta_label?.trim() ||
            activeOwnerPreview?.cta_label?.trim() ||
            t("mars.pixel.overlay.exploreNow");

          let destinationLabel: string | null = null;

          if (destinationUrl) {
            try {
              const parsedUrl = new URL(destinationUrl);
              destinationLabel =
                parsedUrl.hostname.replace(/^www\./, "");
            } catch {
              destinationLabel = destinationUrl;
            }
          }

          const cardPosition =
            position
              .clone()
              .normalize()
              .multiplyScalar(radius);

          return (
            <Html
              key={`territory-hover-${allocation.allocation_id}`}
              position={cardPosition}
              zIndexRange={[30, 20]}
              className="mars-pixel-territory-hover-anchor"
            >
              <div
                ref={(element) => { cardRefs.current[allocation.allocation_id] = element; }}
                style={{ display: "none" }}
                className="mars-pixel-territory-hover-card"
                onPointerEnter={() => {
                  cancelTerritoryHoverLeave();
                  document.body.style.cursor = "default";
                }}
                onPointerLeave={() => {
                  document.body.style.cursor = "";
                  scheduleTerritoryHoverLeave(
                    allocation.allocation_id,
                  );
                }}
                onPointerDown={(event) =>
                  event.stopPropagation()
                }
                onClick={(event) =>
                  event.stopPropagation()
                }
              >
                {pinnedTerritoryId === allocation.allocation_id ? (
                  <button
                    type="button"
                    aria-label={t("mars.pixel.overlay.closeAd")}
                    onPointerDown={(event) =>
                      event.stopPropagation()
                    }
                    onClick={(event) => {
                      event.stopPropagation();
                      cancelTerritoryHoverLeave();
                      setPinnedTerritoryId(null);
                      setHoveredTerritoryId(null);
                      onOwnedTerritoryHover?.(null);
                    }}
                    style={{
                      position: "absolute",
                      top: "8px",
                      left: "8px",
                      zIndex: 5,
                      width: "28px",
                      height: "28px",
                      borderRadius: "50%",
                      border: "1px solid rgba(255,255,255,0.32)",
                      background: "rgba(7, 8, 16, 0.88)",
                      color: "#fff",
                      fontSize: "20px",
                      lineHeight: "24px",
                      cursor: "pointer",
                    }}
                  >
                    ×
                  </button>
                ) : null}

                {imageUrl ? (
                  <div className="mars-pixel-territory-hover-card__media">
                    <img
                      src={imageUrl}
                      alt=""
                      draggable={false}
                    />
                  </div>
                ) : null}

                <div className="mars-pixel-territory-hover-card__body">
                  <span className="mars-pixel-territory-hover-card__eyebrow">
                    MARS PIXEL
                  </span>

                  <strong>{title}</strong>

                  {destinationUrl && destinationLabel ? (
                    <a
                      className="mars-pixel-territory-hover-card__site"
                      href={destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onPointerDown={(event) =>
                        event.stopPropagation()
                      }
                      onClick={(event) =>
                        event.stopPropagation()
                      }
                    >
                      {destinationLabel}
                    </a>
                  ) : null}

                  <span className="mars-pixel-territory-hover-card__meta">
                    {pixels.toLocaleString()} PIXELS
                    {reviewStatus
                      ? ` · ${reviewStatus
                          .replaceAll("_", " ")
                          .toUpperCase()}`
                      : ""}
                  </span>

                  {destinationUrl ? (
                    <a
                      className="mars-pixel-territory-hover-card__cta"
                      href={destinationUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      onPointerDown={(event) =>
                        event.stopPropagation()
                      }
                      onClick={(event) => {
                        event.stopPropagation();

                        void recordMarsPixelAdEvent(
                          allocation.allocation_id,
                          "cta_click",
                        );
                      }}
                    >
                      {ctaLabel}
                    </a>
                  ) : null}
                </div>
              </div>
            </Html>
          );
        },
      )}

    </>
  );
}

/** Curved surface patch: every vertex stays within the purchased grid rectangle. */
function MarsTerritoryCreative({ allocation, radius, gridWidth, gridHeight, center, color,
  onHover, onLeave, onOpen, selectionEnabled,
}: {
  allocation: MarsPixelPublicAllocation; radius: number; gridWidth: number; gridHeight: number;
  center: Vector3; color: Color; onHover: () => void; onLeave: () => void;
  onOpen: () => void; selectionEnabled: boolean;
}) {
  const materialRef = useRef<ShaderMaterial>(null);
  const meshRef = useRef<Mesh>(null);
  const worldCenter = useMemo(() => new Vector3(), []);
  const [image, setImage] = useState<Texture | null>(null);
  const imageUrl = allocation.creative_image_url?.trim();
  const title = allocation.creative_title?.trim();
  useEffect(() => {
    setImage(null);
    if (!imageUrl) return;
    let active = true;
    const texture = new TextureLoader().load(imageUrl, (loaded) => {
      if (active) setImage(loaded);
    }, undefined, () => { if (active) setImage(null); });
    texture.colorSpace = SRGBColorSpace;
    return () => { active = false; texture.dispose(); };
  }, [imageUrl]);

  const titleTexture = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 1024;
    canvas.height = 512;
    const context = canvas.getContext("2d")!;
    if (title) {
      context.fillStyle = "rgba(0,0,0,0.78)";
      context.fillRect(0, 384, 1024, 128);
      context.fillStyle = "white";
      context.font = "bold 48px sans-serif";
      context.textBaseline = "middle";
      context.fillText(title, 24, 448, 976);
    }
    const texture = new CanvasTexture(canvas);
    texture.colorSpace = SRGBColorSpace;
    return texture;
  }, [title]);
  const geometry = useMemo(() => {
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const columns = Math.max(2, Math.ceil(allocation.width / gridWidth * 256));
    const rows = Math.max(2, Math.ceil(allocation.height / gridHeight * 128));
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= columns; x++) {
        const longitude = ((allocation.x_start + allocation.width * x / columns) / gridWidth - 0.5) * Math.PI * 2;
        const latitude = (0.5 - (allocation.y_start + allocation.height * y / rows) / gridHeight) * Math.PI;
        const point = new Vector3(Math.cos(latitude) * Math.sin(longitude), Math.sin(latitude),
          Math.cos(latitude) * Math.cos(longitude)).multiplyScalar(radius * 1.002).sub(center);
        positions.push(point.x, point.y, point.z);
        uvs.push(x / columns, 1 - y / rows);
        if (x < columns && y < rows) {
          const a = y * (columns + 1) + x;
          indices.push(a, a + columns + 1, a + 1, a + 1, a + columns + 1, a + columns + 2);
        }
      }
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new Float32BufferAttribute(positions, 3));
    result.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    result.setIndex(indices);
    result.computeVertexNormals();
    return result;
  }, [allocation.x_start, allocation.y_start, allocation.width, allocation.height, gridWidth, gridHeight, radius, center.x, center.y, center.z]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  useEffect(() => () => titleTexture.dispose(), [titleTexture]);
  const imageDimensions = image?.image as HTMLImageElement | undefined;
  const uniforms = useMemo(() => ({
    imageAspect: { value: imageDimensions ? imageDimensions.naturalWidth / imageDimensions.naturalHeight : 1 },
    surfaceAspect: { value: 2 * allocation.width * gridHeight / (allocation.height * gridWidth) *
      Math.sqrt(Math.max(0, 1 - (center.y / (radius * 1.002)) ** 2)) },
    creative: { value: image }, hasImage: { value: image ? 1 : 0 },
    titleMap: { value: titleTexture }, titleOpacity: { value: 0 },
    territoryColor: { value: color }, surfaceRadius: { value: radius },
  }), [image, imageDimensions, titleTexture, color, radius, allocation.width, allocation.height, gridWidth, gridHeight, center.y]);
  useFrame(({ camera, size }) => {
    const material = materialRef.current;
    if (!material) return;
    // Screen-space footprint controls text only; geometry never grows with zoom.
    meshRef.current?.getWorldPosition(worldCenter);
    const distance = camera.position.distanceTo(worldCenter);
    const projectionScale = Math.abs(camera.projectionMatrix.elements[5]) * size.height / (2 * distance);
    const width = radius * Math.PI * 2 * allocation.width / gridWidth * projectionScale *
      Math.sqrt(Math.max(0, 1 - (center.y / (radius * 1.002)) ** 2));
    const height = radius * Math.PI * allocation.height / gridHeight * projectionScale;
    material.uniforms.titleOpacity.value = Math.min(1, Math.max(0, Math.min((width - 90) / 60, (height - 48) / 32)));
  });
  return <mesh ref={meshRef} geometry={geometry} renderOrder={22}
    onPointerOver={(event) => {
      if (selectionEnabled) return;
      event.stopPropagation(); document.body.style.cursor = "pointer"; onHover();
    }}
    onPointerOut={() => { document.body.style.cursor = ""; onLeave(); }}
    onClick={(event) => { if (!selectionEnabled) { event.stopPropagation(); onOpen(); } }}>
    <shaderMaterial ref={materialRef} uniforms={uniforms} transparent depthWrite={false} toneMapped={false}
      vertexShader={`varying vec2 creativeUv; varying vec3 worldPoint;
        void main() { creativeUv = uv; worldPoint = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(worldPoint, 1.0); }`}
      fragmentShader={`uniform sampler2D creative; uniform sampler2D titleMap;
        uniform float imageAspect; uniform float surfaceAspect;
        uniform float hasImage; uniform float titleOpacity; uniform float surfaceRadius;
        uniform vec3 territoryColor; varying vec2 creativeUv; varying vec3 worldPoint;
        void main() {
          if (dot(normalize(worldPoint), cameraPosition) <= surfaceRadius) discard;
          vec3 base = territoryColor * 0.65;
          if (hasImage > 0.5) {
            vec2 mediaUv = creativeUv - 0.5;
            if (surfaceAspect > imageAspect) mediaUv.x *= surfaceAspect / imageAspect;
            else mediaUv.y *= imageAspect / max(surfaceAspect, 0.001);
            mediaUv += 0.5;
            if (mediaUv.x >= 0.0 && mediaUv.x <= 1.0 && mediaUv.y >= 0.0 && mediaUv.y <= 1.0) {
              vec4 media = texture2D(creative, mediaUv); base = mix(base, media.rgb, media.a);
            }
          }
          vec4 label = texture2D(titleMap, creativeUv);
          base = mix(base, label.rgb, label.a * titleOpacity);
          gl_FragColor = vec4(base, 0.96);
          #include <colorspace_fragment>
        }`} />
  </mesh>;
}

/** Original broad plate/halo footprint, projected onto Mars independently of the ad. */
function MarsTerritoryLight({ allocation, radius, gridWidth, gridHeight, center, color, reducedMotionRef }: {
  allocation: MarsPixelPublicAllocation; radius: number; gridWidth: number; gridHeight: number;
  center: Vector3; color: Color; reducedMotionRef: { current: boolean };
}) {
  const materialRef = useRef<ShaderMaterial>(null);
  const geometry = useMemo(() => {
    const latitude = (0.5 - (allocation.y_start + allocation.height / 2) / gridHeight) * Math.PI;
    const longitude = ((allocation.x_start + allocation.width / 2) / gridWidth - 0.5) * Math.PI * 2;
    const normal = center.clone().normalize();
    const east = new Vector3(Math.cos(longitude), 0, -Math.sin(longitude));
    const north = new Vector3(-Math.sin(latitude) * Math.sin(longitude), Math.cos(latitude),
      -Math.sin(latitude) * Math.cos(longitude));
    // Match the original minimum overview footprint and area-based sizing.
    const plateHeight = Math.min(0.105 * Math.max(1, Math.sqrt(allocation.width * allocation.height / 50)), 0.30);
    const plateWidth = Math.min(plateHeight * allocation.width / Math.max(allocation.height, 1), 0.48);
    const width = Math.max(plateWidth, radius * Math.PI * 2 * allocation.width / gridWidth * Math.cos(latitude)) * 1.72 * 1.105;
    const height = Math.max(plateHeight, radius * Math.PI * allocation.height / gridHeight) * 1.72 * 1.105;
    const positions: number[] = [], uvs: number[] = [], territoryUvs: number[] = [], indices: number[] = [];
    const columns = Math.max(4, Math.ceil(width / radius * 32));
    const rows = Math.max(4, Math.ceil(height / radius * 32));
    for (let y = 0; y <= rows; y++) {
      for (let x = 0; x <= columns; x++) {
        const u = x / columns, v = y / rows;
        const point = normal.clone().multiplyScalar(radius)
          .addScaledVector(east, (u - 0.5) * width).addScaledVector(north, (v - 0.5) * height)
          .normalize().multiplyScalar(radius * 1.003);
        let deltaLongitude = Math.atan2(point.x, point.z) - longitude;
        deltaLongitude = Math.atan2(Math.sin(deltaLongitude), Math.cos(deltaLongitude));
        territoryUvs.push(0.5 + deltaLongitude * gridWidth / (Math.PI * 2 * allocation.width),
          0.5 + (Math.asin(point.y / point.length()) - latitude) * gridHeight / (Math.PI * allocation.height));
        point.sub(center);
        positions.push(point.x, point.y, point.z); uvs.push(u, v);
        if (x < columns && y < rows) {
          const a = y * (columns + 1) + x;
          indices.push(a, a + 1, a + columns + 1, a + 1, a + columns + 2, a + columns + 1);
        }
      }
    }
    const result = new BufferGeometry();
    result.setAttribute("position", new Float32BufferAttribute(positions, 3));
    result.setAttribute("uv", new Float32BufferAttribute(uvs, 2));
    result.setAttribute("territoryUv", new Float32BufferAttribute(territoryUvs, 2));
    result.setIndex(indices);
    return result;
  }, [allocation.x_start, allocation.y_start, allocation.width, allocation.height, radius, gridWidth, gridHeight, center]);
  useEffect(() => () => geometry.dispose(), [geometry]);
  const uniforms = useMemo(() => ({
    territoryColor: { value: color }, surfaceRadius: { value: radius }, wave: { value: 1 },
    preserveCreative: { value: allocation.creative_image_url?.trim() || allocation.creative_title?.trim() ? 1 : 0 },
    phase: { value: Array.from(allocation.allocation_id).reduce((sum, letter) => sum + letter.charCodeAt(0), 0) % 23 * 0.19 },
  }), [color, radius, allocation.allocation_id, allocation.creative_image_url, allocation.creative_title]);
  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    // Four-second cycle: bright to dim (and back) takes two seconds.
    materialRef.current.uniforms.wave.value = reducedMotionRef.current ? 1 :
      (Math.sin(clock.elapsedTime * Math.PI / 2 + uniforms.phase.value) + 1) / 2;
  });
  return <mesh geometry={geometry} renderOrder={23} raycast={() => {}}>
    <shaderMaterial ref={materialRef} uniforms={uniforms} transparent depthWrite={false} toneMapped={false}
      vertexShader={`attribute vec2 territoryUv; varying vec2 lightUv; varying vec2 purchasedUv; varying vec3 worldPoint;
        void main() { lightUv = uv; purchasedUv = territoryUv;
          worldPoint = (modelMatrix * vec4(position, 1.0)).xyz;
          gl_Position = projectionMatrix * viewMatrix * vec4(worldPoint, 1.0); }`}
      fragmentShader={`uniform vec3 territoryColor; uniform float surfaceRadius; uniform float wave; uniform float preserveCreative;
        varying vec2 lightUv; varying vec2 purchasedUv; varying vec3 worldPoint;
        void main() {
          if (dot(normalize(worldPoint), cameraPosition) <= surfaceRadius) discard;
          // Keep the entire purchased creative face untouched. Only colored light extends beyond it.
          if (preserveCreative > 0.5 && purchasedUv.x > 0.0 && purchasedUv.x < 1.0 && purchasedUv.y > 0.0 && purchasedUv.y < 1.0) discard;
          float scale = 0.965 + wave * 0.14;
          vec2 distanceFromCenter = abs(lightUv - 0.5) * 2.0 * 1.105 / scale;
          float edge = max(distanceFromCenter.x, distanceFromCenter.y);
          float aa = max(fwidth(edge), 0.001);
          float halo = 1.0 - smoothstep(0.88, 1.0, edge);
          float frame = 1.0 - smoothstep(1.18 / 1.72 - aa, 1.18 / 1.72 + aa, edge);
          float face = 1.0 - smoothstep(1.0 / 1.72 - aa, 1.0 / 1.72 + aa, edge);
          float inner = 1.0 - smoothstep(0.72 / 1.72 - aa, 0.82 / 1.72 + aa, edge);
          float alpha = max(halo * (0.05 + wave * 0.55),
            max(frame * (0.08 + wave * 0.46), max(face * (0.12 + wave * 0.82), inner * (0.12 + wave * 0.60))));
          gl_FragColor = vec4(territoryColor, alpha);
          #include <colorspace_fragment>
        }`} />
  </mesh>;
}
