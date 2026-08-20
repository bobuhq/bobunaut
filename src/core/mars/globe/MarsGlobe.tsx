import {
  Canvas,
  useFrame,
} from "@react-three/fiber";
import {
  Html,
  OrbitControls,
  Stars,
  useGLTF,
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
  Vector3,
} from "three";

import type {
  MarsSector,
} from "../MarsSectorService";

import "./MarsGlobe.css";

type MarsGlobeProps = {
  sectors: MarsSector[];
  currentSectorId: string | null;
  selectedSectorId: string | null;
  onSelectSector: (sectorId: string) => void;
  ariaLabel: string;
  className?: string;
};

type SectorMarkerProps = {
  sector: MarsSector;
  current: boolean;
  selected: boolean;
  onSelect: () => void;
};

const PLANET_RADIUS = 2.45;
const MARKER_RADIUS = 2.51;

function mapPositionToSphere(
  mapX: number,
  mapY: number,
): Vector3 {
  /*
   * Existing BUILD MARS map_x/map_y values are normalized
   * presentation coordinates, not scientific Mars latitude /
   * longitude.
   *
   * V1 projects that persistent layout onto the sphere so the
   * existing production sector model remains authoritative.
   */
  const longitude =
    (mapX / 100) * Math.PI * 2 - Math.PI;

  const latitude =
    Math.PI / 2 - (mapY / 100) * Math.PI;

  const cosLatitude = Math.cos(latitude);

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
    [sector.map_x, sector.map_y],
  );

  const markerColor = current
    ? "#63f5ff"
    : selected
      ? "#bb8cff"
      : "#ffb06a";

  const markerScale = current
    ? 1.35
    : selected
      ? 1.22
      : 1;

  return (
    <group position={position}>
      <mesh
        scale={markerScale}
        onClick={(event) => {
          event.stopPropagation();
          onSelect();
        }}
        onPointerOver={(event) => {
          event.stopPropagation();
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          document.body.style.cursor = "";
        }}
      >
        <sphereGeometry args={[0.055, 24, 24]} />

        <meshBasicMaterial
          color={markerColor}
          toneMapped={false}
        />
      </mesh>

      <mesh scale={markerScale * 1.7}>
        <ringGeometry
          args={[0.055, 0.083, 32]}
        />

        <meshBasicMaterial
          color={markerColor}
          transparent
          opacity={selected || current ? 0.72 : 0.38}
          side={DoubleSide}
          depthWrite={false}
          toneMapped={false}
        />
      </mesh>

      {(selected || current) && (
        <Html
          center
          distanceFactor={8.5}
          position={[0, 0.15, 0]}
          style={{
            pointerEvents: "none",
          }}
        >
          <div
            className={
              current
                ? "mars-globe-sector-label is-current"
                : "mars-globe-sector-label is-selected"
            }
          >
            <strong>{sector.sector_code}</strong>
            <span>{sector.sector_name}</span>
            <small>
              {sector.current_colonies}
              {" / "}
              {sector.max_colonies}
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
  MarsGlobeProps,
  "ariaLabel" | "className"
>) {
  const groupRef =
    useRef<Group | null>(null);

  const atmosphereRef =
    useRef<Mesh | null>(null);

  const { scene } = useGLTF(
    "/models/mars/nasa-mars.glb",
  );

  const marsScene = useMemo(
    () => scene.clone(true),
    [scene],
  );

  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y +=
        delta * 0.018;
    }

    if (atmosphereRef.current) {
      atmosphereRef.current.rotation.y -=
        delta * 0.008;
    }
  });

  return (
    <group
      ref={groupRef}
      rotation={[0.14, -0.55, 0]}
    >
      <primitive
        object={marsScene}
        scale={PLANET_RADIUS}
      />

      <mesh
        scale={PLANET_RADIUS * 1.018}
        ref={atmosphereRef}
      >
        <sphereGeometry
          args={[1, 96, 96]}
        />

        <meshBasicMaterial
          color="#ff7b46"
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
    MarsGlobeProps,
    "ariaLabel" | "className"
  >,
) {
  return (
    <>
      <color
        attach="background"
        args={["#02040a"]}
      />

      <fog
        attach="fog"
        args={["#02040a", 8, 19]}
      />

      <ambientLight intensity={0.42} />

      <directionalLight
        position={[5, 3.5, 6]}
        intensity={3.25}
        castShadow
      />

      <pointLight
        position={[-4, -1.5, -5]}
        intensity={0.55}
      />

      <MarsPlanet {...props} />

      <Stars
        radius={90}
        depth={40}
        count={2200}
        factor={3.2}
        saturation={0.2}
        fade
        speed={0.2}
      />

      <OrbitControls
        enablePan={false}
        enableDamping
        dampingFactor={0.06}
        minDistance={4.1}
        maxDistance={8.4}
        rotateSpeed={0.55}
        zoomSpeed={0.7}
        minPolarAngle={0.12}
        maxPolarAngle={
          Math.PI - 0.12
        }
      />
    </>
  );
}

export function MarsGlobe({
  sectors,
  currentSectorId,
  selectedSectorId,
  onSelectSector,
  ariaLabel,
  className = "",
}: MarsGlobeProps) {
  return (
    <div
      className={`mars-globe-shell ${className}`.trim()}
      role="region"
      aria-label={ariaLabel}
    >
      <Canvas
        className="mars-globe-canvas"
        camera={{
          position: [0, 0.25, 6.25],
          fov: 44,
          near: 0.1,
          far: 100,
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
    </div>
  );
}

useGLTF.preload("/models/mars/nasa-mars.glb");
