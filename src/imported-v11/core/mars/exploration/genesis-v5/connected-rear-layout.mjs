// Authored station-local metres. This module grants no world placement authority.
const box = (id, xMin, xMax, zMin, zMax, yMin = 1.19, yMax = 5.89) => ({ id, category: 'campus-rear', xMin, xMax, zMin, zMax, yMin, yMax });
// Shared authored union of sealed passages and a single 10 x 10 shared room.
export const REAR_AREAS = [
  [-32, -28, -47, -8.1], // Hub rear sleeve and north/south leg
  [-30, 2, -47, -43], // East/west leg with real right angle elbows
  [-20, -10, -50, -40], // Central shared square room
  [-2, 2, -47, -42.5], // Genesis rear sleeve
];
const inside = (x, z) => REAR_AREAS.some(([a,b,c,d]) => x >= a && x <= b && z >= c && z <= d);
export const REAR_TILES = [];
export const REAR_WALLS = [];
const xs = [...new Set(REAR_AREAS.flatMap(r => [r[0],r[1]]))].sort((a,b)=>a-b);
const zs = [...new Set(REAR_AREAS.flatMap(r => [r[2],r[3]]))].sort((a,b)=>a-b);
for(let i=0;i<xs.length-1;i++) for(let j=0;j<zs.length-1;j++) {
  const a=xs[i], b=xs[i+1], c=zs[j], d=zs[j+1];
  if(!inside((a+b)/2,(c+d)/2)) continue;
  REAR_TILES.push(box(`rear-floor-${i}-${j}`,a,b,c,d));
  for(const [edge,out] of [
    [box(`rear-west-${i}-${j}`,a-.12,a+.12,c,d),inside(a-.01,(c+d)/2)],
    [box(`rear-east-${i}-${j}`,b-.12,b+.12,c,d),inside(b+.01,(c+d)/2)],
    [box(`rear-south-${i}-${j}`,a,b,c-.12,c+.12),inside((a+b)/2,c-.01)],
    [box(`rear-north-${i}-${j}`,a,b,d-.12,d+.12),inside((a+b)/2,d+.01)],
  ]) {
    // Passage mouths overlap the existing floors, never cap them with walls.
    if(!out && !(edge.zMin > -8.3) && !(a>=-2 && b<=2 && edge.zMin > -42.7)) REAR_WALLS.push(edge);
  }
}
export const REAR_DOORS = [{x:-30,z:-9.02},{x:0,z:-42.82}];
