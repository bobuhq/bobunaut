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
  purchaseMarsPixelTerritory,
  checkoutMarsPixelSolanaPayment,
  verifyMarsPixelSolanaPayment,
  recordMarsPixelSolanaTransactionSignature,
  getMyMarsPixelSolanaRecovery,
  saveMarsPixelCreative,
  uploadMarsPixelCreativeImage,
  deleteMarsPixelCreativeImage,
  getMyMarsPixelCreative,
  getMyMarsPixelTestAccess,
  claimMarsDevnetFaucet,
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
  MarsPixelCreativeLink,
  MarsPixelOwnerCreativeDetail,
} from "../MarsPixelNetworkService";

import {
  MarsPixelOverlay,
  type MarsPixelOwnerHoverPreview,
} from "./MarsPixelOverlay";

import {
  connectMarsSolanaWallet,
  getMarsSolanaWalletSnapshot,
  isMarsMobileBrowser,
  isMarsSolanaWalletAvailable,
  openMarsInPhantomBrowser,
} from "../solana/MarsSolanaWalletService";

import type {
  MarsSolanaWalletSnapshot,
} from "../solana/MarsSolanaWalletService";

import type {
  MarsPixelSolanaCheckoutResult,
} from "../MarsPixelNetworkService";

import {
  prepareMarsPixelSolanaPaymentTransaction,
} from "../solana/MarsSolanaPaymentTransaction";

import {
  signAndBroadcastMarsSolanaPayment,
} from "../solana/MarsSolanaPaymentSender";

import {
  confirmMarsSolanaPaymentFinalized,
} from "../solana/MarsSolanaPaymentConfirmation";

import {
  createMarsPixelBlockSelectionV1,
} from "./MarsPixelGridMapper";

