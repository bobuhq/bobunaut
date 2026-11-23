import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { buildSync } from 'esbuild';
import { CatmullRomCurve3, PerspectiveCamera, Vector3 } from 'three';
import { CAMPUS_ASSETS } from '../../src/imported-v11/core/mars/exploration/genesis-v5/3d/campus-layout.mjs';
import { selectCampusBuildings } from '../../src/core/mars/exploration/separate-v11/connected-campus-layout.mjs';
import { GREEN_LANDING_ZONE } from '../../src/core/mars/exploration/genesis-v5/green-landing-zone.mjs';
import { SPACECRAFT_RADIUS } from '../../src/core/mars/exploration/genesis-v5/spacecraft-v3.mjs';

const source = './src/core/mars/exploration';
const { outputFiles } = buildSync({
  stdin: {
    contents: `
      export * from '${source}/separate-v11/PremiumCampusLandscape.tsx';
      export { sampleAresGenesisRenderedSurfaceMeters } from '${source}/engine/AresGenesisTerrainData.ts';
    `,
    resolveDir: process.cwd(),
    loader: 'ts',
  },
  bundle: true,
  write: false,
  packages: 'external',
  platform: 'node',
  format: 'cjs',
  jsx: 'automatic',
});
const bundled = { exports: {} };
new Function('require', 'exports', 'module', outputFiles[0].text)(
  createRequire(resolve('package.json')), bundled.exports, bundled,
);
const { buildPremiumCampusLayout, premiumCampusFootprints, sampleAresGenesisRenderedSurfaceMeters } = bundled.exports;
const bytes = readFileSync('public/mars/ares-genesis/ares-genesis-height-16.bin');
const terrain = {
  width: 256, height: 256,
  elevations: Float32Array.from({ length: 65536 }, (_, i) => -3836 + bytes.readUInt16LE(i * 2) / 65535 * 381),
};
const ground = (x, z) => sampleAresGenesisRenderedSurfaceMeters(terrain, x, z);
const buildings = selectCampusBuildings(CAMPUS_ASSETS, ground);
const greenhouse = buildings.find(b => b.id === 'greenhouse');
const genesis = buildings.find(b => b.id === 'habitat');

const water = [-41.8, 3.2, -65.8, -20.8];
const protectedAreas = [
  ['Water', water],
  ['Hub envelope', [-60.275, -27.725, -78.2, -59]],
  ['Hub entry', [-48.45, -39.55, -59, -49]],
  ['Genesis envelope', [-14, 0, -89, -75]],
  ['Genesis entry', [-10.75, -3.25, -75, -67.45]],
  ['front connector', [-28, -13.8, -77.8, -75]],
  ['rear connector', [-41.4, -5.6, -94.9, -92.1]],
  ['east relay', [9.5, 14.5, -84.5, -79.5]],
];
const inside = (x, z, [left, right, rear, front]) =>
  x > left && x < right && z > rear && z < front;
const inLandingArea = (x, z) =>
  Math.hypot(x - GREEN_LANDING_ZONE.x, z - GREEN_LANDING_ZONE.z) <= GREEN_LANDING_ZONE.radius;

function forEachTriangle(geometry, verify) {
  const positions = geometry.getAttribute('position');
  const index = geometry.getIndex();
  const a = new Vector3(), b = new Vector3(), c = new Vector3();
  for (let i = 0; i < index.count; i += 3) {
    a.fromBufferAttribute(positions, index.getX(i));
    b.fromBufferAttribute(positions, index.getX(i + 1));
    c.fromBufferAttribute(positions, index.getX(i + 2));
    verify(a, b, c);
  }
}

