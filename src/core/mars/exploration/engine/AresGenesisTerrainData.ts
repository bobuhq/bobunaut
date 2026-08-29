import * as THREE from "three";

export const ARES_GENESIS_HEIGHT_WIDTH = 256;
export const ARES_GENESIS_HEIGHT_HEIGHT = 256;

export const ARES_GENESIS_PIXEL_SIZE_METERS = 50;

export const ARES_GENESIS_VISUAL_VERTICAL_SCALE = 3;

export const ARES_GENESIS_SIZE_METERS =
  ARES_GENESIS_HEIGHT_WIDTH *
  ARES_GENESIS_PIXEL_SIZE_METERS;

export const ARES_GENESIS_SAFE_BOUNDARY_METERS =
  ARES_GENESIS_SIZE_METERS /
    2 -
  ARES_GENESIS_PIXEL_SIZE_METERS;

export const ARES_GENESIS_MIN_ELEVATION_METERS =
  -3836;

export const ARES_GENESIS_MAX_ELEVATION_METERS =
  -3455;

export const ARES_GENESIS_CENTER_ELEVATION_METERS =
  -3699;

export const ARES_GENESIS_HEIGHT_BINARY_URL =
  "/mars/ares-genesis/ares-genesis-height-16.bin";

export const ARES_GENESIS_SURFACE_TEXTURE_URL =
  "/mars/ares-genesis/ares-genesis-surface-co5ps-display.png";

const UINT16_MAX = 65535;

export type AresGenesisTerrainData = {
  width: number;
  height: number;
  elevations: Float32Array;
};

let terrainDataPromise:
  Promise<AresGenesisTerrainData> | null =
  null;

function decodeElevationMeters(
  encodedHeight: number,
): number {
  const normalized =
    encodedHeight /
    UINT16_MAX;

  return (
    ARES_GENESIS_MIN_ELEVATION_METERS +
    normalized *
      (
        ARES_GENESIS_MAX_ELEVATION_METERS -
        ARES_GENESIS_MIN_ELEVATION_METERS
      )
  );
}

async function fetchAresGenesisTerrainData(): Promise<AresGenesisTerrainData> {
  const response =
    await fetch(
      ARES_GENESIS_HEIGHT_BINARY_URL,
    );

  if (!response.ok) {
    throw new Error(
      `Failed to load Ares Genesis height data: ${response.status}`,
    );
  }

  const buffer =
    await response.arrayBuffer();

  const expectedByteLength =
    ARES_GENESIS_HEIGHT_WIDTH *
    ARES_GENESIS_HEIGHT_HEIGHT *
    2;

  if (
    buffer.byteLength !==
    expectedByteLength
  ) {
    throw new Error(
      `Invalid Ares Genesis height data size: expected ${expectedByteLength}, received ${buffer.byteLength}`,
    );
  }

  const view =
    new DataView(buffer);

  const elevations =
    new Float32Array(
      ARES_GENESIS_HEIGHT_WIDTH *
      ARES_GENESIS_HEIGHT_HEIGHT,
    );

  for (
    let index = 0;
    index < elevations.length;
    index += 1
  ) {
    const encodedHeight =
      view.getUint16(
        index * 2,
        true,
      );

    elevations[index] =
      decodeElevationMeters(
        encodedHeight,
      );
  }

  return {
    width:
      ARES_GENESIS_HEIGHT_WIDTH,
    height:
      ARES_GENESIS_HEIGHT_HEIGHT,
    elevations,
  };
}

export function loadAresGenesisTerrainData(): Promise<AresGenesisTerrainData> {
  if (!terrainDataPromise) {
    terrainDataPromise =
      fetchAresGenesisTerrainData();
  }

  return terrainDataPromise;
}

function sampleGridElevation(
  terrain: AresGenesisTerrainData,
  column: number,
  row: number,
): number {
  const safeColumn =
    Math.max(
      0,
      Math.min(
        terrain.width - 1,
        column,
      ),
    );

  const safeRow =
    Math.max(
      0,
      Math.min(
        terrain.height - 1,
        row,
      ),
    );

  return terrain.elevations[
    safeRow *
      terrain.width +
      safeColumn
  ];
}

