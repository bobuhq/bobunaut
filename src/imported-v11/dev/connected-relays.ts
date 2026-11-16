// Extracted from final V11. Only architecture dependencies retained.
import { ARES_COMMAND_HUB_WIDTH } from '../core/mars/exploration/commandhub/AresCommandHubCollision';
import { STRUCTURAL_COLLIDERS } from '../core/mars/exploration/genesis-v5/3d/structural-collision.mjs';
import { INTEGRATED_RELAYS } from '../core/mars/exploration/genesis-v5/integrated-campus.mjs';
const hubWest = -30 - ARES_COMMAND_HUB_WIDTH / 2 - .55;
const genesisEast = Math.max(...STRUCTURAL_COLLIDERS.map(c => 'xMax' in c ? c.xMax : c.x + c.radius));
const rearRoom = { xMin: -20, xMax: -10, zMin: -50 };
const clearance = 4.5 + 1.5;
const positions = {
  yellow: [hubWest - clearance, 0],
  green: [genesisEast + clearance, -13],
  red: [(rearRoom.xMin + rearRoom.xMax) / 2, rearRoom.zMin - clearance],
} as const;
export const CONNECTED_RELAYS = INTEGRATED_RELAYS.map(spec => ({
  ...spec, x: positions[spec.id as keyof typeof positions][0], z: positions[spec.id as keyof typeof positions][1],
}));
