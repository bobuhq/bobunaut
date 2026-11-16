// Extracted from final V11. Only architecture dependencies retained.
import { INTEGRATED_ASSETS } from '../core/mars/exploration/genesis-v5/integrated-campus.mjs';
export const CONNECTED_CAMPUS_ASSETS = INTEGRATED_ASSETS.map(asset =>
  asset.id === 'greenhouse' ? { ...asset, x: -72, z: -14 } : { ...asset },
);
