import { Box3, PlaneGeometry, Sphere } from "three";
import {
  ARES_GENESIS_RENDER_SEGMENTS,
  ARES_GENESIS_SIZE_METERS,
  sampleAresGenesisGameplaySurfaceMeters,
  type AresGenesisTerrainData,
} from "./AresGenesisTerrainData";

function createMarsMicroBumpData() {
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

  return { data, size };
}

// Keep the original grid and triangle orientation for collision parity. Tiles
// let WebGL skip buffers and draw calls for terrain outside the camera frustum.
const tileSegments = 128;
const tileStride = tileSegments + 1;
const segmentSize = ARES_GENESIS_SIZE_METERS / ARES_GENESIS_RENDER_SEGMENTS;
const halfSize = ARES_GENESIS_SIZE_METERS / 2;

function buildTileIndex() {
  const index = new Uint16Array(tileSegments * tileSegments * 6);
  let offset = 0;
  for (let row = 0; row < tileSegments; row++) {
    for (let col = 0; col < tileSegments; col++) {
      const a = row * tileStride + col;
      const b = a + tileStride;
      index.set([a, b, a + 1, b, b + 1, a + 1], offset);
      offset += 6;
    }
  }
  return index;
}

function copyTileAttribute(
  source: Float32Array,
  size: number,
  stride: number,
  offsetX: number,
  offsetZ: number,
) {
  const data = new Float32Array(tileStride * tileStride * size);
  for (let row = 0; row < tileStride; row++) {
    const start = ((offsetZ + row) * stride + offsetX) * size;
    data.set(source.subarray(start, start + tileStride * size), row * tileStride * size);
  }
  return data;
}

function buildTile(terrain: AresGenesisTerrainData, column: number, row: number) {
  // A one-cell margin provides the same neighboring faces as the full mesh
  // when computing normals. Only the interior tile reaches the renderer.
  const minColumn = Math.max(0, column - 1);
  const minRow = Math.max(0, row - 1);
  const columns = Math.min(ARES_GENESIS_RENDER_SEGMENTS, column + tileSegments + 1) - minColumn;
  const rows = Math.min(ARES_GENESIS_RENDER_SEGMENTS, row + tileSegments + 1) - minRow;
  const stride = columns + 1;
  const geometry = new PlaneGeometry(columns * segmentSize, rows * segmentSize, columns, rows);
  const { position, normal, uv } = geometry.attributes;
  for (let localZ = 0; localZ <= rows; localZ++) {
    const gridZ = minRow + localZ;
    const z = gridZ * segmentSize - halfSize;
    for (let localX = 0; localX <= columns; localX++) {
      const gridX = minColumn + localX;
      const x = gridX * segmentSize - halfSize;
      const index = localZ * stride + localX;
      position.setXYZ(index, x, sampleAresGenesisGameplaySurfaceMeters(terrain, x, z), z);
      uv.setXY(index, gridX / ARES_GENESIS_RENDER_SEGMENTS, 1 - gridZ / ARES_GENESIS_RENDER_SEGMENTS);
    }
  }
  geometry.computeVertexNormals();

  const offsetX = column - minColumn;
  const offsetZ = row - minRow;
  const vertices = copyTileAttribute(position.array as Float32Array, 3, stride, offsetX, offsetZ);
  const sphere = new Box3().setFromArray(vertices).getBoundingSphere(new Sphere());
  return {
    position: vertices,
    normal: copyTileAttribute(normal.array as Float32Array, 3, stride, offsetX, offsetZ),
    uv: copyTileAttribute(uv.array as Float32Array, 2, stride, offsetX, offsetZ),
    bounds: [sphere.center.x, sphere.center.y, sphere.center.z, sphere.radius],
  };
}

self.onmessage = ({ data: terrain }: MessageEvent<AresGenesisTerrainData>) => {
  const start = performance.now();
  const tiles = [];
  const index = buildTileIndex();
  for (let z = 0; z < ARES_GENESIS_RENDER_SEGMENTS; z += tileSegments) {
    for (let x = 0; x < ARES_GENESIS_RENDER_SEGMENTS; x += tileSegments) {
      tiles.push(buildTile(terrain, x, z));
    }
  }
  const geometryMs = performance.now() - start;

  const bump = createMarsMicroBumpData();
  const payload = {
    tiles,
    index,
    bump: bump.data,
    bumpSize: bump.size,
    geometryMs,
    bumpMs: performance.now() - start - geometryMs,
  };

  self.postMessage(payload, { transfer: [
    ...tiles.flatMap((tile) => [tile.position.buffer, tile.normal.buffer, tile.uv.buffer]),
    index.buffer, payload.bump.buffer,
  ] });
};
