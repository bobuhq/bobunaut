// Extracted from final V11. Only architecture dependencies retained.
export const ENTRY_CENTERS = [-30, 0] as const;
export const ENTRY_PLANTERS = ENTRY_CENTERS.flatMap(center => [-1, 1].flatMap(side => [13, 19].map(z => ({
  x: center + side * 5.3, z, width: 3.2, depth: 2.6,
}))));
export const ENTRY_BOLLARDS = ENTRY_CENTERS.flatMap(center => [-1, 1].flatMap(side => [11.5, 16, 21, 26].map(z => ({x: center + side * 2.65, z}))));
