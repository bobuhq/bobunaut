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
  onSelectSector: (sectorId: string) => void;
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

function mapPositionToSphere(
  mapX: number,
  mapY: number,
): Vector3 {
  const longitude =
    (mapX / 100) * Math.PI * 2 -
    Math.PI;

  const latitude =
    Math.PI / 2 -
    (mapY / 100) * Math.PI;

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
}: Omit<
  MarsPlanetMapProps,
  "ariaLabel"
>) {
  const groupRef =
    useRef<Group | null>(null);

  const atmosphereRef =
    useRef<Mesh | null>(null);

  const texture = useTexture(
    "/images/mars/nasa-mars-world.jpg",
  );

  texture.colorSpace =
    SRGBColorSpace;

  useFrame((_, delta) => {
    /*
     * Extremely slow idle movement.
     * User interaction remains primary.
     */
    if (groupRef.current) {
      groupRef.current.rotation.y +=
        delta * 0.006;
    }

    if (atmosphereRef.current) {
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

      {sectors.map((sector) => (
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
          onSelect={() =>
            onSelectSector(
              sector.sector_id,
            )
          }
        />
      ))}
    </group>
  );
}

function MarsScene(
  props: Omit<
    MarsPlanetMapProps,
    "ariaLabel"
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
        position={[-5, -2, -4]}
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
  ariaLabel,
}: MarsPlanetMapProps) {
  return (
    <section
      className="mars-planet-map"
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
        />
      </Canvas>

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
