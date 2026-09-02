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

export type MarsPixelBlockSelection = {
  anchorBlockX: number;
  anchorBlockY: number;
  targetBlockX: number;
  targetBlockY: number;
  blockXStart: number;
  blockYStart: number;
  blockXEnd: number;
  blockYEnd: number;
  xStart: number;
  yStart: number;
  xEnd: number;
  yEnd: number;
  width: number;
  height: number;
  blockColumns: number;
  blockRows: number;
  blockCount: number;
  pixelCount: number;
};

export function createMarsPixelBlockSelectionV1(
  anchorPixelX: number,
  anchorPixelY: number,
  targetPixelX: number,
  targetPixelY: number,
): MarsPixelBlockSelection {
  const anchor =
    marsPixelToBlockCoordinateV1(
      anchorPixelX,
      anchorPixelY,
    );

  const target =
    marsPixelToBlockCoordinateV1(
      targetPixelX,
      targetPixelY,
    );

  const blockXStart = Math.min(
    anchor.blockX,
    target.blockX,
  );

  const blockYStart = Math.min(
    anchor.blockY,
    target.blockY,
  );

  const blockXEnd = Math.max(
    anchor.blockX,
    target.blockX,
  );

  const blockYEnd = Math.max(
    anchor.blockY,
    target.blockY,
  );

  const blockColumns =
    blockXEnd - blockXStart + 1;

  const blockRows =
    blockYEnd - blockYStart + 1;

  const blockCount =
    blockColumns * blockRows;

  const xStart =
    blockXStart *
    MARS_PIXEL_SALE_BLOCK_SIZE;

  const yStart =
    blockYStart *
    MARS_PIXEL_SALE_BLOCK_SIZE;

  const xEnd =
    (blockXEnd + 1) *
      MARS_PIXEL_SALE_BLOCK_SIZE -
    1;

  const yEnd =
    (blockYEnd + 1) *
      MARS_PIXEL_SALE_BLOCK_SIZE -
    1;

  const width =
    blockColumns *
    MARS_PIXEL_SALE_BLOCK_SIZE;

  const height =
    blockRows *
    MARS_PIXEL_SALE_BLOCK_SIZE;

  return {
    anchorBlockX: anchor.blockX,
    anchorBlockY: anchor.blockY,
    targetBlockX: target.blockX,
    targetBlockY: target.blockY,
    blockXStart,
    blockYStart,
    blockXEnd,
    blockYEnd,
    xStart,
    yStart,
    xEnd,
    yEnd,
    width,
    height,
    blockColumns,
    blockRows,
    blockCount,
    pixelCount: width * height,
  };
}