test('V23.5 covers the real Hub approach with three camera-facing garden islands', () => {
  assert.deepEqual([greenhouse.worldX, greenhouse.worldZ, genesis.worldX, genesis.worldZ], [-70, -68, -7, -82]);
  const { beds } = premiumCampusFootprints(greenhouse, genesis);
  const central = beds.filter(bed => bed.z > -52 && bed.x < -45);
  assert.equal(central.length, 3);

  // Sample a player-facing approach with the production outdoor follow offset.
  const camera = new PerspectiveCamera(50, 16 / 9, .1, 1000);
  camera.position.set(-52, ground(-52, -21.5) + 3, -21.5);
  camera.lookAt(-52, ground(-52, -26.4) + 1.15, -26.4);
  camera.updateMatrixWorld();
  for (const { x, z, crystals } of central) {
    const screen = new Vector3(x, ground(x, z) + .8, z).project(camera);
    assert.ok(Math.abs(screen.x) < .9 && Math.abs(screen.y) < .95 && screen.z < 1, [x, z, ...screen].join(', '));
    assert.ok(crystals);
  }

  const { paths } = buildPremiumCampusLayout(ground, greenhouse, genesis);
  const ab = new Vector3(), ac = new Vector3(), center = new Vector3();
  let plazaArea = 0;
  forEachTriangle(paths.paving, (a, b, c) => {
    center.copy(a).add(b).add(c).multiplyScalar(1 / 3);
    const { x, y, z } = center;
    const area = ab.subVectors(b, a).cross(ac.subVectors(c, a)).y / 2;
    assert.ok(area > 0, `back-facing or folded paving at ${x}, ${z}`);
    assert.ok(y > ground(x, z) + .02, `buried paving at ${x}, ${z}`);
    assert.ok(!inside(x, z, water) && !inLandingArea(x, z), `paving at ${x}, ${z}`);
    if (inside(x, z, [-71, -46, -54, -28.5])) plazaArea += area;
    if (z < -76) {
      for (const [name, area] of protectedAreas) {
        assert.ok([a, b, c].every(p => !inside(p.x, p.z, area)), `rear paving overlaps ${name} at ${x}, ${z}`);
      }
    }
  });
  assert.ok(plazaArea > 530, `central paving area: ${plazaArea.toFixed(1)} m²`);
});

test('V23.5 garden geometry and rear circulation clear protected access and parked craft', () => {
  const { routes, beds, seats } = premiumCampusFootprints(greenhouse, genesis);
  assert.ok(beds.some(bed => bed.crystals && bed.z < -97));
  assert.equal(seats.length, 2);
  const layout = buildPremiumCampusLayout(ground, greenhouse, genesis);
  forEachTriangle(layout.islands.wall, (a, b, c) => {
    for (const { x, z } of [a, b, c]) {
      for (const [name, area] of protectedAreas) {
        assert.ok(!inside(x, z, area), `garden overlaps ${name} at ${x}, ${z}`);
      }
      assert.ok(!inLandingArea(x, z));
    }
  });

  const rear = routes.at(-1);
  const curve = new CatmullRomCurve3(rear.points.map(([x, z]) => new Vector3(x, 0, z)));
  for (const point of curve.getSpacedPoints(480)) {
    for (const [name, area] of protectedAreas) {
      assert.ok(!inside(point.x, point.z, [area[0] - 1, area[1] + 1, area[2] - 1, area[3] + 1]),
        `rear walking lane near ${name} at ${point.x}, ${point.z}`);
    }
    for (const bed of beds) {
      const distance = Math.hypot((point.x - bed.x) / (bed.rx + 1), (point.z - bed.z) / (bed.rz + 1));
      assert.ok(distance > 1, `rear walking lane near bed ${bed.x}, ${bed.z} at ${point.x}, ${point.z}`);
    }
    for (const [x, z] of seats) {
      assert.ok(Math.hypot(point.x - x, point.z - z) > 1.4);
    }
  }

  for (const [x, z] of [[-54, -40], [4.9, -81.8], seats[0]]) {
    const parked = buildPremiumCampusLayout(ground, greenhouse, genesis, [x, ground(x, z), z]);
    for (const geometry of [parked.paths.paving, parked.islands.wall]) {
      forEachTriangle(geometry, (a, b, c) => {
        for (const point of [a, b, c]) {
          assert.ok(Math.hypot(point.x - x, point.z - z) > SPACECRAFT_RADIUS + 3);
        }
      });
    }
    for (const [sx, sz] of parked.seats) assert.ok(Math.hypot(sx - x, sz - z) > SPACECRAFT_RADIUS + 4.25);
  }
});
