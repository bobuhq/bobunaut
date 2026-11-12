import assert from 'node:assert/strict';

import {
  ARES_GENESIS_PRODUCTION_SITE,
  prepareProductionCampus,
} from '../../src/core/mars/exploration/genesis-v5/production-site.mjs';

import {
  v11WorldFootprint,
  checkV11Footprint,
} from '../../src/core/mars/exploration/genesis-v5/v11-footprint.mjs';

const placement = {
  x: -516,
  z: -213,
  rotationY: 0,
};

let passed = 0;

function check(name, fn) {
  fn();
  passed++;
  console.log('PASS:', name);
}

// There must be no hardcoded approved production site.
check('No hardcoded production authority', () => {
  assert.equal(ARES_GENESIS_PRODUCTION_SITE, null);
});

// Missing server permissions must block campus preparation.
check('Missing server approval blocks campus', () => {
  assert.throws(
    () => prepareProductionCampus({
      placement,
      sample: () => 0,
      occupied: [],
      occupancyComplete: false,
      routesReserved: false,
      placementReserved: false,
      legalRegions: [],
      protectedRoutes: [],
      reservedCells: [],
    }),
    /occupancy|reservation|unavailable/i
  );
});

// Missing protected-route inventory must fail closed.
check('Missing protected routes block placement', () => {
  assert.throws(
    () => checkV11Footprint(placement, {
      obstacles: [],
      protectedRoutes: null,
      reservedCells: [],
      legalRegions: [],
    }),
    /Incomplete geometry/
  );
});

const campus = v11WorldFootprint(placement);

check('Campus footprint is stable', () => {
  assert.ok(Math.abs(campus.x + 530.5) < 0.001);
  assert.ok(Math.abs(campus.z + 210.5) < 0.001);
  assert.ok(Math.abs(campus.halfWidth - 54.7) < 0.001);
  assert.ok(Math.abs(campus.halfDepth - 67.7) < 0.001);
});

// A real collision in the campus envelope must be rejected.
check('Occupied campus footprint blocks placement', () => {
  assert.throws(
    () => checkV11Footprint(placement, {
      obstacles: [{
        kind: 'box',
        x: campus.x,
        z: campus.z,
        halfWidth: 2,
        halfDepth: 2,
      }],
      protectedRoutes: [],
      reservedCells: [],
      legalRegions: [{
        kind: 'box',
        x: campus.x,
        z: campus.z,
        halfWidth: 100,
        halfDepth: 100,
      }],
    }),
    /V11 footprint blocked/
  );
});

// No legal region means placement must be blocked.
check('Missing legal entitlement blocks placement', () => {
  assert.throws(
    () => checkV11Footprint(placement, {
      obstacles: [],
      protectedRoutes: [],
      reservedCells: [],
      legalRegions: [],
    }),
    /V11 footprint blocked/
  );
});

console.log(`GENESIS_RELEASE_SAFETY_PASS: ${passed}/6`);
console.log('SERVER_CERTIFIED: false');
console.log('PRODUCTION_AUTHORIZED: false');
