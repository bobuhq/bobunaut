import fs from "node:fs";
import ts from "typescript";

const sourcePath = "src/core/mars/planetmap/MarsPixelGridMapper.ts";
const source = fs.readFileSync(sourcePath, "utf8");

const js = ts.transpileModule(source, {
  compilerOptions: {
    module: ts.ModuleKind.ESNext,
    target: ts.ScriptTarget.ES2022,
  },
}).outputText;

const moduleUrl =
  "data:text/javascript;base64," +
  Buffer.from(js).toString("base64");

const mapper = await import(moduleUrl);

const {
  MARS_PIXEL_SALE_BLOCK_SIZE,

  marsMapCoordinateToPixelV1,
  marsPixelToBlockCoordinateV1,
  marsPixelXToTextureXv1,
  marsPixelYToTextureYv1,
  marsUvToPixelCoordinateV1,
  createMarsPixelBlockSelectionV1,
} = mapper;

const WIDTH = 1000;
const HEIGHT = 1000;

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

assert(
  MARS_PIXEL_SALE_BLOCK_SIZE === 1,
  "1 coordinate must equal exactly 1 Mars Pixel",
);


const topLeft = marsMapCoordinateToPixelV1(0, 0, WIDTH, HEIGHT);
const bottomRight = marsMapCoordinateToPixelV1(100, 100, WIDTH, HEIGHT);

assert(topLeft.x === 0 && topLeft.y === 0, "Map origin failed");
assert(
  bottomRight.x === 999 && bottomRight.y === 999,
  "Map maximum failed",
);

const single = createMarsPixelBlockSelectionV1(520, 370, 520, 370);

assert(single.width === 1, "Single pixel width failed");
assert(single.height === 1, "Single pixel height failed");
assert(single.pixelCount === 1, "Single pixel count failed");

const ares = createMarsPixelBlockSelectionV1(520, 370, 529, 379);

assert(ares.width === 10, "Ares width failed");
assert(ares.height === 10, "Ares height failed");
assert(ares.pixelCount === 100, "Ares pixel count failed");

const reverse = createMarsPixelBlockSelectionV1(529, 379, 520, 370);

assert(reverse.xStart === 520, "Reverse X normalization failed");
assert(reverse.yStart === 370, "Reverse Y normalization failed");
assert(reverse.xEnd === 529, "Reverse X end failed");
assert(reverse.yEnd === 379, "Reverse Y end failed");
assert(reverse.pixelCount === 100, "Reverse selection count failed");

for (const x of [0, 1, 249, 250, 519, 520, 529, 750, 998, 999]) {
  const block = marsPixelToBlockCoordinateV1(x, 500);

  assert(block.blockX === x, `Pixel/block X mismatch at ${x}`);
  assert(block.pixelCount === 1, `Pixel/block size mismatch at ${x}`);

  const textureX = marsPixelXToTextureXv1(x, WIDTH);

  assert(
    textureX >= 0 && textureX < WIDTH,
    `Texture X outside grid at ${x}`,
  );
}

for (const y of [0, 1, 369, 370, 379, 500, 998, 999]) {
  const textureY = marsPixelYToTextureYv1(y, HEIGHT);

  assert(
    textureY === HEIGHT - 1 - y,
    `Texture Y inversion failed at ${y}`,
  );
}

for (const [u, v] of [
  [0, 0],
  [0, 1],
  [0.25, 0.5],
  [0.5, 0.5],
  [0.75, 0.5],
  [0.999999, 0.999999],
  [1, 0.5],
]) {
  const coordinate = marsUvToPixelCoordinateV1(
    u,
    v,
    WIDTH,
    HEIGHT,
  );

  assert(
    coordinate.x >= 0 && coordinate.x < WIDTH,
    `UV X outside grid for ${u},${v}`,
  );

  assert(
    coordinate.y >= 0 && coordinate.y < HEIGHT,
    `UV Y outside grid for ${u},${v}`,
  );
}

console.log("MARS PIXEL COORDINATE ENGINE V1: PASS");
console.log("Grid: 1000 x 1000 = 1,000,000 Mars Pixels");
console.log("Coordinate range: X 0-999 / Y 0-999");
console.log("Sale block: 1 coordinate = 1 Mars Pixel");
console.log("Ares protected geometry: X520-529 / Y370-379 = 100 pixels");