import { useLanguage } from "../../language";
import { supabase } from "../../../lib/supabase";
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
  pixelSelectionMode: boolean;
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
  onPixelSelect: (
    coordinate: {
      x: number;
      y: number;
    },
    allocation: MarsPixelPublicAllocation | null,
  ) => void;
  onPixelHover: (
    coordinate: {
      x: number;
      y: number;
      blockX: number;
      blockY: number;
    } | null,
  ) => void;
  ownerHoverPreview: MarsPixelOwnerHoverPreview | null;
  onOwnedTerritoryHover: (
    allocationId: string | null,
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
  pixelSelectionMode,
  lockedSelectionCoordinate,
  territorySelectionColor,
  onPixelSelect,
  onPixelDragStart,
  onPixelDragSelect,
  onDragStateChange,
  onPixelHover,
  ownerHoverPreview,
  onOwnedTerritoryHover,
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
          selectionEnabled={pixelSelectionMode}
          selectedPixel={selectedPixelCoordinate}
          lockedSelectionPixel={lockedSelectionCoordinate}
          territorySelectionColor={territorySelectionColor}
          onPixelSelect={onPixelSelect}
          onPixelDragStart={onPixelDragStart}
          onPixelDragSelect={onPixelDragSelect}
          onDragStateChange={onDragStateChange}
          onPixelHover={onPixelHover}
          ownerHoverPreview={ownerHoverPreview}
          onOwnedTerritoryHover={
            onOwnedTerritoryHover
          }
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
  const { t, language } = useLanguage();
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

  const [pixelSelectionMode, setPixelSelectionMode] =
    useState(false);

  const [
    marsPixelTestAccess,
    setMarsPixelTestAccess,
  ] = useState(false);

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
            t("mars.pixel.error.noEligibleColor"),
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
            : t("mars.pixel.error.colorOptionsFailed"),
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
        t("mars.pixel.error.selectionDataUnavailable"),
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
        t("mars.pixel.minimumTerritorySize"),
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
          t("mars.pixel.error.tierDataUnavailable"),
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

  const [
    marsPixelPurchaseLoading,
    setMarsPixelPurchaseLoading,
  ] = useState(false);

  const [marsPurchaseStep, setMarsPurchaseStep] = useState<
    1 | 2 | 3 | 4 | 5
  >(1);
  const [marsPurchaseAgreementAccepted, setMarsPurchaseAgreementAccepted] =
    useState(false);

  const resetMarsPurchaseJourney = () => {
    setMarsPurchaseStep(1);
    setMarsPurchaseAgreementAccepted(false);
    setMarsSolanaCheckout(null);
    setMarsSolanaTransactionSignature(null);
    marsSolanaCheckoutIdempotencyKeyRef.current = null;
    setMarsSolanaPaymentStage(
      marsSolanaWallet?.connected
        ? "wallet_connected"
        : "idle",
    );
  };

  const [
    marsPixelPurchaseError,
    setMarsPixelPurchaseError,
  ] = useState<string | null>(null);

  const [
    marsPixelPurchaseSuccess,
    setMarsPixelPurchaseSuccess,
  ] = useState<string | null>(null);

  const marsSolanaCheckoutIdempotencyKeyRef =
    useRef<string | null>(null);

  const marsSolanaRecoveryWalletRef =
    useRef<string | null>(null);

  const [
    marsSolanaWallet,
    setMarsSolanaWallet,
  ] = useState<MarsSolanaWalletSnapshot | null>(
    () => getMarsSolanaWalletSnapshot(),
  );

  const [
    marsSolanaWalletAvailable,
    setMarsSolanaWalletAvailable,
  ] = useState(
    () => isMarsSolanaWalletAvailable(),
  );

  const marsSolanaMobileFallbackAvailable =
    isMarsMobileBrowser();

  const [
    marsSolanaWalletConnecting,
    setMarsSolanaWalletConnecting,
  ] = useState(false);

  const [
    marsSolanaCheckout,
    setMarsSolanaCheckout,
  ] = useState<MarsPixelSolanaCheckoutResult | null>(
    null,
  );

  const [
    marsSolanaTransactionSignature,
    setMarsSolanaTransactionSignature,
  ] = useState<string | null>(null);

  const [
    marsSolanaPaymentStage,
    setMarsSolanaPaymentStage,
  ] = useState<
    | "idle"
    | "wallet_connected"
    | "checkout_ready"
    | "awaiting_signature"
    | "broadcast"
    | "verifying"
    | "verified"
    | "failed"
  >("idle");

  const handleMarsSolanaWalletConnect = async () => {
    if (marsSolanaWalletConnecting) {
      return;
    }

    if (
      !isMarsSolanaWalletAvailable() &&
      openMarsInPhantomBrowser()
    ) {
      return;
    }

    setMarsSolanaWalletConnecting(true);
    setMarsPixelPurchaseError(null);
    setMarsPixelPurchaseSuccess(null);

    try {
      const wallet =
        await connectMarsSolanaWallet();

      setMarsSolanaWallet(wallet);
      setMarsSolanaWalletAvailable(true);
      setMarsSolanaCheckout(null);
      setMarsSolanaTransactionSignature(null);
      setMarsSolanaPaymentStage(
        "wallet_connected",
      );

    } catch (error) {
      console.error(
        "Mars Solana wallet connection failed.",
        error,
      );

      setMarsSolanaPaymentStage("failed");
      setMarsPixelPurchaseError(
        error instanceof Error
          ? error.message
          : t("mars.pixel.error.solanaConnectFailed"),
      );
    } finally {
      setMarsSolanaWalletConnecting(false);
    }
  };

  const [
    marsDevnetFaucetLoading,
    setMarsDevnetFaucetLoading,
  ] = useState(false);

  const [
    marsDevnetFaucetMessage,
    setMarsDevnetFaucetMessage,
  ] = useState<string | null>(null);

  const [
    marsDevnetFaucetError,
    setMarsDevnetFaucetError,
  ] = useState<string | null>(null);

  const handleMarsDevnetFaucetClaim = async () => {
    if (marsDevnetFaucetLoading) {
      return;
    }

    setMarsDevnetFaucetMessage(null);
    setMarsDevnetFaucetError(null);

    if (
      !marsSolanaWallet?.connected ||
      !marsSolanaWallet.publicKey
    ) {
      try {
        await handleMarsSolanaWalletConnect();
      } catch {
      }

      return;
    }

    try {
      const {
        data: { session },
        error: sessionError,
      } = await supabase.auth.getSession();

      if (sessionError) {
        throw new Error(
          `Authenticated session could not be loaded: ${sessionError.message}`,
        );
      }

      if (!session?.access_token) {
        const { error: googleLoginError } =
          await supabase.auth.signInWithOAuth({
            provider: "google",
            options: {
              redirectTo: new URL(
                import.meta.env.BASE_URL,
                window.location.origin,
              ).toString(),
            },
          });

        if (googleLoginError) {
          throw new Error(
            `Google sign-in failed: ${googleLoginError.message}`,
          );
        }

        return;
      }

      setMarsDevnetFaucetLoading(true);

      const result = await claimMarsDevnetFaucet(
        marsSolanaWallet.publicKey,
      );

      setMarsDevnetFaucetMessage(
        `${result.amountSol} DEVNET SOL SENT`,
      );
    } catch (error) {
      console.error(
        "BOBU Devnet faucet request failed.",
        error,
      );

      setMarsDevnetFaucetError(
        error instanceof Error
          ? error.message
          : "Unable to request Devnet SOL.",
      );
    } finally {
      setMarsDevnetFaucetLoading(false);
    }
  };

  const [
    ownerHoverPreview,
    setOwnerHoverPreview,
  ] = useState<MarsPixelOwnerHoverPreview | null>(null);

  const ownerHoverRequestRef = useRef(0);

  const handleOwnedTerritoryHover = (
    allocationId: string | null,
  ) => {
    const requestId =
      ++ownerHoverRequestRef.current;

    if (!allocationId) {
      setOwnerHoverPreview(null);
      return;
    }

    setOwnerHoverPreview(null);

    void getMyMarsPixelCreative(allocationId)
      .then((detail) => {
        if (
          requestId !== ownerHoverRequestRef.current ||
          !detail
        ) {
          return;
        }

        setOwnerHoverPreview({
          allocation_id: detail.allocation_id,
          pixel_count: detail.pixel_count,
          creative_status: detail.creative_status,
          title: detail.title,
          image_url: detail.image_url,
          destination_url: detail.destination_url,
          cta_label: detail.cta_label,
        });
      })
      .catch((error) => {
        if (
          requestId !== ownerHoverRequestRef.current
        ) {
          return;
        }

        console.error(
          "Mars Pixel owner hover preview lookup failed.",
          error,
        );

        setOwnerHoverPreview(null);
      });
  };

  const [creativeEditorOpen, setCreativeEditorOpen] =
    useState(false);
  const [creativeTitle, setCreativeTitle] =
    useState("");
  const [creativeDescription, setCreativeDescription] =
    useState("");
  const [creativeImageUrl, setCreativeImageUrl] =
    useState("");
  const [creativeImageFile, setCreativeImageFile] =
    useState<File | null>(null);
  const [creativeImageUploading, setCreativeImageUploading] =
    useState(false);
  const [creativeDestinationUrl, setCreativeDestinationUrl] =
    useState("");
  const [creativeCtaLabel, setCreativeCtaLabel] =
    useState("");
  const [creativeLinks, setCreativeLinks] =
    useState<MarsPixelCreativeLink[]>([]);
  const [
    creativeOwnerDetail,
    setCreativeOwnerDetail,
  ] = useState<MarsPixelOwnerCreativeDetail | null>(null);
  const [
    creativeOwnerLoading,
    setCreativeOwnerLoading,
  ] = useState(false);
  const [creativeSaveLoading, setCreativeSaveLoading] =
    useState(false);
  const [creativeSaveError, setCreativeSaveError] =
    useState<string | null>(null);
  const [creativeSaveSuccess, setCreativeSaveSuccess] =
    useState<string | null>(null);

  const ownedTerritoryPixelCount =
    selectedPixel?.block_status === "owned"
      ? selectedPixel.width * selectedPixel.height
      : null;

  const [ownedTerritoryTier, setOwnedTerritoryTier] =
    useState<MarsPixelContentTier | null>(null);

  useEffect(() => {
    let active = true;

    setCreativeEditorOpen(false);
    setCreativeOwnerDetail(null);
    setCreativeSaveError(null);
    setCreativeSaveSuccess(null);
    setCreativeImageFile(null);

    if (
      selectedPixel?.block_status !== "owned" ||
      !selectedPixel.allocation_id
    ) {
      setCreativeOwnerLoading(false);
      setCreativeTitle("");
      setCreativeDescription("");
      setCreativeImageUrl("");
      setCreativeDestinationUrl("");
      setCreativeCtaLabel("");
      setCreativeLinks([]);

      return () => {
        active = false;
      };
    }

    setCreativeOwnerLoading(true);

    void getMyMarsPixelCreative(
      selectedPixel.allocation_id,
    )
      .then((detail) => {
        if (!active) {
          return;
        }

        setCreativeOwnerDetail(detail);

        if (!detail) {
          setCreativeTitle("");
          setCreativeDescription("");
          setCreativeImageUrl("");
          setCreativeDestinationUrl("");
          setCreativeCtaLabel("");
          setCreativeLinks([]);
          return;
        }

        setCreativeTitle(
          detail.title ??
            selectedPixel.creative_title ??
            "",
        );
        setCreativeDescription(
          detail.description ?? "",
        );
        setCreativeImageUrl(
          detail.image_url ??
            selectedPixel.creative_image_url ??
            "",
        );
        setCreativeDestinationUrl(
          detail.destination_url ?? "",
        );
        setCreativeCtaLabel(
          detail.cta_label ?? "",
        );
        setCreativeLinks(detail.links);
      })
      .catch((error) => {
        console.error(
          "Mars Pixel owner creative lookup failed.",
          error,
        );

        if (active) {
          setCreativeOwnerDetail(null);
        }
      })
      .finally(() => {
        if (active) {
          setCreativeOwnerLoading(false);
        }
      });

    return () => {
      active = false;
    };
  }, [
    selectedPixel?.allocation_id,
    selectedPixel?.block_status,
    selectedPixel?.creative_image_url,
    selectedPixel?.creative_title,
  ]);

  useEffect(() => {
    let active = true;

    if (
      !creativeEditorOpen ||
      !creativeOwnerDetail ||
      !ownedTerritoryPixelCount ||
      ownedTerritoryPixelCount < 50
    ) {
      setOwnedTerritoryTier(null);
      return () => {
        active = false;
      };
    }

    void getMarsPixelContentTier(
      ownedTerritoryPixelCount,
    )
      .then((tier) => {
        if (active) {
          setOwnedTerritoryTier(tier);
          setCreativeLinks((current) =>
            current
              .filter(
                (link) =>
                  tier.socials_allowed ||
                  link.type === "website",
              )
              .slice(0, tier.max_links),
          );
        }
      })
      .catch((error) => {
        console.error(
          "Mars Pixel owned territory tier lookup failed.",
          error,
        );

        if (active) {
          setOwnedTerritoryTier(null);
        }
      });

    return () => {
      active = false;
    };
  }, [
    creativeEditorOpen,
    creativeOwnerDetail,
    ownedTerritoryPixelCount,
  ]);

  const handleSaveMarsPixelCreative = async () => {
    if (
      creativeSaveLoading ||
      !selectedPixel?.allocation_id ||
      !creativeOwnerDetail ||
      !ownedTerritoryTier
    ) {
      return;
    }

    setCreativeSaveLoading(true);
    setCreativeSaveError(null);
    setCreativeSaveSuccess(null);

    let uploadedObjectPath: string | null = null;

    try {
      const parsedLinks = creativeLinks
        .map((link) => ({
          type: link.type,
          url: link.url.trim(),
        }))
        .filter((link) => Boolean(link.url))
        .filter(
          (link) =>
            ownedTerritoryTier.socials_allowed ||
            link.type === "website",
        )
        .slice(0, ownedTerritoryTier.max_links);

      let finalImageUrl = creativeImageUrl;

      if (
        ownedTerritoryTier.image_allowed &&
        creativeImageFile
      ) {
        setCreativeImageUploading(true);

        const upload =
          await uploadMarsPixelCreativeImage(
            selectedPixel.allocation_id,
            creativeImageFile,
          );

        finalImageUrl = upload.publicUrl;
        uploadedObjectPath = upload.objectPath;
      }

      const result = await saveMarsPixelCreative({
        allocationId: selectedPixel.allocation_id,
        title: creativeTitle,
        description: creativeDescription,
        imageUrl: ownedTerritoryTier.image_allowed
          ? finalImageUrl
          : undefined,
        destinationUrl: creativeDestinationUrl,
        ctaLabel: ownedTerritoryTier.cta_allowed
          ? creativeCtaLabel
          : undefined,
        links: parsedLinks,
      });

      setCreativeImageUrl(finalImageUrl);
      setCreativeImageFile(null);

      setCreativeOwnerDetail((current) =>
        current
          ? {
              ...current,
              creative_id: result.creative_id,
              creative_status:
                result.creative_status,
              title: creativeTitle.trim(),
              description:
                creativeDescription.trim() || null,
              image_url:
                finalImageUrl.trim() || null,
              destination_url:
                creativeDestinationUrl.trim() ||
                null,
              cta_label:
                ownedTerritoryTier.cta_allowed
                  ? creativeCtaLabel.trim() || null
                  : null,
              links: parsedLinks,
            }
          : current,
      );

      setCreativeSaveSuccess(
        `${t("mars.pixel.submitted")} · ${result.creative_status.toUpperCase()}`,
      );
    } catch (error) {
      if (uploadedObjectPath) {
        try {
          await deleteMarsPixelCreativeImage(
            uploadedObjectPath,
          );
        } catch (cleanupError) {
          console.error(
            "Mars Pixel creative upload cleanup failed.",
            cleanupError,
          );
        }
      }

      setCreativeSaveError(
        error instanceof Error
          ? error.message
          : t("mars.pixel.error.creativeSubmissionFailed"),
      );
    } finally {
      setCreativeImageUploading(false);
      setCreativeSaveLoading(false);
    }
  };

  const territorySelectionLocked =
    selectedPixel !== null &&
    lockedSelectionTarget !== null;

  const closePixelPurchaseFlow = () => {
    pixelRequestRef.current += 1;
    setPixelSelectionMode(false);
    setPixelDragActive(false);
    setPixelDragAnchor(null);
    setHoveredPixelCoordinate(null);
    setLockedSelectionTarget(null);
    setSelectedPixel(null);
    setSelectedPixelSelection(null);
    setSelectedPixelValuation(null);
    setSelectedPixelError(null);
    setSelectedPixelSelectionError(null);
    setSelectedPixelLoading(false);
    setSelectedPixelSelectionLoading(false);
    setMarsPixelPurchaseError(null);
    setMarsPixelPurchaseSuccess(null);
    setPixelColorPickerOpen(false);
    resetMarsPurchaseJourney();
  };

  useEffect(() => {
    let cancelled = false;

    void getMyMarsPixelTestAccess()
      .then((allowed) => {
        if (cancelled) {
          return;
        }

        setMarsPixelTestAccess(allowed);

        if (!allowed) {
          closePixelPurchaseFlow();
        }
      })
      .catch(() => {
        if (cancelled) {
          return;
        }

        setMarsPixelTestAccess(false);
        closePixelPurchaseFlow();
      });

    return () => {
      cancelled = true;
    };
  }, []);

  /*
   * AUTOMATIC DEVNET PAYMENT RECOVERY
   *
   * Runs for both:
   * - a wallet already connected when the page loads, and
   * - a wallet connected during this session.
   *
   * Recovery never prepares, signs or broadcasts a new transaction.
   * It only verifies a signature already persisted against an existing
   * Devnet payment order.
   */
  useEffect(() => {
    const walletPublicKey =
      marsSolanaWallet?.connected
        ? marsSolanaWallet.publicKey
        : null;

    if (
      !walletPublicKey ||
      marsPixelTestAccess !== true ||
      marsSolanaRecoveryWalletRef.current === walletPublicKey
    ) {
      return;
    }

    marsSolanaRecoveryWalletRef.current =
      walletPublicKey;

    let cancelled = false;

    void (async () => {
      try {
        const recovery =
          await getMyMarsPixelSolanaRecovery(
            walletPublicKey,
          );

        if (cancelled || !recovery) {
          return;
        }

        setMarsPixelPurchaseLoading(true);
        setMarsPixelPurchaseError(null);
        setMarsPixelPurchaseSuccess(null);
        setMarsSolanaCheckout(null);
        setMarsSolanaTransactionSignature(
          recovery.transaction_signature,
        );
        setMarsSolanaPaymentStage("verifying");

        const verification =
          await verifyMarsPixelSolanaPayment({
            paymentOrderId:
              recovery.payment_order_id,
            transactionSignature:
              recovery.transaction_signature,
            colorKey: null,
          });

        if (cancelled) {
          return;
        }

        if (
          verification.paymentStatus !== "verified" ||
          !verification.allocationId
        ) {
          throw new Error(
            `Mars Pixel recovered payment verification returned status: ${verification.paymentStatus}`,
          );
        }

        const refreshedAllocations =
          await getMarsPixelPublicAllocations();

        if (cancelled) {
          return;
        }

        setPixelAllocations(refreshedAllocations);
        setMarsSolanaPaymentStage("verified");
        setMarsPixelPurchaseSuccess(
          t("mars.pixel.territoryClaimed", {
            id: verification.allocationId,
          }),
        );
      } catch (error) {
        if (cancelled) {
          return;
        }

        console.error(
          "Mars Solana payment recovery failed.",
          error,
        );

        setMarsSolanaPaymentStage("failed");
        setMarsPixelPurchaseError(
          error instanceof Error
            ? error.message
            : t("mars.pixel.error.solanaPaymentFailed"),
        );
      } finally {
        if (!cancelled) {
          setMarsPixelPurchaseLoading(false);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [
    marsSolanaWallet?.connected,
    marsSolanaWallet?.publicKey,
    marsPixelTestAccess,
  ]);

  const handleMarsSolanaCheckout = async () => {
    if (
      !marsPurchaseAgreementAccepted ||
      marsPurchaseStep !== 5 ||
      marsPixelPurchaseLoading ||
      !selectedPixel ||
      !lockedSelectionTarget ||
      !selectedPixelSelection ||
      selectedPixelSelection.selection_status !== "available" ||
      !selectedPixelSelection.purchasable
    ) {
      return;
    }

    if (
      !marsSolanaWallet?.connected ||
      !marsSolanaWallet.publicKey
    ) {
      setMarsPixelPurchaseError(
        t("mars.pixel.error.connectWalletBeforeCheckout"),
      );
      return;
    }

    setMarsPixelPurchaseLoading(true);
    setMarsPixelPurchaseError(null);
    setMarsPixelPurchaseSuccess(null);
    setMarsSolanaCheckout(null);
    setMarsSolanaTransactionSignature(null);

    try {
      if (
        !marsSolanaCheckoutIdempotencyKeyRef.current
      ) {
        marsSolanaCheckoutIdempotencyKeyRef.current =
          typeof crypto !== "undefined" &&
          typeof crypto.randomUUID === "function"
            ? `mars-solana:${crypto.randomUUID()}`
            : `mars-solana:${Date.now()}:${Math.random()
                .toString(36)
                .slice(2)}`;
      }

      const idempotencyKey =
        marsSolanaCheckoutIdempotencyKeyRef.current;

      const checkout =
        await checkoutMarsPixelSolanaPayment({
          anchorX: selectedPixel.x_start,
          anchorY: selectedPixel.y_start,
          targetX: lockedSelectionTarget.x,
          targetY: lockedSelectionTarget.y,
          buyerWallet: marsSolanaWallet.publicKey,
          idempotencyKey,
        });

      if (
        checkout.buyerWallet !==
        marsSolanaWallet.publicKey
      ) {
        throw new Error(
          t("mars.pixel.error.checkoutWalletMismatch"),
        );
      }

      if (checkout.network !== "devnet") {
        throw new Error(
          `Unsupported Solana network: ${checkout.network}`,
        );
      }

      setMarsSolanaCheckout(checkout);
      setMarsSolanaPaymentStage(
        "checkout_ready",
      );

      setMarsPixelPurchaseSuccess(
        t("mars.pixel.solana.checkoutReady", {
          amount: (
            checkout.amountLamports / 1_000_000_000
          ).toLocaleString(language, {
            maximumFractionDigits: 9,
          }),
        }),
      );
    } catch (error) {
      console.error(
        "Mars Solana checkout failed.",
        error,
      );

      setMarsSolanaPaymentStage("failed");
      setMarsPixelPurchaseError(
        error instanceof Error
          ? error.message
          : t("mars.pixel.error.checkoutPrepareFailed"),
      );
    } finally {
      setMarsPixelPurchaseLoading(false);
    }
  };

  const handleMarsSolanaPayment = async () => {
    if (
      !marsPurchaseAgreementAccepted ||
      marsPurchaseStep !== 5 ||
      marsPixelPurchaseLoading ||
      !marsSolanaWallet?.connected ||
      !marsSolanaWallet.publicKey ||
      !marsSolanaCheckout ||
      !selectedPixel ||
      !lockedSelectionTarget
    ) {
      return;
    }

    if (
      marsSolanaCheckout.buyerWallet !==
      marsSolanaWallet.publicKey
    ) {
      setMarsSolanaPaymentStage("failed");
      setMarsPixelPurchaseError(
        t("mars.pixel.error.preparedWalletMismatch"),
      );
      return;
    }

    if (marsSolanaCheckout.network !== "devnet") {
      setMarsSolanaPaymentStage("failed");
      setMarsPixelPurchaseError(
        t("mars.pixel.error.devnetOnly"),
      );
      return;
    }

    /*
     * Do not create/sign a new transaction for an expired checkout.
     * If a signature already exists, recovery must still be allowed
     * because that exact transaction may already be on-chain.
     */
    if (!marsSolanaTransactionSignature) {
      const checkoutExpiresAt =
        Date.parse(marsSolanaCheckout.expiresAt);

      if (
        !Number.isFinite(checkoutExpiresAt) ||
        checkoutExpiresAt <= Date.now()
      ) {
        setMarsSolanaPaymentStage("failed");
        setMarsPixelPurchaseError(
          t("mars.pixel.error.checkoutExpired"),
        );
        return;
      }
    }

    setMarsPixelPurchaseLoading(true);
    setMarsPixelPurchaseError(null);
    setMarsPixelPurchaseSuccess(null);

    try {
      /*
       * CRITICAL PAYMENT SAFETY:
       * Once a transaction signature exists for this checkout,
       * never sign or broadcast another payment for the same order.
       * Recovery retries only the trusted backend verifier.
       */
      let transactionSignature =
        marsSolanaTransactionSignature;

      if (!transactionSignature) {
        const prepared =
          await prepareMarsPixelSolanaPaymentTransaction(
            marsSolanaCheckout,
          );

        setMarsSolanaPaymentStage(
          "awaiting_signature",
        );

        const broadcast =
          await signAndBroadcastMarsSolanaPayment(
            prepared.transaction,
          );

        transactionSignature =
          broadcast.transactionSignature;

        /*
         * CRASH-SAFE PAYMENT RECOVERY:
         * Keep the signature in local React state immediately,
         * then durably persist it against this exact payment
         * order before waiting for blockchain finalization.
         *
         * The persistence RPC does NOT verify payment or create
         * ownership. It only prevents a successful broadcast
         * from being forgotten after refresh/reconnect/failure.
         */
        setMarsSolanaTransactionSignature(
          transactionSignature,
        );

        await recordMarsPixelSolanaTransactionSignature({
          paymentOrderId:
            marsSolanaCheckout.paymentOrderId,
          transactionSignature,
        });

        setMarsSolanaPaymentStage("broadcast");

        await confirmMarsSolanaPaymentFinalized({
          transactionSignature,
          latestBlockhash:
            prepared.latestBlockhash,
          lastValidBlockHeight:
            prepared.lastValidBlockHeight,
        });
      }

      setMarsSolanaPaymentStage("verifying");

      const verification =
        await verifyMarsPixelSolanaPayment({
          paymentOrderId:
            marsSolanaCheckout.paymentOrderId,
          transactionSignature,
          colorKey:
            selectedPixelColorKey ?? null,
        });

      if (
        verification.paymentStatus !== "verified" ||
        !verification.allocationId
      ) {
        throw new Error(
          `Mars Pixel payment verification returned status: ${verification.paymentStatus}`,
        );
      }

      setMarsSolanaPaymentStage("verified");

      // Payment commit creates the owned allocation on the backend.
      // Refresh the public allocation layer immediately so the newly
      // purchased territory remains visible on Mars without a page reload.
      const refreshedAllocations =
        await getMarsPixelPublicAllocations();

      setPixelAllocations(refreshedAllocations);

      setMarsPixelPurchaseSuccess(
        t("mars.pixel.territoryClaimed", {
          id: verification.allocationId,
        }),
      );

      const [
        refreshedDetail,
        refreshedValuation,
      ] = await Promise.all([
        getMarsPixelSelectionDetail(
          selectedPixel.x_start,
          selectedPixel.y_start,
          lockedSelectionTarget.x,
          lockedSelectionTarget.y,
        ),
        getMarsPixelSelectionValuation(
          selectedPixel.x_start,
          selectedPixel.y_start,
          lockedSelectionTarget.x,
          lockedSelectionTarget.y,
        ),
      ]);

      setSelectedPixelSelection(
        refreshedDetail,
      );
      setSelectedPixelValuation(
        refreshedValuation,
      );
      setPixelSelectionMode(false);
      setPixelDragActive(false);
      setPixelDragAnchor(null);
      setHoveredPixelCoordinate(null);
    } catch (error) {
      console.error(
        "Mars Solana payment failed.",
        error,
      );

      setMarsSolanaPaymentStage("failed");
      setMarsPixelPurchaseError(
        error instanceof Error
          ? error.message
          : t("mars.pixel.error.solanaPaymentFailed"),
      );
    } finally {
      setMarsPixelPurchaseLoading(false);
    }
  };

  const handleMarsPixelPurchase = async () => {
    if (
      !marsPurchaseAgreementAccepted ||
      marsPurchaseStep !== 5 ||
      marsPixelPurchaseLoading ||
      !selectedPixel ||
      !lockedSelectionTarget ||
      !selectedPixelSelection ||
      selectedPixelSelection.selection_status !== "available" ||
      !selectedPixelSelection.purchasable
    ) {
      return;
    }

    setMarsPixelPurchaseLoading(true);
    setMarsPixelPurchaseError(null);
    setMarsPixelPurchaseSuccess(null);

    try {
      const idempotencyKey =
        typeof crypto !== "undefined" &&
        typeof crypto.randomUUID === "function"
          ? `mars-pixel:${crypto.randomUUID()}`
          : `mars-pixel:${Date.now()}:${Math.random()
              .toString(36)
              .slice(2)}`;

      const result = await purchaseMarsPixelTerritory({
        anchorX: selectedPixel.x_start,
        anchorY: selectedPixel.y_start,
        targetX: lockedSelectionTarget.x,
        targetY: lockedSelectionTarget.y,
        colorKey: selectedPixelColorKey,
        idempotencyKey,
      });

      if (!result.allocation?.allocation_id) {
        throw new Error(
          "Mars Pixel purchase completed without an allocation.",
        );
      }

      setMarsPixelPurchaseSuccess(
        t("mars.pixel.territoryClaimed", { id: result.allocation.allocation_id }),
      );

      const [refreshedDetail, refreshedValuation] =
        await Promise.all([
          getMarsPixelSelectionDetail(
            selectedPixel.x_start,
            selectedPixel.y_start,
            lockedSelectionTarget.x,
            lockedSelectionTarget.y,
          ),
          getMarsPixelSelectionValuation(
            selectedPixel.x_start,
            selectedPixel.y_start,
            lockedSelectionTarget.x,
            lockedSelectionTarget.y,
          ),
        ]);

      setSelectedPixelSelection(refreshedDetail);
      setSelectedPixelValuation(refreshedValuation);
      setPixelSelectionMode(false);
      setPixelDragActive(false);
      setPixelDragAnchor(null);
      setHoveredPixelCoordinate(null);
    } catch (error) {
      const message =
        error instanceof Error
          ? error.message
          : t("mars.pixel.error.purchaseFailed");

      setMarsPixelPurchaseError(message);
    } finally {
      setMarsPixelPurchaseLoading(false);
    }
  };

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


  const handleOwnedPixelAllocationSelect = (
    coordinate: {
      x: number;
      y: number;
    },
    allocation: MarsPixelPublicAllocation,
  ) => {
    const requestId =
      pixelRequestRef.current + 1;

    pixelRequestRef.current = requestId;

    // Owned territory is not a new-purchase selection.
    setPixelDragActive(false);
    setPixelDragAnchor(null);
    setHoveredPixelCoordinate(null);
    setLockedSelectionTarget(null);

    setSelectedPixelSelection(null);
    setSelectedPixelValuation(null);
    setSelectedPixelSelectionError(null);
    setSelectedPixelSelectionLoading(false);
    setSelectedPixelError(null);
    setSelectedPixelLoading(false);

    setSelectedPixel({
      block_x: coordinate.x,
      block_y: coordinate.y,
      x_start: allocation.x_start,
      y_start: allocation.y_start,
      x_end:
        allocation.x_start +
        allocation.width -
        1,
      y_end:
        allocation.y_start +
        allocation.height -
        1,
      width: allocation.width,
      height: allocation.height,
      pixel_count:
        allocation.width *
        allocation.height,
      grid_version:
        pixelNetworkStatus?.grid_version ??
        1,
      block_status: "owned",
      purchasable: false,
      reserved_zone_code: null,
      reserved_zone_name: null,
      allocation_id:
        allocation.allocation_id,
      advertiser_name:
        allocation.advertiser_name,
      creative_title:
        allocation.creative_title,
      creative_image_url:
        allocation.creative_image_url,
      destination_url: null,
    });
  };

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
          t("mars.pixel.error.selectionDataUnavailable"),
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
        t("mars.pixel.error.blockDataUnavailable"),
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

          const allocations:
            MarsPixelPublicAllocation[] =
              await getMarsPixelPublicAllocations();

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
              ? t("mars.pixel.networkUnavailable")
              : t("mars.pixel.networkSyncing")}
        </strong>

        <small>
          {pixelNetworkStatus
            ? `COMMERCIAL NETWORK ${pixelNetworkStatus.commercial_status.toUpperCase()}`
            : pixelNetworkError
              ? t("mars.pixel.statusUnavailable")
              : t("mars.pixel.readingProductionState")}
        </small>
      </div>

      {!diving && (
        <aside
          className="mars-devnet-faucet"
          aria-live="polite"
        >
          <span className="mars-devnet-faucet__eyebrow">
            BOBU DEVNET FAUCET
          </span>

          <strong>1.61 DEVNET SOL</strong>

          <small>
            ONE-TIME TEST ALLOCATION
          </small>

          <button
            type="button"
            className="mars-devnet-faucet__claim"
            disabled={
              marsDevnetFaucetLoading ||
              marsSolanaWalletConnecting
            }
            onClick={() => {
              void handleMarsDevnetFaucetClaim();
            }}
          >
            {marsDevnetFaucetLoading
              ? "SENDING DEVNET SOL..."
              : marsSolanaWalletConnecting
                ? "CONNECTING PHANTOM..."
                : marsSolanaWallet?.connected
                  ? "GET DEVNET SOL"
                  : "CONNECT PHANTOM"}
          </button>

          {marsSolanaWallet?.connected &&
            marsSolanaWallet.publicKey && (
              <small className="mars-devnet-faucet__wallet">
                {`${marsSolanaWallet.publicKey.slice(
                  0,
                  4,
                )}...${marsSolanaWallet.publicKey.slice(-4)}`}
              </small>
            )}

          {marsDevnetFaucetMessage && (
            <small className="mars-devnet-faucet__success">
              {marsDevnetFaucetMessage}
            </small>
          )}

        </aside>
      )}

      {!diving && marsDevnetFaucetError && (
        <div
          className="mars-devnet-faucet-toast"
          role="alert"
          aria-live="assertive"
        >
          <strong>FAUCET REQUEST FAILED</strong>
          <span>{marsDevnetFaucetError}</span>
          <button
            type="button"
            aria-label="Close faucet error"
            onClick={() => {
              setMarsDevnetFaucetError(null);
            }}
          >
            ×
          </button>
        </div>
      )}

      {!diving && pixelNetworkStatus && (
        <div className="mars-pixel-goto"
          hidden={!marsPixelTestAccess}>
          <span className="mars-pixel-goto__eyebrow">
            {t("mars.pixel.selectTerritorySize")}
          </span>

          <div
            className="mars-pixel-goto__journey"
            aria-label="Mars Pixel advertising journey"
          >
            <span className="is-current">
              <b>1</b>
              SELECT
            </span>
            <i>›</i>
            <span>
              <b>2</b>
              DEVNET SOL
            </span>
            <i>›</i>
            <span>
              <b>3</b>
              CREATE AD
            </span>
            <i>›</i>
            <span>
              <b>4</b>
              GO LIVE
            </span>
          </div>

          <div className="mars-pixel-goto__controls">
            <label>
              <span>{t("mars.pixel.width")}</span>
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
              <span>{t("mars.pixel.height")}</span>
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

            <button
              type="button"
              className={[
                "mars-pixel-goto__total",
                pixelSelectionMode ? "is-active" : "",
              ]
                .filter(Boolean)
                .join(" ")}
              aria-pressed={pixelSelectionMode}
              disabled={!marsPixelTestAccess}
              onClick={() => {
                if (!marsPixelTestAccess) {
                  return;
                }
                if (pixelSelectionMode) {
                  closePixelPurchaseFlow();
                  return;
                }

                closePixelPurchaseFlow();
                setPixelSelectionMode(true);
              }}
            >
              {(() => {
                const width = Number(territoryWidth);
                const height = Number(territoryHeight);
                const total =
                  Number.isFinite(width) &&
                  Number.isFinite(height)
                    ? width * height
                    : 0;

                const label = `${total.toLocaleString(language)} ${t("mars.pixel.pixels")}`;

                return pixelSelectionMode ? (
                  label
                ) : (
                  <span className="mars-pixel-goto__start-label">
                    <small>START</small>
                    <strong>{label}</strong>
                  </span>
                );
              })()}
            </button>
          </div>

          <small className="mars-pixel-goto__hint">
            {mobileTouchMode
              ? t("mars.pixel.tapToPosition")
              : t("mars.pixel.moveToPosition")}
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
                {t("mars.pixel.lockTerritory")}
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
        marsPixelTestAccess &&
        (
          pixelSelectionMode ||
          selectedPixel?.block_status === "owned"
        ) &&
        (
          pixelDragAnchor !== null ||
          pixelDragActive ||
          selectedPixelLoading ||
          selectedPixel !== null ||
          selectedPixelError !== null
        ) && (
          <aside
            className={[
              "mars-pixel-detail",
              selectedPixelSelection?.selection_status === "available"
                ? "is-checkout"
                : "",
            ]
              .filter(Boolean)
              .join(" ")}
            aria-live="polite"
          >
            <div className="mars-pixel-detail__header">
              <div>
                <span className="mars-pixel-detail__eyebrow">
                  MARS PIXEL REGISTRY
                </span>
                <strong>
                  {t("mars.pixel.territoryInspector")}
                </strong>
</div>

              <button
                type="button"
                className="mars-pixel-detail__close"
                aria-label={t("mars.pixel.closeSelection")}
                onClick={closePixelPurchaseFlow}
              >
                ×
              </button>
            </div>

            {pixelDragActive && (
              <div className="mars-pixel-detail__message">
                {t("mars.pixel.selectingTerritory")}
              </div>
            )}

            {!pixelDragActive &&
              selectedPixelLoading && (
                <div className="mars-pixel-detail__message">
                  {t("mars.pixel.readingProductionState")}
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
                  {t("mars.pixel.validatingTerritory")}
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
                    {`${t("mars.pixel.territory")} ${pixelBlockSelection.width} × ${pixelBlockSelection.height}`}
                  </div>

                  <div className="mars-pixel-detail__meta">
                    <span>{t("mars.pixel.totalPixels")}</span>
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
                      ? `${t("mars.pixel.territory")} ${pixelBlockSelection.width} × ${pixelBlockSelection.height}`
                      : `PIXEL X${selectedPixel.x_start} / Y${selectedPixel.y_start}`}
                  </div>

                  {pixelBlockSelection && (
                    <div className="mars-pixel-detail__meta">
                      <span>{t("mars.pixel.totalPixels")}</span>
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
                            ? t("mars.pixel.protected")
                            : status.toUpperCase()}
                        </div>

                        {selectionLocked && (
                          <>
                            <div className="mars-pixel-detail__meta">
                              <span>{t("mars.pixel.reservedOverlap")}</span>
                              <strong>
                                {reservedOverlapCount ?? 0}
                              </strong>
                            </div>

                            <div className="mars-pixel-detail__meta">
                              <span>{t("mars.pixel.ownedOverlap")}</span>
                              <strong>
                                {ownedOverlapCount ?? 0}
                              </strong>
                            </div>

                            <div className="mars-pixel-detail__meta">
                              <span>{t("mars.pixel.availability")}</span>
                              <strong>
                                {reservedZoneCode === "ARES_PROTECTED"
                                  ? t("mars.pixel.protected")
                                  : status === "available"
                                    ? t("mars.pixel.available")
                                    : t("mars.pixel.unavailable")}
                              </strong>
                            </div>
                          </>
                        )}

                        {reservedZoneCode === "ARES_PROTECTED" && (
                          <>
                            <div className="mars-pixel-detail__commercial">
                              {t("mars.pixel.notForSale")}
                            </div>

                            <div className="mars-pixel-detail__meta">
                              <span>{t("mars.pixel.protectedTerritory")}</span>
                              <strong>
                                {reservedZoneName ?? t("mars.pixel.aresSector")}
                              </strong>
                            </div>
                          </>
                        )}

                        {status === "available" &&
                          reservedZoneCode !== "ARES_PROTECTED" && (
                          <div className="mars-pixel-detail__commercial">
                            {purchasable
                              ? t("mars.pixel.commercialAccessActive")
                              : t("mars.pixel.salesLocked")}
                          </div>
                        )}

                        {status === "reserved" &&
                          reservedZoneCode !== "ARES_PROTECTED" && (
                          <>
                            <div className="mars-pixel-detail__commercial">
                              {t("mars.pixel.notForSale")}
                            </div>

                            {reservedZoneName && (
                              <div className="mars-pixel-detail__meta">
                                <span>
                                  {t("mars.pixel.reservedZone")}
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
                                <span>{t("mars.pixel.creative")}</span>
                                <strong>
                                  {selectedPixel.creative_title}
                                </strong>
                              </div>
                            )}

                            {creativeOwnerDetail && (
                              <div className="mars-pixel-owner-actions">
                                <button
                                  type="button"
                                  className="mars-pixel-owner-actions__dashboard"
                                  onClick={() => {
                                    window.location.assign(
                                      "/mars/advertiser",
                                    );
                                  }}
                                >
                                  <span>{t("mars.pixel.manageMyAds")}</span>
                                  <small>
                                    Creative · Analytics · Campaign
                                  </small>
                                </button>

                                <button
                                  type="button"
                                  className="mars-pixel-creative__edit"
                                  onClick={() => {
                                    setCreativeEditorOpen(
                                      (value) => !value,
                                    );
                                    setCreativeSaveError(null);
                                    setCreativeSaveSuccess(null);
                                  }}
                                >
                                  {creativeEditorOpen
                                    ? t("mars.pixel.closeEditor")
                                    : t("mars.pixel.editContent")}
                                </button>
                              </div>
                            )}

                            {creativeOwnerLoading && (
                              <div
                                className="mars-pixel-creative__owner-loading"
                                aria-busy="true"
                              />
                            )}

                            {creativeEditorOpen &&
                              creativeOwnerDetail && (
                              <div className="mars-pixel-creative">
                                <div className="mars-pixel-creative__tier">
                                  {ownedTerritoryTier
                                    ? `${ownedTerritoryTier.tier_key} · ${ownedTerritoryPixelCount?.toLocaleString()} px`
                                    : t("mars.pixel.loadingTier")}
                                </div>

                                <label>
                                  <span>{t("mars.pixel.territoryName")}</span>
                                  <input
                                    value={creativeTitle}
                                    maxLength={
                                      ownedTerritoryTier
                                        ?.territory_name_max_chars ?? 30
                                    }
                                    onChange={(event) =>
                                      setCreativeTitle(
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>

                                <label>
                                  <span>{t("mars.pixel.creativeDescription")}</span>
                                  <textarea
                                    value={creativeDescription}
                                    maxLength={
                                      ownedTerritoryTier
                                        ?.description_max_chars ?? 50
                                    }
                                    onChange={(event) =>
                                      setCreativeDescription(
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>

                                <label>
                                  <span>{t("mars.pixel.logoImage")}</span>
                                  <input
                                    className="mars-pixel-creative__file"
                                    type="file"
                                    accept="image/jpeg,image/png,image/webp"
                                    disabled={
                                      !ownedTerritoryTier?.image_allowed ||
                                      creativeImageUploading
                                    }
                                    onChange={(event) => {
                                      const file =
                                        event.target.files?.[0] ?? null;
                                      setCreativeImageFile(file);
                                    }}
                                  />
                                  <small>
                                    {creativeImageFile
                                      ? `${t("mars.pixel.imageSelected")} · ${creativeImageFile.name}`
                                      : t("mars.pixel.imageHelp")}
                                  </small>
                                  {creativeImageUrl && (
                                    <img
                                      className="mars-pixel-creative__preview"
                                      src={creativeImageUrl}
                                      alt=""
                                    />
                                  )}
                                </label>

                                <label>
                                  <span>{t("mars.pixel.website")}</span>
                                  <input
                                    type="url"
                                    placeholder="https://"
                                    value={creativeDestinationUrl}
                                    onChange={(event) =>
                                      setCreativeDestinationUrl(
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>

                                <label>
                                  <span>CTA</span>
                                  <input
                                    maxLength={30}
                                    disabled={
                                      !ownedTerritoryTier?.cta_allowed
                                    }
                                    value={creativeCtaLabel}
                                    onChange={(event) =>
                                      setCreativeCtaLabel(
                                        event.target.value,
                                      )
                                    }
                                  />
                                </label>

                                <div className="mars-pixel-creative__links">
                                  <span>
                                    {t("mars.pixel.linksHelp")}
                                  </span>

                                  {creativeLinks.map(
                                    (link, index) => (
                                      <div
                                        className="mars-pixel-creative__link-row"
                                        key={`${index}-${link.type}`}
                                      >
                                        <select
                                          value={link.type}
                                          onChange={(event) => {
                                            const type =
                                              event.target.value as MarsPixelCreativeLink["type"];

                                            setCreativeLinks(
                                              (current) =>
                                                current.map(
                                                  (item, itemIndex) =>
                                                    itemIndex === index
                                                      ? {
                                                          ...item,
                                                          type,
                                                        }
                                                      : item,
                                                ),
                                            );
                                          }}
                                        >
                                          <option value="website">
                                            {t("mars.pixel.website")}
                                          </option>

                                          {ownedTerritoryTier?.socials_allowed && (
                                            <>
                                              <option value="x">X</option>
                                              <option value="telegram">
                                                Telegram
                                              </option>
                                              <option value="instagram">
                                                Instagram
                                              </option>
                                              <option value="youtube">
                                                YouTube
                                              </option>
                                              <option value="linkedin">
                                                LinkedIn
                                              </option>
                                            </>
                                          )}
                                        </select>

                                        <input
                                          type="url"
                                          placeholder="https://"
                                          value={link.url}
                                          onChange={(event) => {
                                            const url =
                                              event.target.value;

                                            setCreativeLinks(
                                              (current) =>
                                                current.map(
                                                  (item, itemIndex) =>
                                                    itemIndex === index
                                                      ? {
                                                          ...item,
                                                          url,
                                                        }
                                                      : item,
                                                ),
                                            );
                                          }}
                                        />

                                        <button
                                          type="button"
                                          className="mars-pixel-creative__link-remove"
                                          onClick={() =>
                                            setCreativeLinks(
                                              (current) =>
                                                current.filter(
                                                  (_, itemIndex) =>
                                                    itemIndex !== index,
                                                ),
                                            )
                                          }
                                        >
                                          ×
                                        </button>
                                      </div>
                                    ),
                                  )}

                                  <button
                                    type="button"
                                    className="mars-pixel-creative__link-add"
                                    disabled={
                                      !ownedTerritoryTier ||
                                      ownedTerritoryTier.max_links < 1 ||
                                      creativeLinks.length >=
                                        ownedTerritoryTier.max_links
                                    }
                                    onClick={() =>
                                      setCreativeLinks(
                                        (current) => [
                                          ...current,
                                          {
                                            type: "website",
                                            url: "",
                                          },
                                        ],
                                      )
                                    }
                                  >
                                    +
                                  </button>
                                </div>

                                <button
                                  type="button"
                                  className="mars-pixel-creative__save"
                                  disabled={
                                    creativeSaveLoading ||
                                    creativeImageUploading ||
                                    !creativeOwnerDetail ||
                                    !ownedTerritoryTier ||
                                    !creativeTitle.trim()
                                  }
                                  onClick={() => {
                                    void handleSaveMarsPixelCreative();
                                  }}
                                >
                                  {creativeSaveLoading ||
                                  creativeImageUploading
                                    ? t("mars.pixel.submitting")
                                    : t("mars.pixel.submitReview")}
                                </button>

                                {creativeSaveError && (
                                  <div className="mars-pixel-creative__error">
                                    {creativeSaveError}
                                  </div>
                                )}

                                {creativeSaveSuccess && (
                                  <div className="mars-pixel-creative__success">
                                    {creativeSaveSuccess}
                                  </div>
                                )}
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
                          <div className="mars-purchase-flow mars-purchase-flow--journey">
                            <div className="mars-checkout-journey">
                              <div className="mars-checkout-journey__steps">
                                {[
                                  [1, t("mars.pixel.checkout.size")],
                                  [2, t("mars.pixel.checkout.location")],
                                  [3, t("mars.pixel.checkout.customize")],
                                  [4, t("mars.pixel.checkout.review")],
                                  [5, t("mars.pixel.checkout.agreement")],
                                ].map(([step, label]) => {
                                  const stepNumber = step as number;
                                  const complete =
                                    marsPurchaseStep > stepNumber;
                                  const active =
                                    marsPurchaseStep === stepNumber;

                                  return (
                                    <button
                                      key={label}
                                      type="button"
                                      className={[
                                        "mars-checkout-step",
                                        active ? "is-active" : "",
                                        complete ? "is-complete" : "",
                                      ]
                                        .filter(Boolean)
                                        .join(" ")}
                                      disabled={
                                        stepNumber > marsPurchaseStep
                                      }
                                      onClick={() => {
                                        if (
                                          stepNumber <= marsPurchaseStep
                                        ) {
                                          setMarsPurchaseStep(
                                            stepNumber as
                                              | 1
                                              | 2
                                              | 3
                                              | 4
                                              | 5,
                                          );
                                        }
                                      }}
                                    >
                                      <span>
                                        {complete ? "✓" : stepNumber}
                                      </span>
                                      <strong>{label}</strong>
                                    </button>
                                  );
                                })}
                              </div>

                              <div className="mars-checkout-journey__body">
                                {marsPurchaseStep === 1 && (
                                  <section className="mars-checkout-card is-selected">
                                    <small>
                                      01 · TERRITORY SIZE
                                    </small>

                                    <strong>
                                      {selectedPixelSelection.pixel_count.toLocaleString(
                                        "en-US",
                                      )}{" "}
                                      PIXELS
                                    </strong>

                                    <p>
                                      {selectedPixelSelection.width} ×{" "}
                                      {selectedPixelSelection.height}{" "}
                                      MARS TERRITORY
                                    </p>

                                    {selectedPixelContentTier && (
                                      <>
                                        <div className="mars-checkout-feature-grid">
                                          <span className="is-unlocked">
                                            {
                                              selectedPixelContentTier.tier_key
                                            }
                                          </span>

                                          <span className="is-unlocked">
                                            NAME ·{" "}
                                            {
                                              selectedPixelContentTier.territory_name_max_chars
                                            }
                                          </span>

                                          <span className="is-unlocked">
                                            DESCRIPTION ·{" "}
                                            {
                                              selectedPixelContentTier.description_max_chars
                                            }
                                          </span>

                                          <span
                                            className={
                                              selectedPixelContentTier.image_allowed
                                                ? "is-unlocked"
                                                : "is-locked"
                                            }
                                          >
                                            IMAGE ·{" "}
                                            {selectedPixelContentTier.image_allowed
                                              ? t("mars.pixel.unlocked")
                                              : t("mars.ares.locked")}
                                          </span>

                                          <span className="is-unlocked">
                                            LINKS ·{" "}
                                            {
                                              selectedPixelContentTier.max_links
                                            }
                                          </span>

                                          <span
                                            className={
                                              selectedPixelContentTier.cta_allowed
                                                ? "is-unlocked"
                                                : "is-locked"
                                            }
                                          >
                                            CTA ·{" "}
                                            {selectedPixelContentTier.cta_allowed
                                              ? t("mars.pixel.unlocked")
                                              : t("mars.ares.locked")}
                                          </span>
                                        </div>

                                        {selectedPixelContentTier.max_pixels !==
                                          null && (
                                          <div className="mars-checkout-hint">
                                            {t(
                                              "mars.pixel.nextTierStarts",
                                              {
                                                count: (
                                                  selectedPixelContentTier.max_pixels +
                                                  1
                                                ).toLocaleString(
                                                  "en-US",
                                                ),
                                              },
                                            )}
                                          </div>
                                        )}
                                      </>
                                    )}
                                  </section>
                                )}

                                {marsPurchaseStep === 2 && (
                                  <section className="mars-checkout-card is-selected">
                                    <small>02 · LOCATION</small>

                                    <strong>
                                      X{" "}
                                      {
                                        selectedPixelSelection.x_start
                                      }
                                      –
                                      {
                                        selectedPixelSelection.x_end
                                      }
                                    </strong>

                                    <p>
                                      Y{" "}
                                      {
                                        selectedPixelSelection.y_start
                                      }
                                      –
                                      {
                                        selectedPixelSelection.y_end
                                      }
                                    </p>

                                    <div className="mars-checkout-feature-grid">
                                      <span className="is-unlocked">
                                        AVAILABLE
                                      </span>

                                      <span className="is-unlocked">
                                        {
                                          selectedPixelSelection.width
                                        }{" "}
                                        ×{" "}
                                        {
                                          selectedPixelSelection.height
                                        }
                                      </span>

                                      <span className="is-unlocked">
                                        {selectedPixelSelection.pixel_count.toLocaleString(
                                          "en-US",
                                        )}{" "}
                                        PIXELS
                                      </span>
                                    </div>
                                  </section>
                                )}

                                {marsPurchaseStep === 3 && (
                                  <section className="mars-checkout-card is-selected">
                                    <small>03 · CUSTOMIZE</small>

                                    <strong>
                                      {selectedPixelContentTier?.tier_key ??
                                        "TIER"}
                                    </strong>

                                    {selectedPixelContentTierLoading && (
                                      <p>{t("mars.pixel.calculating")}</p>
                                    )}

                                    {selectedPixelContentTierError && (
                                      <div className="mars-purchase-flow__error">
                                        {
                                          selectedPixelContentTierError
                                        }
                                      </div>
                                    )}

                                    {selectedPixelContentTier && (
                                      <div className="mars-checkout-feature-grid">
                                        <span className="is-unlocked">
                                          DESCRIPTION ·{" "}
                                          {
                                            selectedPixelContentTier.description_max_chars
                                          }
                                        </span>

                                        <span
                                          className={
                                            selectedPixelContentTier.image_allowed
                                              ? "is-unlocked"
                                              : "is-locked"
                                          }
                                        >
                                          IMAGE ·{" "}
                                          {selectedPixelContentTier.image_allowed
                                            ? t("mars.pixel.unlocked")
                                            : t("mars.ares.locked")}
                                        </span>

                                        <span className="is-unlocked">
                                          LINKS ·{" "}
                                          {
                                            selectedPixelContentTier.max_links
                                          }
                                        </span>

                                        <span
                                          className={
                                            selectedPixelContentTier.cta_allowed
                                              ? "is-unlocked"
                                              : "is-locked"
                                          }
                                        >
                                          CTA ·{" "}
                                          {selectedPixelContentTier.cta_allowed
                                            ? t("mars.pixel.unlocked")
                                            : t("mars.ares.locked")}
                                        </span>

                                        <span
                                          className={
                                            selectedPixelContentTier.socials_allowed
                                              ? "is-unlocked"
                                              : "is-locked"
                                          }
                                        >
                                          SOCIAL ·{" "}
                                          {selectedPixelContentTier.socials_allowed
                                            ? t("mars.pixel.unlocked")
                                            : t("mars.ares.locked")}
                                        </span>

                                        <span
                                          className={
                                            selectedPixelContentTier.analytics_allowed
                                              ? "is-unlocked"
                                              : "is-locked"
                                          }
                                        >
                                          ANALYTICS ·{" "}
                                          {selectedPixelContentTier.analytics_allowed
                                            ? t("mars.pixel.unlocked")
                                            : t("mars.ares.locked")}
                                        </span>

                                        <span
                                          className={
                                            selectedPixelContentTier.premium
                                              ? "is-unlocked"
                                              : "is-locked"
                                          }
                                        >
                                          PREMIUM ·{" "}
                                          {selectedPixelContentTier.premium
                                            ? t("mars.pixel.unlocked")
                                            : t("mars.ares.locked")}
                                        </span>
                                      </div>
                                    )}

                                    <div className="mars-pixel-color mars-pixel-color--checkout">
                                      <div className="mars-pixel-color__current">
                                        <span
                                          className="mars-pixel-color__swatch"
                                          style={{
                                            background:
                                              selectedPixelColor,
                                          }}
                                        />

                                        <div>
                                          <small>
                                            {t(
                                              "mars.pixel.territoryColor",
                                            )}
                                          </small>

                                          <strong>
                                            {pixelColorLoading
                                              ? t("mars.pixel.selecting")
                                              : selectedPixelColorKey ??
                                                t("mars.pixel.unavailable")}
                                          </strong>

                                          <em>
                                            {pixelColorMode === "auto"
                                              ? t("mars.pixel.autoSelected")
                                              : t("mars.pixel.manualSelection")}
                                          </em>
                                        </div>

                                        <button
                                          type="button"
                                          disabled={
                                            pixelColorLoading ||
                                            pixelColorOptions.length ===
                                              0
                                          }
                                          onClick={() =>
                                            setPixelColorPickerOpen(
                                              (open) => !open,
                                            )
                                          }
                                        >
                                          {pixelColorPickerOpen
                                            ? t("mars.pixel.close")
                                            : t("mars.pixel.changeColor")}
                                        </button>
                                      </div>

                                      {pixelColorError && (
                                        <div className="mars-pixel-color__error">
                                          {pixelColorError}
                                        </div>
                                      )}

                                      {pixelColorPickerOpen && (
                                        <div className="mars-pixel-color__palette">
                                          {pixelColorOptions.map(
                                            (option) => {
                                              const color =
                                                MARS_PIXEL_TERRITORY_COLORS[
                                                  option.color_key
                                                ] ?? "#63f5ff";

                                              const active =
                                                selectedPixelColorKey ===
                                                option.color_key;

                                              return (
                                                <button
                                                  key={
                                                    option.color_key
                                                  }
                                                  type="button"
                                                  className={[
                                                    "mars-pixel-color__option",
                                                    active
                                                      ? "is-active"
                                                      : "",
                                                    !option.allowed
                                                      ? "is-disabled"
                                                      : "",
                                                  ]
                                                    .filter(Boolean)
                                                    .join(" ")}
                                                  disabled={
                                                    !option.allowed
                                                  }
                                                  onClick={() => {
                                                    if (
                                                      !option.allowed
                                                    ) {
                                                      return;
                                                    }

                                                    setSelectedPixelColorKey(
                                                      option.color_key,
                                                    );
                                                    setPixelColorMode(
                                                      "manual",
                                                    );
                                                    setPixelColorPickerOpen(
                                                      false,
                                                    );
                                                  }}
                                                >
                                                  <span
                                                    style={{
                                                      background:
                                                        color,
                                                    }}
                                                  />
                                                </button>
                                              );
                                            },
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </section>
                                )}

                                {marsPurchaseStep === 4 && (
                                  <section className="mars-checkout-card is-selected">
                                    <small>
                                      04 · ORDER REVIEW
                                    </small>

                                    <strong>
                                      {selectedPixelSelection.pixel_count.toLocaleString(
                                        "en-US",
                                      )}{" "}
                                      PIXELS
                                    </strong>

                                    <div className="mars-checkout-review">
                                      <div>
                                        <span>{t("mars.pixel.territory")}</span>
                                        <strong>
                                          {
                                            selectedPixelSelection.width
                                          }{" "}
                                          ×{" "}
                                          {
                                            selectedPixelSelection.height
                                          }
                                        </strong>
                                      </div>

                                      <div>
                                        <span>{t("mars.pixel.tier")}</span>
                                        <strong>
                                          {selectedPixelContentTier?.tier_key ??
                                            "—"}
                                        </strong>
                                      </div>

                                      <div>
                                        <span>{t("mars.pixel.color")}</span>
                                        <strong>
                                          {selectedPixelColorKey ??
                                            t("mars.pixel.auto")}
                                        </strong>
                                      </div>

                                      <div>
                                        <span>{t("mars.pixel.total")}</span>
                                        <strong>
                                          {selectedPixelValuation?.settlement_total_price !=
                                          null
                                            ? `${selectedPixelValuation.settlement_total_price.toLocaleString(
                                                "en-US",
                                              )} ${
                                                selectedPixelValuation.settlement_currency_code ??
                                                "GP"
                                              }`
                                            : "—"}
                                        </strong>
                                      </div>

                                      <div>
                                        <span>{t("mars.pixel.pricePerPixel")}</span>
                                        <strong>
                                          {selectedPixelValuation?.settlement_price_per_pixel !=
                                          null
                                            ? `${selectedPixelValuation.settlement_price_per_pixel.toLocaleString(
                                                "en-US",
                                              )} ${
                                                selectedPixelValuation.settlement_currency_code ??
                                                "GP"
                                              }`
                                            : "—"}
                                        </strong>
                                      </div>

                                      <div>
                                        <span>
                                          {t("mars.pixel.referenceValue")}
                                        </span>
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
                                    </div>

                                    {selectedPixelValuation && (
                                      <div className="mars-checkout-hint">
                                        {selectedPixelValuation.pixel_count.toLocaleString(
                                          "en-US",
                                        )}{" "}
                                        PIXELS ·{" "}
                                        {t(
                                          "mars.pixel.minPixels",
                                          {
                                            count:
                                              selectedPixelValuation.minimum_purchase_pixels,
                                          },
                                        )}
                                      </div>
                                    )}
                                  </section>
                                )}

                                {marsPurchaseStep === 5 && (
                                  <button
                                    type="button"
                                    className={[
                                      "mars-checkout-agreement",
                                      marsPurchaseAgreementAccepted
                                        ? "is-accepted"
                                        : "",
                                    ]
                                      .filter(Boolean)
                                      .join(" ")}
                                    aria-pressed={
                                      marsPurchaseAgreementAccepted
                                    }
                                    onClick={() =>
                                      setMarsPurchaseAgreementAccepted(
                                        (accepted) => !accepted,
                                      )
                                    }
                                  >
                                    <span className="mars-checkout-agreement__check">
                                      {marsPurchaseAgreementAccepted
                                        ? "✓"
                                        : ""}
                                    </span>

                                    <span>
                                      <small>
                                        05 · USER AGREEMENT
                                      </small>

                                      <strong>
                                        I HAVE READ AND ACCEPT THE
                                        USER AGREEMENT
                                      </strong>

                                      <em>
                                        Agreement text will be
                                        connected before commercial
                                        launch.
                                      </em>
                                    </span>
                                  </button>
                                )}
                              </div>

                              {marsPurchaseStep < 5 ? (
                                <button
                                  type="button"
                                  className="mars-checkout-continue"
                                  onClick={() =>
                                    setMarsPurchaseStep(
                                      Math.min(
                                        5,
                                        marsPurchaseStep + 1,
                                      ) as
                                        | 1
                                        | 2
                                        | 3
                                        | 4
                                        | 5,
                                    )
                                  }
                                >
                                  CONTINUE →
                                </button>
                              ) : !marsSolanaWallet?.connected ? (
                                <button
                                  type="button"
                                  className="mars-purchase-flow__purchase"
                                  disabled={
                                    !purchasable ||
                                    !marsPurchaseAgreementAccepted ||
                                    marsSolanaWalletConnecting ||
                                    (!marsSolanaWalletAvailable &&
                                      !marsSolanaMobileFallbackAvailable)
                                  }
                                  onClick={() => {
                                    void handleMarsSolanaWalletConnect();
                                  }}
                                >
                                  {marsSolanaWalletConnecting
                                    ? t("mars.pixel.solana.connectingWallet")
                                    : !marsSolanaWalletAvailable &&
                                        !marsSolanaMobileFallbackAvailable
                                      ? t("mars.pixel.solana.walletNotFound")
                                      : marsPurchaseAgreementAccepted &&
                                          purchasable
                                        ? t("mars.pixel.solana.connectWallet")
                                        : t("mars.pixel.solana.acceptAgreement")}
                                </button>
                              ) : marsSolanaCheckout ? (
                                <button
                                  type="button"
                                  className="mars-purchase-flow__purchase"
                                  disabled={
                                    !purchasable ||
                                    !marsPurchaseAgreementAccepted ||
                                    marsPixelPurchaseLoading ||
                                    marsSolanaPaymentStage === "verified"
                                  }
                                  onClick={() => {
                                    void handleMarsSolanaPayment();
                                  }}
                                >
                                  {marsPixelPurchaseLoading
                                    ? marsSolanaPaymentStage === "awaiting_signature"
                                      ? t("mars.pixel.solana.awaitingSignature")
                                      : marsSolanaPaymentStage === "broadcast"
                                        ? t("mars.pixel.solana.waitingFinality")
                                        : marsSolanaPaymentStage === "verifying"
                                          ? t("mars.pixel.solana.verifyingPayment")
                                          : t("mars.pixel.solana.processingDevnet")
                                    : marsSolanaPaymentStage === "verified"
                                      ? t("mars.pixel.solana.paymentVerified")
                                      : marsSolanaTransactionSignature
                                        ? t("mars.pixel.solana.retryVerification")
                                        : t("mars.pixel.solana.payWithSolDevnet", {
                                            amount: (
                                              marsSolanaCheckout.amountLamports /
                                              1_000_000_000
                                            ).toLocaleString(language, {
                                              maximumFractionDigits: 9,
                                            }),
                                          })}
                                </button>
                              ) : (
                                <button
                                  type="button"
                                  className="mars-purchase-flow__purchase"
                                  disabled={
                                    !purchasable ||
                                    !marsPurchaseAgreementAccepted ||
                                    marsPixelPurchaseLoading
                                  }
                                  onClick={() => {
                                    void handleMarsSolanaCheckout();
                                  }}
                                >
                                  {marsPixelPurchaseLoading
                                    ? t("mars.pixel.solana.preparingCheckout")
                                    : t("mars.pixel.solana.prepareCheckout")}
                                </button>
                              )}

                              {marsPixelPurchaseError && (
                                <div className="mars-purchase-flow__error">
                                  {marsPixelPurchaseError}
                                </div>
                              )}

                              {marsPixelPurchaseSuccess && (
                                <div className="mars-purchase-flow__success">
                                  {marsPixelPurchaseSuccess}
                                </div>
                              )}

                              <div className="mars-purchase-flow__notice">
                                {t("mars.pixel.serverVerified")}
                              </div>
                            </div>
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
              !marsPixelTestAccess ||
              !pixelSelectionMode ||
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
            if (
              !marsPixelTestAccess ||
              !pixelSelectionMode ||
              mobileTouchMode
            ) {
              return;
            }

            void handleTerritorySizeSelect(anchor);
          }}
          pixelSelectionMode={pixelSelectionMode}
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
          onPixelSelect={(coordinate, allocation) => {
            // Existing owned territory always takes priority over
            // the new-territory purchase selection flow.
            if (allocation) {
              handleOwnedPixelAllocationSelect(
                coordinate,
                allocation,
              );
              return;
            }

            if (!marsPixelTestAccess || !pixelSelectionMode) {
              return;
            }

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
            if (!marsPixelTestAccess || !pixelSelectionMode) {
              setHoveredPixelCoordinate(null);
              return;
            }

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

            // Passive hover must never create a territory
            // selection. The selection anchor is created only
            // after an explicit click / drag interaction.
            setPixelDragAnchor(null);
            setLockedSelectionTarget(null);
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
          ownerHoverPreview={
            ownerHoverPreview
          }
          onOwnedTerritoryHover={
            handleOwnedTerritoryHover
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
            aria-label={t("mars.ares.closeSector")}
            onClick={() =>
              onSelectSector(null)
            }
          >
            ×
          </button>

          <span className="mars-planet-map__focus-eyebrow">
            {current
              ? t("mars.pixel.myTerritory")
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
                      ? t("mars.ares.verifyingAccess")
                      : aresAccess?.unlocked
                        ? t("mars.ares.accessAuthorized")
                        : t("mars.ares.securityLockActive")}
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
                      ? t("mars.ares.verifiedCheck")
                      : t("mars.ares.locked")}
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
                      ? t("mars.ares.verifiedCheck")
                      : t("mars.ares.locked")}
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
                      ? t("mars.ares.syncing")
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
                  ? t("mars.ares.verifyingAccess")
                  : aresAccess?.unlocked
                    ? t("mars.ares.enter")
                    : t("mars.ares.aresLocked")}
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
                <strong>{t("mars.ares.explorationLocked")}</strong>
              </div>

              <button
                type="button"
                className="mars-planet-map__enter is-locked"
                disabled
                aria-disabled="true"
              >
                {t("mars.ares.explorationLocked")}
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
