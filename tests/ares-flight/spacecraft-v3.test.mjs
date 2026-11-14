import {test} from 'node:test';
import assert from 'node:assert/strict';
import {SPACECRAFT_RADIUS,nextCameraMode,cockpitLook} from '../../src/core/mars/exploration/genesis-v5/spacecraft-v3.mjs';
import {VEHICLE_RADIUS} from '../../src/core/mars/exploration/genesis-v5/flight-v2.mjs';
test('camera switch round trip and bounded cockpit look',()=>{assert.equal(nextCameraMode('CHASE'),'COCKPIT');assert.equal(nextCameraMode(nextCameraMode('CHASE')),'CHASE');assert.deepEqual(cockpitLook(20,-20),{x:1.15,y:-.55});});
test('new hull and deployed pad corners fit authoritative collision disc',()=>{assert.equal(VEHICLE_RADIUS,SPACECRAFT_RADIUS);assert.ok(Math.hypot(7,7)<=VEHICLE_RADIUS);assert.ok(Math.hypot(5.4,5.9)<=VEHICLE_RADIUS);});
