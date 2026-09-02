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
} from "../MarsPixelNetworkService";

import type {
  MarsPixelBlockDetail,
  MarsPixelNetworkStatus,
  MarsPixelPublicAllocation,
  MarsPixelPublicReservedZone,
  MarsPixelSelectionDetail,
} from "../MarsPixelNetworkService";

import {
  MarsPixelOverlay,
} from "./MarsPixelOverlay";

import {
  createMarsPixelBlockSelectionV1,
} from "./MarsPixelGridMapper";

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
  lockedSelectionCoordinate: {
    x: number;
    y: number;
  } | null;
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
  onPixelSelect,
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
          onPixelSelect={onPixelSelect}
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
  return (
    <>
      <color
        attach="background"
        args={["#010207"]}
      />

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

      <Stars
        radius={100}
        depth={45}
        count={2600}
        factor={3}
        saturation={0.15}
        fade
        speed={0.12}
      />

      <OrbitControls
        makeDefault
        enablePan={false}
        enabled={!props.diving}
        enableRotate={
          !props.selectedSectorId &&
          !props.diving
        }
        enableZoom={!props.diving}
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

  const pixelRequestRef = useRef(0);

  const pixelBlockSelection = useMemo(() => {
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
    selectedPixel,
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
      setSelectedPixelSelectionError(null);
      setSelectedPixelSelectionLoading(true);

      try {
        const detail =
          await getMarsPixelSelectionDetail(
            selectedPixel.x_start,
            selectedPixel.y_start,
            target.x,
            target.y,
          );

        if (
          pixelRequestRef.current !==
          requestId
        ) {
          return;
        }

        setSelectedPixelSelection(detail);
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
    setSelectedPixelSelectionError(null);
    setSelectedPixelSelectionLoading(false);
    setSelectedPixel(null);
    setSelectedPixelError(null);
    setSelectedPixelLoading(true);

    try {
      const detail =
        await getMarsPixelBlockAtCoordinate(
          coordinate.x,
          coordinate.y,
        );

      if (
        pixelRequestRef.current !==
        requestId
      ) {
        return;
      }

      setSelectedPixel(detail);
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
          Planetary Operations
        </strong>
      </div>

      <div
        className="mars-planet-map__pixel-hud"
        aria-live="polite"
      >
        <span>
          MARS PIXEL NETWORK
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

      {!diving &&
        hoveredPixelCoordinate && (
          <div
            className="mars-planet-map__coordinate-hud"
            aria-hidden="true"
          >
            <span>MARS GRID</span>
            <strong>
              X {hoveredPixelCoordinate.x}
              {" · "}
              Y {hoveredPixelCoordinate.y}
            </strong>
            <small>
              BLOCK {hoveredPixelCoordinate.blockX} /{" "}
              {hoveredPixelCoordinate.blockY}
            </small>
          </div>
        )}

      {!diving &&
        (selectedPixelLoading ||
          selectedPixel !== null ||
          selectedPixelError !== null) && (
          <aside
            className="mars-pixel-detail"
            aria-live="polite"
          >
            <div className="mars-pixel-detail__header">
              <div>
                <span className="mars-pixel-detail__eyebrow">
                  MARS PIXEL NETWORK
                </span>
                <strong>
                  BLOCK DETAIL
                </strong>
              </div>

              <button
                type="button"
                className="mars-pixel-detail__close"
                aria-label="Close block detail"
                onClick={() => {
                  pixelRequestRef.current += 1;
                  setLockedSelectionTarget(null);
                  setHoveredPixelCoordinate(null);
                  setSelectedPixelSelection(null);
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

            {selectedPixelLoading && (
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

            {!selectedPixelLoading &&
              selectedPixelSelectionLoading && (
                <div className="mars-pixel-detail__message">
                  VALIDATING SELECTION
                </div>
              )}

            {!selectedPixelLoading &&
              selectedPixelSelectionError && (
                <div className="mars-pixel-detail__message is-error">
                  {selectedPixelSelectionError}
                </div>
              )}

            {!selectedPixelLoading &&
              selectedPixel && (
                <>
                  <div className="mars-pixel-detail__coordinate">
                    {pixelBlockSelection
                      ? `SELECTION ${pixelBlockSelection.blockColumns} × ${pixelBlockSelection.blockRows}`
                      : `BLOCK ${selectedPixel.block_x} / ${selectedPixel.block_y}`}
                  </div>

                  {pixelBlockSelection && (
                    <div className="mars-pixel-detail__meta">
                      <span>BLOCKS</span>
                      <strong>
                        {pixelBlockSelection.blockCount}
                      </strong>
                    </div>
                  )}

                  <div className="mars-pixel-detail__meta">
                    <span>X RANGE</span>
                    <strong>
                      {pixelBlockSelection
                        ? `${pixelBlockSelection.xStart}–${pixelBlockSelection.xEnd}`
                        : `${selectedPixel.x_start}–${selectedPixel.x_end}`}
                    </strong>
                  </div>

                  <div className="mars-pixel-detail__meta">
                    <span>Y RANGE</span>
                    <strong>
                      {pixelBlockSelection
                        ? `${pixelBlockSelection.yStart}–${pixelBlockSelection.yEnd}`
                        : `${selectedPixel.y_start}–${selectedPixel.y_end}`}
                    </strong>
                  </div>

                  <div className="mars-pixel-detail__meta">
                    <span>AREA SIZE</span>
                    <strong>
                      {pixelBlockSelection
                        ? `${pixelBlockSelection.width} × ${pixelBlockSelection.height}`
                        : `${selectedPixel.width} × ${selectedPixel.height}`}
                    </strong>
                  </div>

                  <div className="mars-pixel-detail__meta">
                    <span>PIXELS</span>
                    <strong>
                      {pixelBlockSelection
                        ? pixelBlockSelection.pixelCount
                        : selectedPixel.pixel_count}
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
                          {status.toUpperCase()}
                        </div>

                        {status === "available" && (
                          <div className="mars-pixel-detail__commercial">
                            {purchasable
                              ? "COMMERCIAL ACCESS ACTIVE"
                              : "SALES LOCKED"}
                          </div>
                        )}

                        {status === "reserved" && (
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
            0.15,
            6.45,
          ],
          fov: 42,
          near: 0.1,
          far: 120,
        }}
        dpr={[1, 1.75]}
        gl={{
          antialias: true,
          alpha: false,
          powerPreference:
            "high-performance",
        }}
      >
        <MarsScene
          selectedPixelCoordinate={
            selectedPixel
              ? {
                  x: selectedPixel.x_start,
                  y: selectedPixel.y_start,
                }
              : null
          }
          lockedSelectionCoordinate={
            lockedSelectionTarget
          }
          onPixelSelect={handlePixelSelect}
          onPixelHover={setHoveredPixelCoordinate}
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
              : "SELECTED SECTOR"}
          </span>

          <h3>
            {selectedSector.sector_name}
          </h3>

          <div className="mars-planet-map__focus-code">
            {selectedSector.sector_code}
          </div>

          <div className="mars-planet-map__focus-stats">
            <div>
              <span>COLONIES</span>

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
                CONTRIBUTION
              </span>

              <strong>
                {
                  selectedSector.total_contribution
                }
              </strong>
            </div>

            <div>
              <span>STATUS</span>

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
                    ARES ACCESS PROTOCOL
                  </span>
                  <strong>
                    {aresAccessLoading
                      ? "VERIFYING ACCESS"
                      : aresAccess?.unlocked
                        ? "ACCESS AUTHORIZED"
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
                  <span>TELEGRAM VERIFICATION</span>
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
                  <span>X VERIFICATION</span>
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
                  <span>MINING DAYS</span>
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
                    ? "ENTER ARES"
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
          DRAG TO ROTATE
        </span>

        <span>
          SCROLL TO ZOOM
        </span>
      </div>
    </section>
  );
}

useTexture.preload(
  "/images/mars/nasa-mars-world.jpg",
);
