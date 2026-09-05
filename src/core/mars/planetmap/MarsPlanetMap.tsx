import {
  Canvas,
  useFrame,
} from "@react-three/fiber";

import {
  Html,
  OrbitControls,
  Stars,
  useTexture,
} from "@react-three/drei";

import {
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";

import type {
  Group,
  Mesh,
} from "three";

import {
  DoubleSide,
  MathUtils,
  SRGBColorSpace,
  Vector3,
} from "three";

import type {
  MarsSector,
} from "../MarsSectorService";

import {
  getMarsPixelBlockAtCoordinate,
  getMarsPixelNetworkStatus,
  getMarsPixelPublicAllocations,
  getMarsPixelPublicReservedZones,
  getMarsPixelSelectionDetail,
  getMarsPixelSelectionValuation,
  getMarsPixelTerritoryColorOptions,
  getMarsPixelContentTier,
} from "../MarsPixelNetworkService";

import type {
  MarsPixelBlockDetail,
  MarsPixelNetworkStatus,
  MarsPixelPublicAllocation,
  MarsPixelPublicReservedZone,
  MarsPixelSelectionDetail,
  MarsPixelSelectionValuation,
  MarsPixelTerritoryColorOption,
  MarsPixelContentTier,
} from "../MarsPixelNetworkService";

import {
  MarsPixelOverlay,
} from "./MarsPixelOverlay";

import {
  createMarsPixelBlockSelectionV1,
} from "./MarsPixelGridMapper";

import { useLanguage } from "../../language";
import MarsLanguageSelector from "../components/MarsLanguageSelector";

import {
  MARS_PIXEL_TERRITORY_COLORS,
} from "./MarsPixelTerritoryColors";

import "./MarsPlanetMap.css";

type MarsPlanetMapProps = {
  sectors: MarsSector[];
  currentSectorId: string | null;
  selectedSectorId: string | null;
  onSelectSector: (
    sectorId: string | null,
  ) => void;
  onEnterSector: (
    sectorId: string,
  ) => void;
  diving: boolean;
  ariaLabel: string;
  aresAccess: {
    telegram_verified: boolean;
    x_verified: boolean;
    mining_days: number;
    required_mining_days: number;
    unlocked: boolean;
  } | null;
  aresAccessLoading: boolean;
  pixelNetworkStatus?: MarsPixelNetworkStatus | null;
  pixelAllocations?: MarsPixelPublicAllocation[];
  pixelReservedZones?: MarsPixelPublicReservedZone[];
};

type MarsPlanetSceneProps = Omit<
  MarsPlanetMapProps,
  | "ariaLabel"
  | "aresAccess"
  | "aresAccessLoading"
> & {
  selectedPixelCoordinate: {
    x: number;
    y: number;
  } | null;
  pixelDragActive: boolean;
  onDragStateChange: (
    dragging: boolean,
  ) => void;
  onPixelDragStart: (
    anchor: {
      x: number;
      y: number;
    },
  ) => void;
  onPixelDragSelect: (
    anchor: {
      x: number;
      y: number;
    },
    target: {
      x: number;
      y: number;
    },
  ) => void;
  lockedSelectionCoordinate: {
    x: number;
    y: number;
  } | null;
  territorySelectionColor: [number, number, number] | null;
  onPixelSelect: (coordinate: {
    x: number;
    y: number;
  }) => void;
  onPixelHover: (
    coordinate: {
      x: number;
      y: number;
      blockX: number;
      blockY: number;
    } | null,
  ) => void;
};

type SectorMarkerProps = {
  sector: MarsSector;
  current: boolean;
  selected: boolean;
  onSelect: () => void;
};

const PLANET_RADIUS = 2.62;
const MARKER_RADIUS = 2.68;

function mapCoordinatesToAngles(
  mapX: number,
  mapY: number,
) {
  const longitude =
    (mapX / 100) * Math.PI * 2 -
    Math.PI;

  const latitude =
    Math.PI / 2 -
    (mapY / 100) * Math.PI;

  return {
    longitude,
    latitude,
  };
}

function mapPositionToSphere(
  mapX: number,
  mapY: number,
): Vector3 {
  const {
    longitude,
    latitude,
  } = mapCoordinatesToAngles(
    mapX,
    mapY,
  );

  const cosLatitude =
    Math.cos(latitude);

  return new Vector3(
    MARKER_RADIUS *
      cosLatitude *
      Math.sin(longitude),

    MARKER_RADIUS *
      Math.sin(latitude),

    MARKER_RADIUS *
      cosLatitude *
      Math.cos(longitude),
  );
}

function SectorMarker({
  sector,
  current,
  selected,
  onSelect,
}: SectorMarkerProps) {
  if (
    sector.map_x === null ||
    sector.map_y === null
  ) {
    return null;
  }

  const isAres =
    sector.sector_code
      ?.trim()
      .toLowerCase() === "ares" ||
    sector.sector_name
      ?.trim()
      .toLowerCase()
      .includes("ares") === true;

  const position = useMemo(
    () => {
      const mapX =
        sector.map_x as number;

      const mapY =
        sector.map_y as number;

      if (!isAres) {
        return mapPositionToSphere(
          mapX,
          mapY,
        );
      }

      const cellSize = 100 / 20;

      const snappedMapX =
        Math.floor(
          mapX / cellSize,
        ) *
          cellSize +
        cellSize / 2;

      const snappedMapY =
        Math.floor(
          mapY / cellSize,
        ) *
          cellSize +
        cellSize / 2;

      return mapPositionToSphere(
        snappedMapX,
        snappedMapY,
      );
    },
    [
      isAres,
      sector.map_x,
      sector.map_y,
    ],
  );

  const color = isAres
    ? "#63f5ff"
    : current
      ? "#63f5ff"
      : selected
        ? "#c795ff"
        : "#ffb06a";

  const aresPulseRef =
    useRef<Mesh | null>(null);

  useFrame((state) => {
    if (
      !isAres ||
      !aresPulseRef.current
    ) {
      return;
    }

    const time =
      state.clock.elapsedTime;

    const pulse =
      1 +
      Math.sin(time * 3.2) *
        0.22;

    aresPulseRef.current.scale.setScalar(
      pulse,
    );

    aresPulseRef.current.rotation.z =
      time * 0.18;
  });

  return (
    <group
      position={position}
      name={isAres ? "ares-exploration-marker" : undefined}
    >
      <mesh
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();

          document.body.style.cursor =
            "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry
          args={[
            isAres
              ? 0.09
              : current || selected
                ? 0.075
                : 0.058,
            24,
            24,
          ]}
        />

        <meshBasicMaterial
          color={color}
          toneMapped={false}
        />
      </mesh>

      <mesh>
        <ringGeometry
          args={[
            isAres ? 0.105 : 0.085,
            isAres
              ? 0.18
              : current || selected
                ? 0.145
                : 0.115,
            32,
          ]}
        />

        <meshBasicMaterial
          color={color}
          transparent
          opacity={
            isAres
              ? 0.92
              : current || selected
                ? 0.78
                : 0.38
          }
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {isAres && (
        <>
          <mesh ref={aresPulseRef}>
            <ringGeometry
              args={[0.19, 0.235, 40]}
            />
            <meshBasicMaterial
              color="#63f5ff"
              transparent
              opacity={0.42}
              side={DoubleSide}
              depthWrite={false}
              toneMapped={false}
            />
          </mesh>

          <pointLight
            color="#63f5ff"
            intensity={1.6}
            distance={1.25}
            decay={2}
          />
        </>
      )}


    </group>
  );
}

function MarsPlanet({
  sectors,
  currentSectorId,
  selectedSectorId,
  onSelectSector,
  onEnterSector,
  diving,
  pixelNetworkStatus,
  pixelAllocations,
  pixelReservedZones,
  selectedPixelCoordinate,
  lockedSelectionCoordinate,
  territorySelectionColor,
  onPixelSelect,
  onPixelDragStart,
  onPixelDragSelect,
  onDragStateChange,
  onPixelHover,
}: MarsPlanetSceneProps) {
  const groupRef =
    useRef<Group | null>(null);

  const atmosphereRef =
    useRef<Mesh | null>(null);

  const texture = useTexture(
    "/images/mars/nasa-mars-world.jpg",
  );

  texture.colorSpace =
    SRGBColorSpace;

  const selectedSector =
    useMemo(
      () =>
        sectors.find(
          (sector) =>
            sector.sector_id ===
            selectedSectorId,
        ) ?? null,
      [
        sectors,
        selectedSectorId,
      ],
    );

  const aresSector =
    useMemo(
      () =>
        sectors.find((sector) => {
          const code =
            sector.sector_code
              ?.trim()
              .toLowerCase();

          const name =
            sector.sector_name
              ?.trim()
              .toLowerCase();

          return (
            code === "ares" ||
            name?.includes("ares") === true
          );
        }) ?? null,
      [sectors],
    );

  const focusAngles =
    useMemo(() => {
      if (
        !selectedSector ||
        selectedSector.map_x === null ||
        selectedSector.map_y === null
      ) {
        return null;
      }

      return mapCoordinatesToAngles(
        selectedSector.map_x,
        selectedSector.map_y,
      );
    }, [selectedSector]);

  useFrame((_, delta) => {
    const group =
      groupRef.current;

    if (!group) {
      return;
    }

    if (focusAngles) {
      /*
       * Bring selected sector toward
       * the front of the planet.
       */
      const targetX =
        focusAngles.latitude;

      const targetY =
        -focusAngles.longitude;

      group.rotation.x =
        MathUtils.damp(
          group.rotation.x,
          targetX,
          3.8,
          delta,
        );

      group.rotation.y =
        MathUtils.damp(
          group.rotation.y,
          targetY,
          3.8,
          delta,
        );

      /*
       * Visual focus zoom without
       * fighting OrbitControls camera.
       */
      /*
       * Selection focus = subtle zoom.
       * ENTER SECTOR = real 3D orbital descent.
       *
       * During the dive the planet itself expands
       * toward the camera until the Mars surface
       * fills the viewport.
       */
      const targetScale =
        diving ? 4.85 : 1.1;

      const damping =
        diving ? 2.75 : 3.6;

      const scale =
        MathUtils.damp(
          group.scale.x,
          targetScale,
          damping,
          delta,
        );

      group.scale.setScalar(scale);
    } else {
      group.rotation.x =
        MathUtils.damp(
          group.rotation.x,
          0.08,
          2,
          delta,
        );

      group.rotation.y +=
        delta * 0.006;

      const scale =
        MathUtils.damp(
          group.scale.x,
          1,
          3,
          delta,
        );

      group.scale.setScalar(
        scale,
      );
    }

    if (
      atmosphereRef.current
    ) {
      atmosphereRef.current.rotation.y -=
        delta * 0.002;
    }
  });

  return (
    <group
      ref={groupRef}
      rotation={[
        0.08,
        -0.4,
        0,
      ]}
    >
      <mesh
        castShadow
        receiveShadow

      >
        <sphereGeometry
          args={[
            PLANET_RADIUS,
            128,
            128,
          ]}
        />

        <meshStandardMaterial
          map={texture}
          roughness={0.96}
          metalness={0}
        />
      </mesh>

      {pixelNetworkStatus && (
        <MarsPixelOverlay
          radius={PLANET_RADIUS}
          gridWidth={
            pixelNetworkStatus.grid_width
          }
          gridHeight={
            pixelNetworkStatus.grid_height
          }
          gridVersion={
            pixelNetworkStatus.grid_version
          }
          allocations={
            pixelAllocations ?? []
          }
          reservedZones={
            pixelReservedZones ?? []
          }
          visible={!diving}
          selectedPixel={selectedPixelCoordinate}
          lockedSelectionPixel={lockedSelectionCoordinate}
          territorySelectionColor={territorySelectionColor}
          onPixelSelect={onPixelSelect}
          onPixelDragStart={onPixelDragStart}
          onPixelDragSelect={onPixelDragSelect}
          onDragStateChange={onDragStateChange}
          onPixelHover={onPixelHover}
          aresMapX={
            aresSector?.map_x ?? null
          }
          aresMapY={
            aresSector?.map_y ?? null
          }
          onAresSelect={() => {
            if (!aresSector) {
              return;
            }

            onSelectSector(
              aresSector.sector_id,
            );
          }}
        />
      )}

      <mesh
        ref={atmosphereRef}
      >
        <sphereGeometry
          args={[
            PLANET_RADIUS * 1.012,
            96,
            96,
          ]}
        />

        <meshBasicMaterial
          color="#ff7a45"
          transparent
          opacity={0.055}
          side={DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {!diving &&
        sectors
          .filter((sector) => {
            const code =
              sector.sector_code
                ?.trim()
                .toLowerCase();

            const name =
              sector.sector_name
                ?.trim()
                .toLowerCase();

            return (
              code === "ares" ||
              name?.includes("ares") === true
            );
          })
          .map((sector) => (
            <SectorMarker
              key={sector.sector_id}
              sector={sector}
              current={
                sector.sector_id ===
                currentSectorId
              }
              selected={
                sector.sector_id ===
                selectedSectorId
              }
              onSelect={() => {
                onSelectSector(
                  sector.sector_id,
                );
              }}
            />
          ))}
    </group>
  );
}

function MarsScene(
  props: MarsPlanetSceneProps,
) {
  const mobileMars =
    typeof window !== "undefined" &&
    window.matchMedia("(max-width: 900px)").matches;

  return (
    <>
      {!mobileMars && (
        <color
          attach="background"
          args={["#010207"]}
        />
      )}

      <ambientLight
        intensity={0.24}
      />

      <directionalLight
        position={[6, 3, 7]}
        intensity={3.8}
      />

      <directionalLight
        position={[
          -5,
          -2,
          -4,
        ]}
        intensity={0.32}
        color="#8e4b35"
      />

      <MarsPlanet {...props} />

      <group name="bobu-deep-space">
        <Stars
          radius={155}
          depth={90}
          count={4200}
          factor={1.45}
          saturation={0.42}
          fade
          speed={0.018}
        />

        <Stars
          radius={105}
          depth={58}
          count={1800}
          factor={2.35}
          saturation={0.58}
          fade
          speed={0.035}
        />

        <Stars
          radius={72}
          depth={34}
          count={420}
          factor={3.8}
          saturation={0.72}
          fade
          speed={0.055}
        />
      </group>

      <OrbitControls
        makeDefault
        target={[0, 0, 0]}
        enablePan={false}
        enabled={
          !props.diving &&
          !props.pixelDragActive
        }
        enableRotate={
          !props.selectedSectorId &&
          !props.diving &&
          !props.pixelDragActive
        }
        enableZoom={
          !props.diving &&
          !props.pixelDragActive
        }
        enableDamping
        dampingFactor={0.055}
        minDistance={3.45}
        maxDistance={8.4}
        rotateSpeed={0.48}
        zoomSpeed={0.65}
        minPolarAngle={0.12}
        maxPolarAngle={
          Math.PI - 0.12
        }
      />
    </>
  );
}

export function MarsPlanetMap({
  sectors,
  currentSectorId,
  selectedSectorId,
  onSelectSector,
  onEnterSector,
  diving,
  ariaLabel,
  aresAccess,
  aresAccessLoading,
}: MarsPlanetMapProps) {
  const { t } = useLanguage();
  const [
    pixelNetworkStatus,
    setPixelNetworkStatus,
  ] =
    useState<MarsPixelNetworkStatus | null>(
      null,
    );

  const [
    pixelAllocations,
    setPixelAllocations,
  ] = useState<
    MarsPixelPublicAllocation[]
  >([]);

  const [
    pixelReservedZones,
    setPixelReservedZones,
  ] = useState<
    MarsPixelPublicReservedZone[]
  >([]);

  const [
    hoveredPixelCoordinate,
    setHoveredPixelCoordinate,
  ] = useState<{
    x: number;
    y: number;
    blockX: number;
    blockY: number;
  } | null>(null);

  const [
    pixelNetworkError,
    setPixelNetworkError,
  ] = useState(false);

  const [
    selectedPixel,
    setSelectedPixel,
  ] =
    useState<MarsPixelBlockDetail | null>(
      null,
    );

  const [
    selectedPixelLoading,
    setSelectedPixelLoading,
  ] = useState(false);

  const [
    selectedPixelError,
    setSelectedPixelError,
  ] = useState<string | null>(null);

  const [
    lockedSelectionTarget,
    setLockedSelectionTarget,
  ] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [
    selectedPixelSelection,
    setSelectedPixelSelection,
  ] = useState<MarsPixelSelectionDetail | null>(
    null,
  );

  const [
    selectedPixelSelectionLoading,
    setSelectedPixelSelectionLoading,
  ] = useState(false);

  const [
    selectedPixelSelectionError,
    setSelectedPixelSelectionError,
  ] = useState<string | null>(null);

  const [
    selectedPixelValuation,
    setSelectedPixelValuation,
  ] = useState<MarsPixelSelectionValuation | null>(
    null,
  );

  const pixelRequestRef = useRef(0);

  const [territoryWidth, setTerritoryWidth] =
    useState("10");
  const [territoryHeight, setTerritoryHeight] =
    useState("5");
  const [territorySizeError, setTerritorySizeError] =
    useState<string | null>(null);

  const [
    pixelDragActive,
    setPixelDragActive,
  ] = useState(false);

  const [
    pixelDragAnchor,
    setPixelDragAnchor,
  ] = useState<{
    x: number;
    y: number;
  } | null>(null);

  const [
    pixelColorOptions,
    setPixelColorOptions,
  ] = useState<MarsPixelTerritoryColorOption[]>([]);

  const [
    selectedPixelColorKey,
    setSelectedPixelColorKey,
  ] = useState<string | null>(null);

  const [
    pixelColorMode,
    setPixelColorMode,
  ] = useState<"auto" | "manual">("auto");

  const [
    pixelColorPickerOpen,
    setPixelColorPickerOpen,
  ] = useState(false);

  const [
    pixelColorLoading,
    setPixelColorLoading,
  ] = useState(false);

  const [
    pixelColorError,
    setPixelColorError,
  ] = useState<string | null>(null);

  const pixelColorRequestRef = useRef(0);

  useEffect(() => {
    const requestId =
      ++pixelColorRequestRef.current;

    setPixelColorPickerOpen(false);
    setPixelColorMode("auto");
    setPixelColorError(null);

    if (
      !selectedPixelSelection ||
      selectedPixelSelection.selection_status !== "available"
    ) {
      setPixelColorOptions([]);
      setSelectedPixelColorKey(null);
      setPixelColorLoading(false);
      return;
    }

    setPixelColorLoading(true);
    setPixelColorOptions([]);
    setSelectedPixelColorKey(null);

    void getMarsPixelTerritoryColorOptions(
      selectedPixelSelection.x_start,
      selectedPixelSelection.y_start,
      selectedPixelSelection.width,
      selectedPixelSelection.height,
    )
      .then((options) => {
        if (
          pixelColorRequestRef.current !== requestId
        ) {
          return;
        }

        const ordered = [...options].sort(
          (a, b) => a.auto_rank - b.auto_rank,
        );

        const automatic =
          ordered.find((option) => option.allowed) ??
          null;

        setPixelColorOptions(ordered);
        setSelectedPixelColorKey(
          automatic?.color_key ?? null,
        );

        if (!automatic) {
          setPixelColorError(
            "No eligible territory color is available.",
          );
        }
      })
      .catch((error: unknown) => {
        if (
          pixelColorRequestRef.current !== requestId
        ) {
          return;
        }

        setPixelColorOptions([]);
        setSelectedPixelColorKey(null);
        setPixelColorError(
          error instanceof Error
            ? error.message
            : "Territory color options could not be loaded.",
        );
      })
      .finally(() => {
        if (
          pixelColorRequestRef.current === requestId
        ) {
          setPixelColorLoading(false);
        }
      });
  }, [selectedPixelSelection]);

  const selectedPixelColor =
    selectedPixelColorKey
      ? MARS_PIXEL_TERRITORY_COLORS[
          selectedPixelColorKey
        ] ?? "#63f5ff"
      : "#63f5ff";

  const selectedPixelColorRgb: [number, number, number] = [
    parseInt(selectedPixelColor.slice(1, 3), 16) / 255,
    parseInt(selectedPixelColor.slice(3, 5), 16) / 255,
    parseInt(selectedPixelColor.slice(5, 7), 16) / 255,
  ];

  const pixelBlockSelection = useMemo(() => {
    if (pixelDragAnchor) {
      const target =
        lockedSelectionTarget ??
        hoveredPixelCoordinate ??
        pixelDragAnchor;

      return createMarsPixelBlockSelectionV1(
        pixelDragAnchor.x,
        pixelDragAnchor.y,
        target.x,
        target.y,
      );
    }

    if (!selectedPixel) {
      return null;
    }

    const target =
      lockedSelectionTarget ??
      hoveredPixelCoordinate;

    if (!target) {
      return null;
    }

    return createMarsPixelBlockSelectionV1(
      selectedPixel.x_start,
      selectedPixel.y_start,
      target.x,
      target.y,
    );
  }, [
    hoveredPixelCoordinate,
    lockedSelectionTarget,
    pixelDragAnchor,
    selectedPixel,
  ]);

  const handlePixelDragStart = (
    anchor: {
      x: number;
      y: number;
    },
  ) => {
    pixelRequestRef.current += 1;

    setPixelDragAnchor(anchor);
    setLockedSelectionTarget(null);
    setSelectedPixel(null);
    setSelectedPixelSelection(null);
    setSelectedPixelValuation(null);
    setSelectedPixelError(null);
    setSelectedPixelSelectionError(null);
    setSelectedPixelLoading(false);
    setSelectedPixelSelectionLoading(false);
  };

  const handlePixelDragStateChange = (
    dragging: boolean,
  ) => {
    setPixelDragActive(dragging);

    if (!dragging) {
      setPixelDragAnchor(null);
    }
  };

  const handlePixelDragSelect = async (
    anchor: {
      x: number;
      y: number;
    },
    target: {
      x: number;
      y: number;
    },
  ) => {
    setPixelDragAnchor(anchor);

    const requestId =
      pixelRequestRef.current + 1;

    pixelRequestRef.current = requestId;

    setLockedSelectionTarget({
      x: target.x,
      y: target.y,
    });

    setSelectedPixel(null);
    setSelectedPixelSelection(null);
    setSelectedPixelValuation(null);
    setSelectedPixelError(null);
    setSelectedPixelSelectionError(null);
    setSelectedPixelLoading(true);
    setSelectedPixelSelectionLoading(true);

    try {
      const [
        anchorDetail,
        selectionDetail,
        valuation,
      ] = await Promise.all([
        getMarsPixelBlockAtCoordinate(
          anchor.x,
          anchor.y,
        ),
        getMarsPixelSelectionDetail(
          anchor.x,
          anchor.y,
          target.x,
          target.y,
        ),
        getMarsPixelSelectionValuation(
          anchor.x,
          anchor.y,
          target.x,
          target.y,
        ),
      ]);

      if (
        pixelRequestRef.current !==
        requestId
      ) {
        return;
      }

      setSelectedPixel(anchorDetail);
      setSelectedPixelSelection(
        selectionDetail,
      );
      setSelectedPixelValuation(
        valuation,
      );
    } catch (error) {
      if (
        pixelRequestRef.current !==
        requestId
      ) {
        return;
      }

      console.error(
        "Mars Pixel drag selection lookup failed.",
        error,
      );

      setSelectedPixel(null);
      setLockedSelectionTarget(null);
      setSelectedPixelSelection(null);
      setSelectedPixelValuation(null);
      setSelectedPixelSelectionError(
        "SELECTION DATA UNAVAILABLE",
      );
    } finally {
      if (
        pixelRequestRef.current ===
        requestId
      ) {
        setSelectedPixelLoading(false);
        setSelectedPixelSelectionLoading(
          false,
        );
      }
    }
  };

  const getTerritoryPreview = (
    coordinate: {
      x: number;
      y: number;
    },
  ) => {
    const gridWidth = pixelNetworkStatus?.grid_width ?? 1000;
    const gridHeight = pixelNetworkStatus?.grid_height ?? 1000;

    const width = Number(territoryWidth);
    const height = Number(territoryHeight);

    if (
      !Number.isInteger(width) ||
      !Number.isInteger(height) ||
      width < 1 ||
      height < 1 ||
      width * height < 50
    ) {
      return null;
    }

    return {
      anchor: {
        x: coordinate.x,
        y: coordinate.y,
      },
      target: {
        x: Math.min(
          coordinate.x + width - 1,
          gridWidth - 1,
        ),
        y: Math.min(
          coordinate.y + height - 1,
          gridHeight - 1,
        ),
      },
      width,
      height,
    };
  };

  const handleTerritorySizeSelect = async (
    coordinate: {
      x: number;
      y: number;
    },
  ) => {
    const preview = getTerritoryPreview(coordinate);

    if (!preview) {
      setTerritorySizeError(
        "MINIMUM TERRITORY SIZE IS 50 PIXELS",
      );
      return;
    }

    setTerritorySizeError(null);

    await handlePixelDragSelect(
      preview.anchor,
      preview.target,
    );
  };

  const [selectedPixelContentTier, setSelectedPixelContentTier] =
    useState<MarsPixelContentTier | null>(null);
  const [selectedPixelContentTierLoading, setSelectedPixelContentTierLoading] =
    useState(false);
  const [selectedPixelContentTierError, setSelectedPixelContentTierError] =
    useState<string | null>(null);

  useEffect(() => {
    const pixelCount =
      selectedPixelSelection?.selection_status === "available"
        ? selectedPixelSelection.pixel_count
        : null;

    if (!pixelCount || pixelCount < 50) {
      setSelectedPixelContentTier(null);
      setSelectedPixelContentTierLoading(false);
      setSelectedPixelContentTierError(null);
      return;
    }

    let active = true;

    setSelectedPixelContentTier(null);
    setSelectedPixelContentTierLoading(true);
    setSelectedPixelContentTierError(null);

    void getMarsPixelContentTier(pixelCount)
      .then((tier) => {
        if (!active) {
          return;
        }

        setSelectedPixelContentTier(tier);
      })
      .catch((error) => {
        if (!active) {
          return;
        }

        console.error(
          "Mars Pixel content tier lookup failed.",
          error,
        );

        setSelectedPixelContentTierError(
          "TIER DATA UNAVAILABLE",
        );
      })
      .finally(() => {
        if (!active) {
          return;
        }

        setSelectedPixelContentTierLoading(false);
      });

    return () => {
      active = false;
    };
  }, [
    selectedPixelSelection?.pixel_count,
    selectedPixelSelection?.selection_status,
  ]);

  const territorySelectionLocked =
    selectedPixel !== null &&
    lockedSelectionTarget !== null;

  const mobileTouchMode =
    typeof window !== "undefined" &&
    window.matchMedia(
      "(max-width: 680px) and (pointer: coarse)",
    ).matches;

  const territorySelectionColor =
    useMemo<[number, number, number] | null>(() => {
      if (
        !selectedPixelSelection ||
        selectedPixelSelection.selection_status !== "available" ||
        !selectedPixelColorKey
      ) {
        return null;
      }

      const hex =
        MARS_PIXEL_TERRITORY_COLORS[
          selectedPixelColorKey
        ];

      if (!hex) {
        return null;
      }

      const value = Number.parseInt(
        hex.slice(1),
        16,
      );

      return [
        ((value >> 16) & 255) / 255,
        ((value >> 8) & 255) / 255,
        (value & 255) / 255,
      ];
    }, [
      selectedPixelColorKey,
      selectedPixelSelection,
    ]);


  const handlePixelSelect = async (
    coordinate: {
      x: number;
      y: number;
    },
  ) => {
    if (
      selectedPixel &&
      !lockedSelectionTarget
    ) {
      const target = {
        x: coordinate.x,
        y: coordinate.y,
      };

      const requestId =
        pixelRequestRef.current + 1;

      pixelRequestRef.current = requestId;

      setLockedSelectionTarget(target);
      setSelectedPixelSelection(null);
      setSelectedPixelValuation(null);
      setSelectedPixelSelectionError(null);
      setSelectedPixelSelectionLoading(true);

      try {
        const [detail, valuation] =
          await Promise.all([
            getMarsPixelSelectionDetail(
              selectedPixel.x_start,
              selectedPixel.y_start,
              target.x,
              target.y,
            ),
            getMarsPixelSelectionValuation(
              selectedPixel.x_start,
              selectedPixel.y_start,
              target.x,
              target.y,
            ),
          ]);

        if (
          pixelRequestRef.current !==
          requestId
        ) {
          return;
        }

        setSelectedPixelSelection(detail);
        setSelectedPixelValuation(valuation);
      } catch (error) {
        if (
          pixelRequestRef.current !==
          requestId
        ) {
          return;
        }

        console.error(
          "Mars Pixel selection lookup failed.",
          error,
        );

        setSelectedPixelSelectionError(
          "SELECTION DATA UNAVAILABLE",
        );
      } finally {
        if (
          pixelRequestRef.current ===
          requestId
        ) {
          setSelectedPixelSelectionLoading(
            false,
          );
        }
      }

      return;
    }

    const requestId =
      pixelRequestRef.current + 1;

    pixelRequestRef.current = requestId;

    setLockedSelectionTarget(null);
    setSelectedPixelSelection(null);
    setSelectedPixelValuation(null);
    setSelectedPixelSelectionError(null);
    setSelectedPixelSelectionLoading(false);
    setSelectedPixel(null);
    setSelectedPixelError(null);
    setSelectedPixelLoading(true);

    try {
      const [detail, valuation] =
        await Promise.all([
          getMarsPixelBlockAtCoordinate(
            coordinate.x,
            coordinate.y,
          ),
          getMarsPixelSelectionValuation(
            coordinate.x,
            coordinate.y,
            coordinate.x,
            coordinate.y,
          ),
        ]);

      if (
        pixelRequestRef.current !==
        requestId
      ) {
        return;
      }

      setSelectedPixel(detail);
      setSelectedPixelValuation(valuation);
    } catch (error) {
      if (
        pixelRequestRef.current !==
        requestId
      ) {
        return;
      }

      console.error(
        "Mars Pixel block lookup failed.",
        error,
      );

      setSelectedPixelError(
        "BLOCK DATA UNAVAILABLE",
      );
    } finally {
      if (
        pixelRequestRef.current ===
        requestId
      ) {
        setSelectedPixelLoading(false);
      }
    }
  };

  useEffect(() => {
    let active = true;

    const loadPixelNetwork =
      async () => {
        try {
          const status =
            await getMarsPixelNetworkStatus();

          const reservedZones =
            await getMarsPixelPublicReservedZones();

          let allocations:
            MarsPixelPublicAllocation[] =
              [];

          if (
            status.commercial_status ===
              "preview" ||
            status.commercial_status ===
              "active"
          ) {
            allocations =
              await getMarsPixelPublicAllocations();
          }

          if (!active) {
            return;
          }

          setPixelNetworkStatus(
            status,
          );

          setPixelAllocations(
            allocations,
          );

          setPixelReservedZones(
            reservedZones,
          );

          setPixelNetworkError(false);
        } catch {
          if (!active) {
            return;
          }

          setPixelNetworkStatus(null);
          setPixelAllocations([]);
          setPixelReservedZones([]);
          setPixelNetworkError(true);
        }
      };

    void loadPixelNetwork();

    return () => {
      active = false;
    };
  }, []);

  const selectedSector =
    useMemo(
      () =>
        sectors.find(
          (sector) =>
            sector.sector_id ===
            selectedSectorId,
        ) ?? null,
      [
        sectors,
        selectedSectorId,
      ],
    );

  const current =
    selectedSector?.sector_id ===
    currentSectorId;

  const selectedSectorIsAres =
    selectedSector?.sector_code
      ?.trim()
      .toLowerCase() === "ares" ||
    selectedSector?.sector_name
      ?.trim()
      .toLowerCase()
      .includes("ares") === true;

  return (
    <section
      className={[
        "mars-planet-map",
        selectedSector
          ? "has-selection"
          : "",
        diving
          ? "is-diving"
          : "",
      ].join(" ")}
      aria-label={ariaLabel}
    >
      <div className="mars-planet-map__hud">
        <span>
          BOBU MARS
        </span>

        <strong>
          {t("mars.orbit.operations")}
        </strong>
      </div>

      <div
        className="mars-planet-map__pixel-hud"
        aria-live="polite"
      >
        <span>
          <>
            <MarsLanguageSelector />
            {t("mars.pixel.network")}
          </>
        </span>

        <strong>
          {pixelNetworkStatus
            ? `${pixelNetworkStatus.total_pixels.toLocaleString(
                "en-US",
              )} MARS PIXELS`
            : pixelNetworkError
              ? "NETWORK UNAVAILABLE"
              : "NETWORK SYNCING"}
        </strong>

        <small>
          {pixelNetworkStatus
            ? `COMMERCIAL NETWORK ${pixelNetworkStatus.commercial_status.toUpperCase()}`
            : pixelNetworkError
              ? "STATUS UNAVAILABLE"
              : "READING PRODUCTION STATE"}
        </small>
      </div>

      {!diving && pixelNetworkStatus && (
        <div className="mars-pixel-goto">
          <span className="mars-pixel-goto__eyebrow">
            SELECT TERRITORY SIZE
          </span>

          <div className="mars-pixel-goto__controls">
            <label>
              <span>WIDTH</span>
              <input
                type="number"
                min={1}
                max={pixelNetworkStatus.grid_width}
                value={territoryWidth}
                onChange={(event) =>
                  setTerritoryWidth(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setTerritorySizeError(null);
                  }
                }}
              />
            </label>

            <label>
              <span>HEIGHT</span>
              <input
                type="number"
                min={0}
                max={pixelNetworkStatus.grid_height}
                value={territoryHeight}
                onChange={(event) =>
                  setTerritoryHeight(event.target.value)
                }
                onKeyDown={(event) => {
                  if (event.key === "Enter") {
                    setTerritorySizeError(null);
                  }
                }}
              />
            </label>

            <div className="mars-pixel-goto__total">
              {(() => {
                const width = Number(territoryWidth);
                const height = Number(territoryHeight);
                const total =
                  Number.isFinite(width) &&
                  Number.isFinite(height)
                    ? width * height
                    : 0;

                return `${total.toLocaleString("en-US")} PIXELS`;
              })()}
            </div>
          </div>

          <small className="mars-pixel-goto__hint">
            {mobileTouchMode
              ? "TAP MARS TO POSITION · THEN LOCK TERRITORY"
              : "MOVE OVER MARS · CLICK TO LOCK TERRITORY"}
          </small>

          {mobileTouchMode &&
            pixelDragAnchor &&
            !territorySelectionLocked && (
              <button
                type="button"
                className="mars-pixel-goto__lock"
                onClick={() => {
                  void handleTerritorySizeSelect(
                    pixelDragAnchor,
                  );
                }}
              >
                LOCK TERRITORY
              </button>
            )}

          {territorySizeError && (
            <small className="mars-pixel-goto__error">
              {territorySizeError}
            </small>
          )}
        </div>
      )}

      {!diving &&
        hoveredPixelCoordinate && (
          <div
            className="mars-planet-map__coordinate-hud"
            aria-hidden="true"
          >
            <span>{t("mars.pixel.grid")}</span>
            <strong>
              X {hoveredPixelCoordinate.x}
              {" · "}
              Y {hoveredPixelCoordinate.y}
            </strong>
            <small>{t("mars.pixel.coordinate", { x: hoveredPixelCoordinate.x, y: hoveredPixelCoordinate.y })}</small>
          </div>
        )}

      {!diving &&
          (
            pixelDragAnchor !== null ||
            pixelDragActive ||selectedPixelLoading ||
          selectedPixel !== null ||
          selectedPixelError !== null
          ) && (
          <aside
            className="mars-pixel-detail"
            aria-live="polite"
          >
            <div className="mars-pixel-detail__header">
              <div>
                <span className="mars-pixel-detail__eyebrow">
                  MARS PIXEL REGISTRY
                </span>
                <strong>
                  TERRITORY INSPECTOR
                </strong>
              </div>

              <button
                type="button"
                className="mars-pixel-detail__close"
                aria-label={t("mars.pixel.closeSelection")}
                onClick={() => {
                  pixelRequestRef.current += 1;
                  setLockedSelectionTarget(null);
                  setPixelDragAnchor(null);
                  setHoveredPixelCoordinate(null);
                  setSelectedPixelSelection(null);
                  setSelectedPixelValuation(null);
                  setSelectedPixelSelectionError(null);
                  setSelectedPixelSelectionLoading(false);
                  setSelectedPixel(null);
                  setSelectedPixelError(null);
                  setSelectedPixelLoading(false);
                }}
              >
                ×
              </button>
            </div>

            {pixelDragActive && (
              <div className="mars-pixel-detail__message">
                SELECTING TERRITORY
              </div>
            )}

            {!pixelDragActive &&
              selectedPixelLoading && (
                <div className="mars-pixel-detail__message">
                  READING PRODUCTION STATE
                </div>
              )}

            {!selectedPixelLoading &&
              selectedPixelError && (
                <div className="mars-pixel-detail__message is-error">
                  {selectedPixelError}
                </div>
              )}

            {!pixelDragActive &&
              !selectedPixelLoading &&
              selectedPixelSelectionLoading && (
                <div className="mars-pixel-detail__message">
                  VALIDATING TERRITORY
                </div>
              )}

            {!selectedPixelLoading &&
              selectedPixelSelectionError && (
                <div className="mars-pixel-detail__message is-error">
                  {selectedPixelSelectionError}
                </div>
              )}

            {!selectedPixelLoading &&
              !selectedPixel &&
              pixelDragAnchor &&
              pixelBlockSelection && (
                <>
                  <div className="mars-pixel-detail__coordinate">
                    {`TERRITORY ${pixelBlockSelection.width} × ${pixelBlockSelection.height}`}
                  </div>

                  <div className="mars-pixel-detail__meta">
                    <span>TOTAL PIXELS</span>
                    <strong>
                      {pixelBlockSelection.pixelCount.toLocaleString(
                        "en-US",
                      )}
                    </strong>
                  </div>

                  <div className="mars-pixel-detail__meta">
                    <span>{t("mars.pixel.xRange")}</span>
                    <strong>
                      {pixelBlockSelection.xStart}–{pixelBlockSelection.xEnd}
                    </strong>
                  </div>

                  <div className="mars-pixel-detail__meta">
                    <span>{t("mars.pixel.yRange")}</span>
                    <strong>
                      {pixelBlockSelection.yStart}–{pixelBlockSelection.yEnd}
                    </strong>
                  </div>

                  <div className="mars-pixel-detail__meta">
                    <span>{t("mars.pixel.areaSize")}</span>
                    <strong>
                      {pixelBlockSelection.width} × {pixelBlockSelection.height}
                    </strong>
                  </div>
                </>
              )}

            {!selectedPixelLoading &&
              selectedPixel && (
                <>
                  <div className="mars-pixel-detail__coordinate">
                    {pixelBlockSelection
                      ? `TERRITORY ${pixelBlockSelection.width} × ${pixelBlockSelection.height}`
                      : `PIXEL X${selectedPixel.x_start} / Y${selectedPixel.y_start}`}
                  </div>

                  {pixelBlockSelection && (
                    <div className="mars-pixel-detail__meta">
                      <span>TOTAL PIXELS</span>
                      <strong>
                        {pixelBlockSelection.pixelCount.toLocaleString(
                          "en-US",
                        )}
                      </strong>
                    </div>
                  )}

                  <div className="mars-pixel-detail__meta">
                    <span>{t("mars.pixel.xRange")}</span>
                    <strong>
                      {pixelBlockSelection
                        ? `${pixelBlockSelection.xStart}–${pixelBlockSelection.xEnd}`
                        : `${selectedPixel.x_start}–${selectedPixel.x_end}`}
                    </strong>
                  </div>

                  <div className="mars-pixel-detail__meta">
                    <span>{t("mars.pixel.yRange")}</span>
                    <strong>
                      {pixelBlockSelection
                        ? `${pixelBlockSelection.yStart}–${pixelBlockSelection.yEnd}`
                        : `${selectedPixel.y_start}–${selectedPixel.y_end}`}
                    </strong>
                  </div>

                  <div className="mars-pixel-detail__meta">
                    <span>{t("mars.pixel.areaSize")}</span>
                    <strong>
                      {pixelBlockSelection
                        ? `${pixelBlockSelection.width} × ${pixelBlockSelection.height}`
                        : `${selectedPixel.width} × ${selectedPixel.height}`}
                    </strong>
                  </div>

                  <div className="mars-pixel-detail__meta">
                    <span>{t("mars.pixel.referenceValue")}</span>
                    <strong>
                      {selectedPixelValuation
                        ? new Intl.NumberFormat(
                            "en-US",
                            {
                              style: "currency",
                              currency:
                                selectedPixelValuation.reference_currency_code,
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            },
                          ).format(
                            selectedPixelValuation.total_reference_value_minor /
                              100,
                          )
                        : "—"}
                    </strong>
                  </div>

                  <div className="mars-pixel-detail__meta">
                    <span>{t("mars.pixel.minimumPurchase")}</span>
                    <strong>
                      {selectedPixelValuation
                        ? `${selectedPixelValuation.minimum_purchase_pixels} PIXELS`
                        : "—"}
                    </strong>
                  </div>

                  {(() => {
                    const selectionLocked =
                      lockedSelectionTarget !== null;

                    const status =
                      selectionLocked
                        ? selectedPixelSelection?.selection_status
                        : selectedPixel.block_status;

                    const purchasable =
                      selectionLocked
                        ? selectedPixelSelection?.purchasable
                        : selectedPixel.purchasable;

                    const reservedZoneName =
                      selectionLocked
                        ? selectedPixelSelection?.reserved_zone_name
                        : selectedPixel.reserved_zone_name;

                    const reservedZoneCode =
                      selectionLocked
                        ? selectedPixelSelection?.reserved_zone_code
                        : selectedPixel.reserved_zone_code;

                    const reservedOverlapCount =
                      selectionLocked
                        ? selectedPixelSelection?.reserved_overlap_count
                        : null;

                    const ownedOverlapCount =
                      selectionLocked
                        ? selectedPixelSelection?.owned_overlap_count
                        : null;

                    if (
                      selectionLocked &&
                      (
                        selectedPixelSelectionLoading ||
                        selectedPixelSelectionError ||
                        !selectedPixelSelection
                      )
                    ) {
                      return null;
                    }

                    if (!status) {
                      return null;
                    }

                    return (
                      <>
                        <div
                          className={[
                            "mars-pixel-detail__status",
                            `is-${status}`,
                          ].join(" ")}
                        >
                          {reservedZoneCode === "ARES_PROTECTED"
                            ? "PROTECTED"
                            : status.toUpperCase()}
                        </div>

                        {selectionLocked && (
                          <>
                            <div className="mars-pixel-detail__meta">
                              <span>RESERVED OVERLAP</span>
                              <strong>
                                {reservedOverlapCount ?? 0}
                              </strong>
                            </div>

                            <div className="mars-pixel-detail__meta">
                              <span>OWNED OVERLAP</span>
                              <strong>
                                {ownedOverlapCount ?? 0}
                              </strong>
                            </div>

                            <div className="mars-pixel-detail__meta">
                              <span>AVAILABILITY</span>
                              <strong>
                                {reservedZoneCode === "ARES_PROTECTED"
                                  ? "PROTECTED"
                                  : status === "available"
                                    ? "AVAILABLE"
                                    : "UNAVAILABLE"}
                              </strong>
                            </div>
                          </>
                        )}

                        {reservedZoneCode === "ARES_PROTECTED" && (
                          <>
                            <div className="mars-pixel-detail__commercial">
                              NOT FOR SALE
                            </div>

                            <div className="mars-pixel-detail__meta">
                              <span>PROTECTED TERRITORY</span>
                              <strong>
                                {reservedZoneName ?? "Ares Sector"}
                              </strong>
                            </div>
                          </>
                        )}

                        {status === "available" &&
                          reservedZoneCode !== "ARES_PROTECTED" && (
                          <div className="mars-pixel-detail__commercial">
                            {purchasable
                              ? "COMMERCIAL ACCESS ACTIVE"
                              : t("mars.pixel.salesLocked")}
                          </div>
                        )}

                        {status === "reserved" &&
                          reservedZoneCode !== "ARES_PROTECTED" && (
                          <>
                            <div className="mars-pixel-detail__commercial">
                              NOT FOR SALE
                            </div>

                            {reservedZoneName && (
                              <div className="mars-pixel-detail__meta">
                                <span>
                                  RESERVED ZONE
                                </span>
                                <strong>
                                  {reservedZoneName}
                                </strong>
                              </div>
                            )}

                            {reservedZoneCode && (
                              <div className="mars-pixel-detail__meta">
                                <span>
                                  ZONE CODE
                                </span>
                                <strong>
                                  {reservedZoneCode}
                                </strong>
                              </div>
                            )}
                          </>
                        )}

                        {status === "owned" &&
                          !selectionLocked && (
                          <>
                            {selectedPixel.advertiser_name && (
                              <div className="mars-pixel-detail__meta">
                                <span>
                                  OWNER
                                </span>
                                <strong>
                                  {
                                    selectedPixel.advertiser_name
                                  }
                                </strong>
                              </div>
                            )}

                            {selectedPixel.creative_title && (
                              <div className="mars-pixel-detail__meta">
                                <span>
                                  CREATIVE
                                </span>
                                <strong>
                                  {
                                    selectedPixel.creative_title
                                  }
                                </strong>
                              </div>
                            )}
                          </>
                        )}

                        {status === "owned" &&
                          selectionLocked && (
                          <div className="mars-pixel-detail__commercial">
                            OWNED AREA OVERLAP
                          </div>
                        )}

                        {selectedPixelSelection?.selection_status === "available" && (
                          <div className="mars-purchase-flow">
                            <section className="mars-purchase-flow__section">
                              <div className="mars-purchase-flow__heading">
                                <span>01</span>
                                <div>
                                  <small>01 TERRITORY</small>
                                  <strong>
                                    {selectedPixelSelection.width} × {selectedPixelSelection.height}
                                  </strong>
                                </div>
                              </div>

                              <div className="mars-purchase-flow__facts">
                                <span>
                                  {selectedPixelSelection.pixel_count.toLocaleString("en-US")} PIXELS
                                </span>
                                <span>
                                  {selectedPixelSelection.selection_status.toUpperCase()}
                                </span>
                              </div>
                            </section>

                            <section className="mars-purchase-flow__section">
                              <div className="mars-purchase-flow__heading">
                                <span>02</span>
                                <div>
                                  <small>YOUR TIER</small>
                                  <strong>
                                    {selectedPixelContentTierLoading
                                      ? "CALCULATING..."
                                      : selectedPixelContentTier?.tier_key ?? "—"}
                                  </strong>
                                </div>
                              </div>

                              {selectedPixelContentTierError && (
                                <div className="mars-purchase-flow__error">
                                  {selectedPixelContentTierError}
                                </div>
                              )}

                              {selectedPixelContentTier && (
                                <>
                                  <div className="mars-purchase-flow__features">
                                    <span>
                                      {selectedPixelContentTier.description_max_chars} CHAR DESCRIPTION
                                    </span>
                                    <span>
                                      {selectedPixelContentTier.image_allowed
                                        ? "IMAGE"
                                        : "NO IMAGE"}
                                    </span>
                                    <span>
                                      {selectedPixelContentTier.max_links} LINK
                                      {selectedPixelContentTier.max_links === 1 ? "" : "S"}
                                    </span>
                                    <span>
                                      {selectedPixelContentTier.cta_allowed
                                        ? "CTA"
                                        : "CTA LOCKED"}
                                    </span>
                                    <span>
                                      {selectedPixelContentTier.socials_allowed
                                        ? "SOCIAL LINKS"
                                        : "SOCIALS LOCKED"}
                                    </span>
                                    {selectedPixelContentTier.analytics_allowed && (
                                      <span>ANALYTICS</span>
                                    )}
                                    {selectedPixelContentTier.premium && (
                                      <span>PREMIUM</span>
                                    )}
                                  </div>

                                  {selectedPixelContentTier.max_pixels !== null && (
                                    <div className="mars-purchase-flow__upgrade">
                                      NEXT TIER STARTS AT{" "}
                                      {(selectedPixelContentTier.max_pixels + 1).toLocaleString("en-US")} PIXELS
                                    </div>
                                  )}
                                </>
                              )}
                            </section>

                            <section className="mars-purchase-flow__section">
                              <div className="mars-purchase-flow__heading">
                                <span>03</span>
                                <div>
                                  <small>TERRITORY COLOR</small>
                                  <strong>
                                    {selectedPixelColorKey ?? "AUTO"}
                                  </strong>
                                </div>
                              </div>
                            </section>
                          </div>
                        )}

                        {selectedPixelSelection?.selection_status === "available" && (
                <div className="mars-pixel-color">
                  <div className="mars-pixel-color__current">
                    <span
                      className="mars-pixel-color__swatch"
                      style={{
                        background: selectedPixelColor,
                      }}
                    />
                    <div>
                      <small>TERRITORY COLOR</small>
                      <strong>
                        {pixelColorLoading
                          ? "SELECTING..."
                          : selectedPixelColorKey ?? "UNAVAILABLE"}
                      </strong>
                      <em>
                        {pixelColorMode === "auto"
                          ? "AUTO SELECTED"
                          : "MANUAL SELECTION"}
                      </em>
                    </div>

                    <button
                      type="button"
                      disabled={
                        pixelColorLoading ||
                        pixelColorOptions.length === 0
                      }
                      onClick={() =>
                        setPixelColorPickerOpen(
                          (open) => !open,
                        )
                      }
                    >
                      {pixelColorPickerOpen
                        ? "CLOSE"
                        : "CHANGE COLOR"}
                    </button>
                  </div>

                  {pixelColorError && (
                    <div className="mars-pixel-color__error">
                      {pixelColorError}
                    </div>
                  )}

                  {pixelColorPickerOpen && (
                    <div className="mars-pixel-color__palette">
                      {pixelColorOptions.map((option) => {
                        const color =
                          MARS_PIXEL_TERRITORY_COLORS[
                            option.color_key
                          ] ?? "#63f5ff";

                        const active =
                          selectedPixelColorKey ===
                          option.color_key;

                        return (
                          <button
                            key={option.color_key}
                            type="button"
                            className={[
                              "mars-pixel-color__option",
                              active ? "is-active" : "",
                              !option.allowed
                                ? "is-disabled"
                                : "",
                            ]
                              .filter(Boolean)
                              .join(" ")}
                            disabled={!option.allowed}
                            title={
                              option.allowed
                                ? option.color_key
                                : `${option.color_key} · adjacent color unavailable`
                            }
                            aria-label={
                              option.allowed
                                ? `Select ${option.color_key}`
                                : `${option.color_key} unavailable because of edge adjacency`
                            }
                            onClick={() => {
                              if (!option.allowed) {
                                return;
                              }

                              setSelectedPixelColorKey(
                                option.color_key,
                              );
                              setPixelColorMode("manual");
                              setPixelColorPickerOpen(false);
                            }}
                          >
                            <span
                              style={{
                                background: color,
                              }}
                            />
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

                                      {selectedPixelSelection?.selection_status === "available" && (
                          <div className="mars-purchase-flow mars-purchase-flow--final">
                            <section className="mars-purchase-flow__section">
                              <div className="mars-purchase-flow__heading">
                                <span>04</span>
                                <div>
                                  <small>04 CONTENT & BRANDING</small>
                                  <strong>
                                    {selectedPixelContentTier
                                      ? `${selectedPixelContentTier.territory_name_max_chars} CHAR NAME`
                                      : "TIER REQUIRED"}
                                  </strong>
                                </div>
                              </div>

                              {selectedPixelContentTier && (
                                <div className="mars-purchase-flow__features">
                                  <span>
                                    DESCRIPTION {selectedPixelContentTier.description_max_chars}
                                  </span>
                                  <span>
                                    {selectedPixelContentTier.image_allowed
                                      ? "IMAGE UNLOCKED"
                                      : "IMAGE LOCKED"}
                                  </span>
                                  <span>
                                    {selectedPixelContentTier.max_links} LINK
                                    {selectedPixelContentTier.max_links === 1 ? "" : "S"}
                                  </span>
                                  <span>
                                    {selectedPixelContentTier.cta_allowed
                                      ? "CTA UNLOCKED"
                                      : "CTA LOCKED"}
                                  </span>
                                </div>
                              )}
                            </section>

                            <section className="mars-purchase-flow__section">
                              <div className="mars-purchase-flow__heading">
                                <span>05</span>
                                <div>
                                  <small>PRICE</small>
                                  <strong>
                                    {selectedPixelValuation
                                      ? new Intl.NumberFormat(
                                          "en-US",
                                          {
                                            style: "currency",
                                            currency:
                                              selectedPixelValuation.reference_currency_code,
                                            minimumFractionDigits: 2,
                                            maximumFractionDigits: 2,
                                          },
                                        ).format(
                                          selectedPixelValuation.total_reference_value_minor / 100,
                                        )
                                      : "—"}
                                  </strong>
                                </div>
                              </div>

                              {selectedPixelValuation && (
                                <div className="mars-purchase-flow__facts">
                                  <span>
                                    {selectedPixelValuation.pixel_count.toLocaleString("en-US")} PIXELS
                                  </span>
                                  <span>
                                    MIN {selectedPixelValuation.minimum_purchase_pixels} PIXELS
                                  </span>
                                </div>
                              )}
                            </section>

                            <section className="mars-purchase-flow__section">
                              <div className="mars-purchase-flow__heading">
                                <span>06</span>
                                <div>
                                  <small>PURCHASE</small>
                                  <strong>
                                    {purchasable
                                      ? "COMMERCIAL ACCESS ACTIVE"
                                      : "SALES CURRENTLY LOCKED"}
                                  </strong>
                                </div>
                              </div>

                              <button
                                type="button"
                                className="mars-purchase-flow__purchase"
                                disabled={!purchasable}
                              >
                                {purchasable
                                  ? `CLAIM ${selectedPixelSelection.pixel_count.toLocaleString("en-US")} MARS PIXELS`
                                  : "PURCHASE LOCKED"}
                              </button>

                              <div className="mars-purchase-flow__notice">
                                TERRITORY AVAILABILITY, PRICE AND TIER ARE SERVER VERIFIED.
                              </div>
                            </section>
                          </div>
                        )}

<div className="mars-pixel-detail__grid">
                          GRID V
                          {selectionLocked
                            ? selectedPixelSelection?.grid_version
                            : selectedPixel.grid_version}
                        </div>
                      </>
                    );
                  })()}
                </>
              )}
          </aside>
        )}

      <Canvas
        className="mars-planet-map__canvas"
        camera={{
          position: [
            0,
            0,
            typeof window !== "undefined" &&
            window.matchMedia(
              "(max-width: 680px) and (pointer: coarse)",
            ).matches
              ? 9.0
              : typeof window !== "undefined" &&
                  window.matchMedia(
                    "(max-width: 900px)",
                  ).matches
                ? 7.15
                : 6.45,
          ],
          fov:
            typeof window !== "undefined" &&
            window.matchMedia("(max-width: 900px)").matches
              ? 46
              : 42,
          near: 0.1,
          far: 120,
        }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: true,
          powerPreference:
            "high-performance",
        }}
        onCreated={({ gl }) => {
          gl.setClearColor(0x000000, 0);
        }}
      >
        <MarsScene
          pixelDragActive={pixelDragActive}
          onDragStateChange={handlePixelDragStateChange}
          onPixelDragStart={(coordinate) => {
            if (
              mobileTouchMode ||
              territorySelectionLocked
            ) {
              return;
            }

            const preview =
              getTerritoryPreview(coordinate);

            if (!preview) {
              return;
            }

            setPixelDragAnchor(preview.anchor);
            setLockedSelectionTarget(preview.target);
          }}
          onPixelDragSelect={(anchor) => {
            if (mobileTouchMode) {
              return;
            }

            void handleTerritorySizeSelect(anchor);
          }}
          selectedPixelCoordinate={
            pixelDragAnchor ??
            (
              selectedPixel
                ? {
                    x: selectedPixel.x_start,
                    y: selectedPixel.y_start,
                  }
                : null
            )
          }
          lockedSelectionCoordinate={
            lockedSelectionTarget
          }
          territorySelectionColor={
            selectedPixelColorKey
              ? selectedPixelColorRgb
              : territorySelectionColor
          }
          onPixelSelect={(coordinate) => {
            if (!mobileTouchMode) {
              void handleTerritorySizeSelect(
                coordinate,
              );
              return;
            }

            if (territorySelectionLocked) {
              return;
            }

            const preview =
              getTerritoryPreview(coordinate);

            if (!preview) {
              return;
            }

            setHoveredPixelCoordinate(null);
            setPixelDragAnchor(preview.anchor);
            setLockedSelectionTarget(
              preview.target,
            );
          }}
          onPixelHover={(coordinate) => {
            if (mobileTouchMode) {
              setHoveredPixelCoordinate(null);
              return;
            }

            setHoveredPixelCoordinate(coordinate);

            if (territorySelectionLocked) {
              return;
            }

            if (!coordinate) {
              if (!pixelDragActive) {
                setPixelDragAnchor(null);
                setLockedSelectionTarget(null);
              }
              return;
            }

            const preview =
              getTerritoryPreview(coordinate);

            if (!preview || pixelDragActive) {
              return;
            }

            setPixelDragAnchor(preview.anchor);
            setLockedSelectionTarget(preview.target);
          }}
          sectors={sectors}
          currentSectorId={
            currentSectorId
          }
          selectedSectorId={
            selectedSectorId
          }
          onSelectSector={
            onSelectSector
          }
          onEnterSector={
            onEnterSector
          }
          diving={diving}
          pixelNetworkStatus={
            pixelNetworkStatus
          }
          pixelAllocations={
            pixelAllocations
          }
          pixelReservedZones={
            pixelReservedZones
          }
        />
      </Canvas>

      {selectedSector && (
        <aside
          className="mars-planet-map__focus-panel"
        >
          <button
            type="button"
            className="mars-planet-map__focus-close"
            aria-label="Close sector"
            onClick={() =>
              onSelectSector(null)
            }
          >
            ×
          </button>

          <span className="mars-planet-map__focus-eyebrow">
            {current
              ? "MY TERRITORY"
              : t("mars.pixel.selectedSector")}
          </span>

          <h3>
            {selectedSector.sector_name}
          </h3>

          <div className="mars-planet-map__focus-code">
            {selectedSector.sector_code}
          </div>

          <div className="mars-planet-map__focus-stats">
            <div>
              <span>{t("mars.sector.colonies")}</span>

              <strong>
                {
                  selectedSector.current_colonies
                }
                {" / "}
                {
                  selectedSector.max_colonies
                }
              </strong>
            </div>

            <div>
              <span>
                {t("mars.sector.contribution")}
              </span>

              <strong>
                {
                  selectedSector.total_contribution
                }
              </strong>
            </div>

            <div>
              <span>{t("mars.sector.status")}</span>

              <strong>
                {
                  selectedSector.sector_status
                }
              </strong>
            </div>
          </div>

          {selectedSectorIsAres ? (
            <div className="mars-planet-map__access-protocol">
              <div className="mars-planet-map__access-header">
                <div
                  className={[
                    "mars-planet-map__access-hex",
                    aresAccess?.unlocked
                      ? "is-unlocked"
                      : "is-locked",
                  ].join(" ")}
                  aria-hidden="true"
                >
                  <span>
                    {aresAccess?.unlocked ? "✓" : "⌁"}
                  </span>
                </div>

                <div>
                  <span className="mars-planet-map__access-kicker">
                    {t("mars.ares.accessProtocol")}
                  </span>
                  <strong>
                    {aresAccessLoading
                      ? "VERIFYING ACCESS"
                      : aresAccess?.unlocked
                        ? t("mars.ares.accessAuthorized")
                        : "SECURITY LOCK ACTIVE"}
                  </strong>
                </div>
              </div>

              <div className="mars-planet-map__access-requirements">
                <div
                  className={
                    aresAccess?.telegram_verified
                      ? "is-complete"
                      : "is-pending"
                  }
                >
                  <span>{t("mars.ares.telegramVerification")}</span>
                  <strong>
                    {aresAccess?.telegram_verified
                      ? "VERIFIED ✓"
                      : "LOCKED"}
                  </strong>
                </div>

                <div
                  className={
                    aresAccess?.x_verified
                      ? "is-complete"
                      : "is-pending"
                  }
                >
                  <span>{t("mars.ares.xVerification")}</span>
                  <strong>
                    {aresAccess?.x_verified
                      ? "VERIFIED ✓"
                      : "LOCKED"}
                  </strong>
                </div>

                <div
                  className={
                    aresAccess &&
                    aresAccess.mining_days >=
                      aresAccess.required_mining_days
                      ? "is-complete"
                      : "is-pending"
                  }
                >
                  <span>{t("mars.ares.miningDays")}</span>
                  <strong>
                    {aresAccessLoading
                      ? "SYNCING"
                      : `${aresAccess?.mining_days ?? 0} / ${
                          aresAccess?.required_mining_days ?? 7
                        }`}
                  </strong>
                </div>
              </div>

              <button
                type="button"
                className={[
                  "mars-planet-map__enter",
                  aresAccess?.unlocked
                    ? "is-ares"
                    : "is-locked",
                ].join(" ")}
                disabled={
                  aresAccessLoading ||
                  !aresAccess?.unlocked
                }
                aria-disabled={
                  aresAccessLoading ||
                  !aresAccess?.unlocked
                }
                onClick={() => {
                  if (
                    aresAccessLoading ||
                    !aresAccess?.unlocked
                  ) {
                    return;
                  }

                  onEnterSector(
                    selectedSector.sector_id,
                  );
                }}
              >
                {aresAccessLoading
                  ? "VERIFYING ACCESS"
                  : aresAccess?.unlocked
                    ? t("mars.ares.enter")
                    : "ARES LOCKED"}
                <span>
                  {aresAccess?.unlocked ? "→" : "×"}
                </span>
              </button>
            </div>
          ) : (
            <>
              <div className="mars-planet-map__exploration-state is-locked">
                <span
                  className="mars-planet-map__exploration-dot"
                  aria-hidden="true"
                />
                <strong>EXPLORATION LOCKED</strong>
              </div>

              <button
                type="button"
                className="mars-planet-map__enter is-locked"
                disabled
                aria-disabled="true"
              >
                EXPLORATION LOCKED
                <span>×</span>
              </button>
            </>
          )}
        </aside>
      )}

      <div className="mars-planet-map__controls">
        <span>
          {t("mars.orbit.dragRotate")}
        </span>

        <span>
          {t("mars.orbit.scrollZoom")}
        </span>
      </div>
    </section>
  );
}

useTexture.preload(
  "/images/mars/nasa-mars-world.jpg",
);