export function sampleAresGenesisElevationMeters(
  terrain: AresGenesisTerrainData,
  worldX: number,
  worldZ: number,
): number {
  const halfSize =
    ARES_GENESIS_SIZE_METERS /
    2;

  const normalizedX =
    (
      worldX +
      halfSize
    ) /
    ARES_GENESIS_SIZE_METERS;

  const normalizedZ =
    (
      worldZ +
      halfSize
    ) /
    ARES_GENESIS_SIZE_METERS;

  const pixelX =
    Math.max(
      0,
      Math.min(
        1,
        normalizedX,
      ),
    ) *
    (terrain.width - 1);

  const pixelY =
    Math.max(
      0,
      Math.min(
        1,
        normalizedZ,
      ),
    ) *
    (terrain.height - 1);

  const x0 =
    Math.floor(pixelX);

  const y0 =
    Math.floor(pixelY);

  const x1 =
    Math.min(
      terrain.width - 1,
      x0 + 1,
    );

  const y1 =
    Math.min(
      terrain.height - 1,
      y0 + 1,
    );

  const tx =
    pixelX - x0;

  const ty =
    pixelY - y0;

  const topLeft =
    sampleGridElevation(
      terrain,
      x0,
      y0,
    );

  const topRight =
    sampleGridElevation(
      terrain,
      x1,
      y0,
    );

  const bottomLeft =
    sampleGridElevation(
      terrain,
      x0,
      y1,
    );

  const bottomRight =
    sampleGridElevation(
      terrain,
      x1,
      y1,
    );

  const top =
    topLeft +
    (
      topRight -
      topLeft
    ) *
      tx;

  const bottom =
    bottomLeft +
    (
      bottomRight -
      bottomLeft
    ) *
      tx;

  return (
    top +
    (
      bottom -
      top
    ) *
      ty
  );
}

export function sampleAresGenesisRelativeHeightMeters(
  terrain: AresGenesisTerrainData,
  worldX: number,
  worldZ: number,
): number {
  return (
    sampleAresGenesisElevationMeters(
      terrain,
      worldX,
      worldZ,
    ) -
    ARES_GENESIS_CENTER_ELEVATION_METERS
  );
}

function gameplayHash2D(
  x: number,
  z: number,
): number {
  let value =
    (
      Math.imul(
        Math.floor(x),
        374761393,
      ) +
      Math.imul(
        Math.floor(z),
        668265263,
      )
    ) | 0;

  value =
    Math.imul(
      value ^ (value >>> 13),
      1274126177,
    );

  return (
    (
      value ^
      (value >>> 16)
    ) >>>
    0
  ) / 4294967295;
}

function smoothstep(
  value: number,
): number {
  return (
    value *
    value *
    (
      3 -
      2 * value
    )
  );
}

function gameplayValueNoise(
  worldX: number,
  worldZ: number,
  cellSize: number,
): number {
  const x =
    worldX / cellSize;

  const z =
    worldZ / cellSize;

  const x0 =
    Math.floor(x);

  const z0 =
    Math.floor(z);

  const tx =
    smoothstep(
      x - x0,
    );

  const tz =
    smoothstep(
      z - z0,
    );

  const a =
    gameplayHash2D(
      x0,
      z0,
    );

  const b =
    gameplayHash2D(
      x0 + 1,
      z0,
    );

  const c =
    gameplayHash2D(
      x0,
      z0 + 1,
    );

  const d =
    gameplayHash2D(
      x0 + 1,
      z0 + 1,
    );

  const top =
    THREE.MathUtils.lerp(
      a,
      b,
      tx,
    );

  const bottom =
    THREE.MathUtils.lerp(
      c,
      d,
      tx,
    );

  return (
    THREE.MathUtils.lerp(
      top,
      bottom,
      tz,
    ) *
      2 -
    1
  );
}

export function sampleAresGenesisGameplayDetailMeters(
  worldX: number,
  worldZ: number,
): number {
  const broad =
    gameplayValueNoise(
      worldX,
      worldZ,
      46,
    ) *
    1.4;

  const medium =
    gameplayValueNoise(
      worldX + 173,
      worldZ - 91,
      19,
    ) *
    0.65;

  const fine =
    gameplayValueNoise(
      worldX - 311,
      worldZ + 257,
      7,
    ) *
    0.18;

  return (
    broad +
    medium +
    fine
  );
}

export function sampleAresGenesisGameplaySurfaceMeters(
  terrain: AresGenesisTerrainData,
  worldX: number,
  worldZ: number,
): number {
  return (
    sampleAresGenesisRelativeHeightMeters(
      terrain,
      worldX,
      worldZ,
    ) *
      ARES_GENESIS_VISUAL_VERTICAL_SCALE +
    sampleAresGenesisGameplayDetailMeters(
      worldX,
      worldZ,
    )
  );
}
