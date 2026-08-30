export type MarsPixelCoordinate = {
  x: number;
  y: number;
};

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
