import {
  useFrame,
} from "@react-three/fiber";

import {
  useMemo,
  useRef,
} from "react";

import * as THREE from "three";

function randomSpherePoint(
  radiusMin: number,
  radiusMax: number,
) {
  const u =
    Math.random();

  const v =
    Math.random();

  const theta =
    2 *
    Math.PI *
    u;

  const phi =
    Math.acos(
      2 * v - 1,
    );

  const radius =
    THREE.MathUtils.lerp(
      radiusMin,
      radiusMax,
      Math.random(),
    );

  const sinPhi =
    Math.sin(phi);

  return new THREE.Vector3(
    radius *
      sinPhi *
      Math.cos(theta),

    radius *
      Math.cos(phi),

    radius *
      sinPhi *
      Math.sin(theta),
  );
}

function DeepStarField() {
  const geometry =
    useMemo(() => {
      const count =
        5200;

      const positions =
        new Float32Array(
          count * 3,
        );

      const colors =
        new Float32Array(
          count * 3,
        );

      for (
        let i = 0;
        i < count;
        i += 1
      ) {
        const point =
          randomSpherePoint(
            85,
            118,
          );

        positions[
          i * 3
        ] =
          point.x;

        positions[
          i * 3 + 1
        ] =
          point.y;

        positions[
          i * 3 + 2
        ] =
          point.z;

        const temperature =
          Math.random();

        let color =
          new THREE.Color(
            "#dcecff",
          );

        if (
          temperature >
          0.88
        ) {
          color =
            new THREE.Color(
              "#ffd5a6",
            );
        } else if (
          temperature <
          0.12
        ) {
          color =
            new THREE.Color(
              "#a9c9ff",
            );
        }

        const brightness =
          THREE.MathUtils.lerp(
            0.35,
            1,
            Math.pow(
              Math.random(),
              2.2,
            ),
          );

        colors[
          i * 3
        ] =
          color.r *
          brightness;

        colors[
          i * 3 + 1
        ] =
          color.g *
          brightness;

        colors[
          i * 3 + 2
        ] =
          color.b *
          brightness;
      }

      const geo =
        new THREE.BufferGeometry();

      geo.setAttribute(
        "position",
        new THREE.BufferAttribute(
          positions,
          3,
        ),
      );

      geo.setAttribute(
        "color",
        new THREE.BufferAttribute(
          colors,
          3,
        ),
      );

      return geo;
    }, []);

  return (
    <points
      geometry={geometry}
    >
      <pointsMaterial
        size={0.22}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.84}
        depthWrite={false}
        toneMapped={false}
      />
    </points>
  );
}

function BrightStars() {
  const geometry =
    useMemo(() => {
      const count =
        170;

      const positions =
        new Float32Array(
          count * 3,
        );

      const colors =
        new Float32Array(
          count * 3,
        );

      for (
        let i = 0;
        i < count;
        i += 1
      ) {
        const point =
          randomSpherePoint(
            88,
            110,
          );

        positions[
          i * 3
        ] =
          point.x;

        positions[
          i * 3 + 1
        ] =
          point.y;

        positions[
          i * 3 + 2
        ] =
          point.z;

        const warm =
          Math.random() >
          0.65;

        const color =
          new THREE.Color(
            warm
              ? "#ffd8aa"
              : "#d7e8ff",
          );

        colors[
          i * 3
        ] =
          color.r;

        colors[
          i * 3 + 1
        ] =
          color.g;

        colors[
          i * 3 + 2
        ] =
          color.b;
      }

      const geo =
        new THREE.BufferGeometry();

      geo.setAttribute(
        "position",
        new THREE.BufferAttribute(
          positions,
          3,
        ),
      );

      geo.setAttribute(
        "color",
        new THREE.BufferAttribute(
          colors,
          3,
        ),
      );

      return geo;
    }, []);

  return (
    <points
      geometry={geometry}
    >
      <pointsMaterial
        size={0.55}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.95}
        depthWrite={false}
        blending={
          THREE.AdditiveBlending
        }
        toneMapped={false}
      />
    </points>
  );
}

