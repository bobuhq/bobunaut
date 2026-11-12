/** Audited comms-dish-7b129a joints; coordinates are unscaled GLB metres.
 * Feed front-face center measured from the feed's coplanar forward vertices.
 * Boresight is the baked dish normal, 35 degrees above local +Z. */
export const RELAY_EMITTER = Object.freeze([0, 1.1063248291611671, 1.126699447631836]);
export const RELAY_BORESIGHT = Object.freeze([0, Math.sin(35*Math.PI/180), Math.cos(35*Math.PI/180)]);
export function animateRelay(azimuth, elevation, seconds) {
 azimuth.rotation.y = Math.sin(seconds * 2*Math.PI/14) * 55*Math.PI/180;
 elevation.rotation.x = Math.sin(seconds * 2*Math.PI/19) * 5*Math.PI/180;
}
