import {
  useEffect,
  useMemo,
  useState,
} from "react";

import {
  useTexture,
} from "@react-three/drei";

import * as THREE from "three";

import {
  ARES_GENESIS_SIZE_METERS,
  ARES_GENESIS_SURFACE_TEXTURE_URL,
  loadAresGenesisTerrainData,
  sampleAresGenesisGameplaySurfaceMeters,
  type AresGenesisTerrainData,
} from "../engine/AresGenesisTerrainData";

function createMarsMicroBumpTexture() {
  const size = 512;
  const values =
    new Uint8Array(
      size * size,
    );

  let seed =
    0x41524553;

  function random() {
    seed =
      (
        Math.imul(
          seed,
          1664525,
        ) +
        1013904223
      ) >>> 0;

    return (
      seed /
      4294967296
    );
  }

  for (
    let index = 0;
    index < values.length;
    index += 1
  ) {
    values[index] =
      Math.floor(
        104 +
        random() * 48,
      );
  }

  let source = values;

  for (
    let pass = 0;
    pass < 3;
    pass += 1
  ) {
    const next =
      new Uint8Array(
        source.length,
      );

    for (
      let y = 0;
      y < size;
      y += 1
    ) {
      for (
        let x = 0;
        x < size;
        x += 1
      ) {
        let total = 0;
        let count = 0;

        for (
          let oy = -1;
          oy <= 1;
          oy += 1
        ) {
          for (
            let ox = -1;
            ox <= 1;
            ox += 1
          ) {
            const sx =
              (
                x +
                ox +
                size
              ) %
              size;

            const sy =
              (
                y +
                oy +
                size
              ) %
              size;

            total +=
              source[
                sy * size +
                sx
              ];

            count += 1;
          }
        }

        next[
          y * size +
          x
        ] =
          Math.round(
            total / count,
          );
      }
    }

    source = next;
  }

  const heightValues =
    new Float32Array(
      source.length,
    );

  for (
    let index = 0;
    index < source.length;
    index += 1
  ) {
    heightValues[index] =
      source[index];
  }

  for (
    let crater = 0;
    crater < 34;
    crater += 1
  ) {
    const centerX =
      random() * size;

    const centerY =
      random() * size;

    const radius =
      7 +
      random() * 29;

    const minX =
      Math.floor(
        centerX -
        radius -
        3,
      );

    const maxX =
      Math.ceil(
        centerX +
        radius +
        3,
      );

    const minY =
      Math.floor(
        centerY -
        radius -
        3,
      );

    const maxY =
      Math.ceil(
        centerY +
        radius +
        3,
      );

    for (
      let y = minY;
      y <= maxY;
      y += 1
    ) {
      for (
        let x = minX;
        x <= maxX;
        x += 1
      ) {
        const wrappedX =
          (
            x +
            size
          ) %
          size;

        const wrappedY =
          (
            y +
            size
          ) %
          size;

        const dx =
          x -
          centerX;

        const dy =
          y -
          centerY;

        const distance =
          Math.sqrt(
            dx * dx +
            dy * dy,
          );

        const normalized =
          distance /
          radius;

        if (
          normalized >
          1.18
        ) {
          continue;
        }

        let delta = 0;

        if (
          normalized <
          0.72
        ) {
          const bowl =
            1 -
            normalized /
              0.72;

          delta -=
            38 *
            bowl *
            bowl;
        } else {
          const rimDistance =
            Math.abs(
              normalized -
              0.88,
            ) /
            0.3;

          if (
            rimDistance <
            1
          ) {
            const rim =
              1 -
              rimDistance;

            delta +=
              24 *
              rim *
              rim;
          }
        }

        heightValues[
          wrappedY *
            size +
          wrappedX
        ] +=
          delta;
      }
    }
  }

  const data =
    new Uint8Array(
      heightValues.length,
    );

  for (
    let index = 0;
    index < data.length;
    index += 1
  ) {
    data[index] =
      Math.max(
        0,
        Math.min(
          255,
          Math.round(
            heightValues[index],
          ),
        ),
      );
  }

  const texture =
    new THREE.DataTexture(
      data,
      size,
      size,
      THREE.RedFormat,
      THREE.UnsignedByteType,
    );

  texture.wrapS =
    THREE.RepeatWrapping;

  texture.wrapT =
    THREE.RepeatWrapping;

  texture.repeat.set(
    32,
    32,
  );

  texture.magFilter =
    THREE.LinearFilter;

  texture.minFilter =
    THREE.LinearMipmapLinearFilter;

  texture.generateMipmaps =
    true;

  texture.needsUpdate =
    true;

  return texture;
}

export function MarsExplorationTerrain() {
  const [
    terrainData,
    setTerrainData,
  ] =
    useState<AresGenesisTerrainData | null>(
      null,
    );

  const surfaceTexture =
    useTexture(
      ARES_GENESIS_SURFACE_TEXTURE_URL,
    );

  const microBumpTexture =
    useMemo(
      () =>
        createMarsMicroBumpTexture(),
      [],
    );

  useEffect(() => {
    let active = true;

    loadAresGenesisTerrainData()
      .then((terrain) => {
        if (active) {
          setTerrainData(terrain);
        }
      })
      .catch((error) => {
        console.error(
          "Failed to initialize Ares Genesis terrain",
          error,
        );
      });

    return () => {
      active = false;
    };
  }, []);

  surfaceTexture.colorSpace =
    THREE.SRGBColorSpace;

  surfaceTexture.wrapS =
    THREE.ClampToEdgeWrapping;

  surfaceTexture.wrapT =
    THREE.ClampToEdgeWrapping;

  const geometry =
    useMemo(() => {
      if (!terrainData) {
        return null;
      }

      const next =
        new THREE.PlaneGeometry(
          ARES_GENESIS_SIZE_METERS,
          ARES_GENESIS_SIZE_METERS,
          1024,
          1024,
        );

      next.rotateX(
        -Math.PI / 2,
      );

      const position =
        next.attributes.position;

      for (
        let index = 0;
        index < position.count;
        index += 1
      ) {
        const x =
          position.getX(index);

        const z =
          position.getZ(index);

        const surfaceHeight =
          sampleAresGenesisGameplaySurfaceMeters(
            terrainData,
            x,
            z,
          );

        position.setY(
          index,
          surfaceHeight,
        );
      }

      position.needsUpdate = true;

      next.computeVertexNormals();
      next.computeBoundingBox();
      next.computeBoundingSphere();

      return next;
    }, [terrainData]);

  useEffect(() => {
    return () => {
      geometry?.dispose();
    };
  }, [geometry]);

  useEffect(() => {
    return () => {
      microBumpTexture.dispose();
    };
  }, [microBumpTexture]);

  if (!geometry) {
    return null;
  }

  return (
    <mesh
      geometry={geometry}
      receiveShadow
    >
      <meshStandardMaterial
        map={surfaceTexture}
        bumpMap={microBumpTexture}
        bumpScale={1.7}
        roughness={0.94}
        metalness={0}
      />
    </mesh>
  );
}

useTexture.preload(
  ARES_GENESIS_SURFACE_TEXTURE_URL,
);