function MilkyWayBand() {
  const geometry =
    useMemo(() => {
      const count =
        2400;

      const positions =
        new Float32Array(
          count * 3,
        );

      const colors =
        new Float32Array(
          count * 3,
        );

      const tilt =
        THREE.MathUtils.degToRad(
          28,
        );

      for (
        let i = 0;
        i < count;
        i += 1
      ) {
        const longitude =
          Math.random() *
          Math.PI *
          2;

        const latitude =
          THREE.MathUtils.degToRad(
            THREE.MathUtils.randFloatSpread(
              18,
            ),
          );

        const radius =
          THREE.MathUtils.randFloat(
            92,
            112,
          );

        let x =
          radius *
          Math.cos(latitude) *
          Math.cos(longitude);

        let y =
          radius *
          Math.sin(latitude);

        let z =
          radius *
          Math.cos(latitude) *
          Math.sin(longitude);

        const rotatedY =
          y *
            Math.cos(tilt) -
          z *
            Math.sin(tilt);

        const rotatedZ =
          y *
            Math.sin(tilt) +
          z *
            Math.cos(tilt);

        y =
          rotatedY;

        z =
          rotatedZ;

        positions[
          i * 3
        ] =
          x;

        positions[
          i * 3 + 1
        ] =
          y;

        positions[
          i * 3 + 2
        ] =
          z;

        const color =
          Math.random() >
          0.82
            ? new THREE.Color(
                "#ffd4ae",
              )
            : new THREE.Color(
                "#c5d8ff",
              );

        const brightness =
          THREE.MathUtils.randFloat(
            0.15,
            0.55,
          );

        colors[
          i * 3
        ] =
          color.r *
          brightness;

        colors[
          i * 3 + 1
        ] =
          color.g *
          brightness;

        colors[
          i * 3 + 2
        ] =
          color.b *
          brightness;
      }

      const geo =
        new THREE.BufferGeometry();

      geo.setAttribute(
        "position",
        new THREE.BufferAttribute(
          positions,
          3,
        ),
      );

      geo.setAttribute(
        "color",
        new THREE.BufferAttribute(
          colors,
          3,
        ),
      );

      return geo;
    }, []);

  return (
    <points
      geometry={geometry}
    >
      <pointsMaterial
        size={0.18}
        sizeAttenuation
        vertexColors
        transparent
        opacity={0.52}
        depthWrite={false}
        blending={
          THREE.AdditiveBlending
        }
        toneMapped={false}
      />
    </points>
  );
}

function ShootingStar() {
  const groupRef =
    useRef<THREE.Group | null>(
      null,
    );

  const materialRef =
    useRef<THREE.MeshBasicMaterial | null>(
      null,
    );

  const nextStartRef =
    useRef(
      4 +
        Math.random() *
          8,
    );

  const activeStartRef =
    useRef<number | null>(
      null,
    );

  const startRef =
    useRef(
      new THREE.Vector3(),
    );

  const directionRef =
    useRef(
      new THREE.Vector3(
        1,
        -0.35,
        0,
      ).normalize(),
    );

  useFrame(
    ({
      clock,
      camera,
    }) => {
      const group =
        groupRef.current;

      const material =
        materialRef.current;

      if (
        !group ||
        !material
      ) {
        return;
      }

      const now =
        clock.elapsedTime;

      if (
        activeStartRef.current ===
          null &&
        now >=
          nextStartRef.current
      ) {
        activeStartRef.current =
          now;

        const forward =
          new THREE.Vector3();

        camera.getWorldDirection(
          forward,
        );

        forward.y =
          Math.max(
            forward.y,
            0.1,
          );

        forward.normalize();

        const right =
          new THREE.Vector3()
            .crossVectors(
              forward,
              camera.up,
            )
            .normalize();

        startRef.current
          .copy(
            camera.position,
          )
          .addScaledVector(
            forward,
            70,
          )
          .addScaledVector(
            right,
            THREE.MathUtils.randFloat(
              -34,
              18,
            ),
          );

        startRef.current.y +=
          THREE.MathUtils.randFloat(
            22,
            38,
          );

        directionRef.current
          .copy(right)
          .multiplyScalar(
            THREE.MathUtils.randFloat(
              0.8,
              1.2,
            ),
          );

        directionRef.current.y =
          THREE.MathUtils.randFloat(
            -0.5,
            -0.25,
          );

        directionRef.current.normalize();
      }

      if (
        activeStartRef.current ===
        null
      ) {
        group.visible =
          false;

        return;
      }

      const elapsed =
        now -
        activeStartRef.current;

      const duration =
        1.15;

      if (
        elapsed >
        duration
      ) {
        group.visible =
          false;

        activeStartRef.current =
          null;

        nextStartRef.current =
          now +
          THREE.MathUtils.randFloat(
            7,
            14,
          );

        return;
      }

      const progress =
        elapsed /
        duration;

      group.visible =
        true;

      group.position
        .copy(
          startRef.current,
        )
        .addScaledVector(
          directionRef.current,
          progress * 34,
        );

      group.quaternion.setFromUnitVectors(
        new THREE.Vector3(
          1,
          0,
          0,
        ),
        directionRef.current,
      );

      material.opacity =
        Math.sin(
          progress *
            Math.PI,
        ) *
        1;
    },
  );

  return (
    <group
      ref={groupRef}
      visible={false}
    >
      <mesh
        rotation={[
          0,
          0,
          0,
        ]}
      >
        <planeGeometry
          args={[
            12,
            0.14,
          ]}
        />

        <meshBasicMaterial
          ref={materialRef}
          color="#fff7e8"
          transparent
          opacity={0}
          depthWrite={false}
          blending={
            THREE.AdditiveBlending
          }
          toneMapped={false}
          side={THREE.DoubleSide}
        />
      </mesh>

      <mesh
        position={[
          6,
          0,
          0,
        ]}
      >
        <sphereGeometry
          args={[
            0.11,
            12,
            12,
          ]}
        />

        <meshBasicMaterial
          color="#ffffff"
          toneMapped={false}
        />
      </mesh>
    </group>
  );
}

export function AresSky() {
  return (
    <>
      <DeepStarField />

      <BrightStars />

      <MilkyWayBand />

      <ShootingStar />
    </>
  );
}
