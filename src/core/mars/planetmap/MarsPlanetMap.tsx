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
  useMemo,
  useRef,
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

  const position = useMemo(
    () =>
      mapPositionToSphere(
        sector.map_x as number,
        sector.map_y as number,
      ),
    [
      sector.map_x,
      sector.map_y,
    ],
  );

  const color = current
    ? "#63f5ff"
    : selected
      ? "#c795ff"
      : "#ffb06a";

  return (
    <group position={position}>
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
            current || selected
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
            0.085,
            current || selected
              ? 0.145
              : 0.115,
            32,
          ]}
        />

        <meshBasicMaterial
          color={color}
          transparent
          opacity={
            current || selected
              ? 0.78
              : 0.38
          }
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {(current || selected) && (
        <Html
          center
          distanceFactor={7.8}
          position={[0, 0.22, 0]}
          style={{
            pointerEvents: "none",
          }}
        >
          <div
            className={[
              "mars-planet-map__sector-label",
              current
                ? "is-current"
                : "is-selected",
            ].join(" ")}
          >
            <strong>
              {sector.sector_code}
            </strong>

            <span>
              {sector.sector_name}
            </span>

            <small>
              {current
                ? "MY TERRITORY"
                : `${sector.current_colonies} / ${sector.max_colonies}`}
            </small>
          </div>
        </Html>
      )}
    </group>
  );
}

function MarsPlanet({
  sectors,
  currentSectorId,
  selectedSectorId,
  onSelectSector,
  diving,
}: Omit<
  MarsPlanetMapProps,
  "ariaLabel" | "onEnterSector" | "diving"
> & {
  diving: boolean;
}) {
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
        onClick={() => {
          if (selectedSectorId) {
            onSelectSector(null);
          }
        }}
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
        sectors.map(
        (sector) => (
          <SectorMarker
            key={
              sector.sector_id
            }
            sector={sector}
            current={
              sector.sector_id ===
              currentSectorId
            }
            selected={
              sector.sector_id ===
              selectedSectorId
            }
            onSelect={() =>
              onSelectSector(
                sector.sector_id,
              )
            }
          />
        ),
      )}
    </group>
  );
}

function MarsScene(
  props: Omit<
    MarsPlanetMapProps,
    "ariaLabel" | "onEnterSector"
  >,
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
}: MarsPlanetMapProps) {
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
          diving={diving}
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

          <button
            type="button"
            className="mars-planet-map__enter"
            onClick={() =>
              onEnterSector(
                selectedSector.sector_id,
              )
            }
          >
            ENTER SECTOR
            <span>→</span>
          </button>
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
