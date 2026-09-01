export type MarsPixelCoordinate = {
  x: number;
  y: number;
};

export const MARS_PIXEL_SALE_BLOCK_SIZE = 10;

export type MarsPixelBlockCoordinate = {
  blockX: number;
  blockY: number;
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
  width: number;
  height: number;
  pixelCount: number;
};

export function marsPixelToBlockCoordinateV1(
  pixelX: number,
  pixelY: number,
): MarsPixelBlockCoordinate {
  const blockX = Math.floor(
    pixelX / MARS_PIXEL_SALE_BLOCK_SIZE,
  );

  const blockY = Math.floor(
    pixelY / MARS_PIXEL_SALE_BLOCK_SIZE,
  );

  const xStart =
    blockX * MARS_PIXEL_SALE_BLOCK_SIZE;

  const yStart =
    blockY * MARS_PIXEL_SALE_BLOCK_SIZE;

  return {
    blockX,
    blockY,
    xStart,
    yStart,
    xEnd:
      xStart + MARS_PIXEL_SALE_BLOCK_SIZE - 1,
    yEnd:
      yStart + MARS_PIXEL_SALE_BLOCK_SIZE - 1,
    width: MARS_PIXEL_SALE_BLOCK_SIZE,
    height: MARS_PIXEL_SALE_BLOCK_SIZE,
    pixelCount:
      MARS_PIXEL_SALE_BLOCK_SIZE *
      MARS_PIXEL_SALE_BLOCK_SIZE,
  };
}

function clampGridCoordinate(
  value: number,
  size: number,
) {
  return Math.min(
    size - 1,
    Math.max(
      0,
      Math.floor(value),
    ),
  );
}

function wrapUnitInterval(
  value: number,
) {
  return (
    ((value % 1) + 1) % 1
  );
}

export function marsUvToPixelCoordinateV1(
  u: number,
  v: number,
  gridWidth: number,
  gridHeight: number,
): MarsPixelCoordinate {
  const canonicalU =
    wrapUnitInterval(
      u + 0.25,
    );

  return {
    x: clampGridCoordinate(
      canonicalU * gridWidth,
      gridWidth,
    ),
    y: clampGridCoordinate(
      (1 - v) * gridHeight,
      gridHeight,
    ),
  };
}

export function marsMapCoordinateToPixelV1(
  mapX: number,
  mapY: number,
  gridWidth: number,
  gridHeight: number,
): MarsPixelCoordinate {
  return {
    x: clampGridCoordinate(
      (mapX / 100) * gridWidth,
      gridWidth,
    ),
    y: clampGridCoordinate(
      (mapY / 100) * gridHeight,
      gridHeight,
    ),
  };
}

export function marsPixelXToTextureXv1(
  pixelX: number,
  gridWidth: number,
) {
  const normalized =
    pixelX / gridWidth;

  return clampGridCoordinate(
    wrapUnitInterval(
      normalized + 0.75,
    ) * gridWidth,
    gridWidth,
  );
}

export function marsPixelYToTextureYv1(
  pixelY: number,
  gridHeight: number,
) {
  return clampGridCoordinate(
    gridHeight - 1 - pixelY,
    gridHeight,
  );
}
