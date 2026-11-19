import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import { Worker } from "node:worker_threads";
import { buildSync } from "esbuild";

const terrainModule = "./src/core/mars/exploration/engine/AresGenesisTerrainData.ts";
const workerModule = "./src/core/mars/exploration/engine/aresTerrain.worker.ts";
const heightMap = "/mars/ares-genesis/ares-genesis-height-16.bin";
const bin = readFileSync("public" + heightMap);

test("worker tiles match the real ARES collision surface and preserve seam normals", async () => {
  const { outputFiles: [bundle] } = buildSync({
    stdin: {
      contents: `
        import { parentPort, workerData } from "node:worker_threads";
        import { loadAresGenesisTerrainData, sampleAresGenesisRenderedSurfaceMeters } from "${terrainModule}";
        globalThis.fetch = async (url) => {
          if (url !== "${heightMap}") throw new Error("Unexpected asset");
          return new Response(workerData);
        };
        globalThis.self = {
          postMessage: (payload, options) => parentPort.postMessage(payload, options.transfer),
        };
        const terrain = await loadAresGenesisTerrainData();
        await import("${workerModule}");
        self.onmessage({ data: terrain });
        parentPort.postMessage([[-50, -74], [0, 0], [312, -840], [500, 247], [6399, 6399]]
          .map(([x, z]) => [x, sampleAresGenesisRenderedSurfaceMeters(terrain, x, z), z]));
      `,
      resolveDir: process.cwd(),
      loader: "js",
    },
    bundle: true,
    platform: "node",
    format: "esm",
    write: false,
  });

  const worker = new Worker(new URL(
    "data:text/javascript;base64," + Buffer.from(bundle.contents).toString("base64"),
  ), { workerData: bin });
  const [payload, samplePoints] = await new Promise((resolve, reject) => {
    const messages = [];
    worker.on("message", (value) => messages.push(value));
    worker.once("error", reject);
    worker.once("exit", (code) => {
      if (code === 0) resolve(messages);
      else reject(new Error(`Terrain worker exited with code ${code}`));
    });
  });

  const { tiles, index, bump } = payload;
  const side = 128;
  const stride = side + 1;
  assert.equal(tiles.length, 64);
  assert.equal(index.length * tiles.length / 3, 2 * 1024 ** 2);
  assert.equal(bump.length, 512 ** 2);
  assert.deepEqual(Array.from(index.slice(0, 6)), [0, stride, 1, stride, stride + 1, 1]);

  for (const [x, expected, z] of samplePoints) {
    const gridX = (x + 6400) / 12.5;
    const gridZ = (z + 6400) / 12.5;
    const tileX = Math.floor(gridX / side);
    const tileZ = Math.floor(gridZ / side);
    const tile = tiles[tileZ * 8 + tileX];
    const localX = Math.floor(gridX) % side;
    const localZ = Math.floor(gridZ) % side;
    const xFraction = gridX % 1;
    const zFraction = gridZ % 1;
    const height = (x, z) => tile.position[(z * stride + x) * 3 + 1];
    const upper = height(localX, localZ);
    const right = height(localX + 1, localZ);
    const down = height(localX, localZ + 1);
    const lower = height(localX + 1, localZ + 1);
    const actual = xFraction + zFraction <= 1
      ? upper + xFraction * (right - upper) + zFraction * (down - upper)
      : lower + (1 - xFraction) * (down - lower) + (1 - zFraction) * (right - lower);
    assert.ok(Math.abs(actual - expected) < 0.0001);
  }

  for (let tile = 0; tile < tiles.length; tile++) {
    const a = tiles[tile];
    for (const attribute of ["position", "normal", "uv"]) {
      const size = attribute === "uv" ? 2 : 3;
      const vertex = (tile, index) => tile[attribute].subarray(index * size, (index + 1) * size);
      for (let i = 0; i < stride; i++) {
        if (tile % 8 < 7) assert.deepEqual(vertex(a, i * stride + side), vertex(tiles[tile + 1], i * stride));
        if (tile < 56) assert.deepEqual(vertex(a, side * stride + i), vertex(tiles[tile + 8], i));
      }
    }
  }
});
