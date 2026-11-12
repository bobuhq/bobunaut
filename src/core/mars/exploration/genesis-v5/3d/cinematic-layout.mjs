/** Static model placements in existing station-local metres. No colliders or lights. */
export const CINEMATIC_KIT_URL = '/mars/ares-genesis/master/genesis-cinematic-kit.glb';
const item = (asset, x, y, z, yaw = 0) => ({asset, position:[x,y,z], yaw});
export const cinematicLayout = {
 exterior: [item('master-exterior',0,0,0)],
 control: [
  ...[-1,1].flatMap(side=>[-6.2,-3.1,0,3.1,6.2].map(z=>item('control-cladding',side*7.5,1.5,z,-side*Math.PI/2))),
  ...[[-5.45,4.5],[5.45,4.5],[5.45,-4.5]].map(([x,z])=>item('operator-console',x,1.2,z)),
  ...[-4.3,4.3].flatMap(x=>[-5,0,5].map(z=>item('ceiling-module',x,5.63,z))),
 ],
 corridor: [
  item('corridor-guides',0,1.2,-11),
  ...[-11,-14.5,-18,-21.5,-25].map(z=>item('pressure-rib',0,1.2,z)),
  ...[-1,1].flatMap(side=>[-12.75,-16.25,-19.75,-23.25].map(z=>item('wall-cassette',side*1.94,1.34,z,-side*Math.PI/2))),
  ...[-11.2,-14.05,-16.9,-19.75,-22.6,-25].map(z=>item('floor-cassette',0,1.215,z)),
 ],
 habitat: [
  item('research-bench',0,1.2,-39.5),
  ...[-1,1].flatMap(side=>[-40.5,-37,-33.5,-30].map(z=>item('wall-cassette',side*6.79,1.65,z,-side*Math.PI/2))),
  ...[-4.9,4.9].flatMap(x=>[-39.3,-35.8,-32.3].map(z=>item('sleep-berth',x,1.2,z))),
  item('life-support',-4.9,1.2,-29.3),
  item('hydro-support',4.7,1.2,-29.2),
  ...[0,.72,1.44].map(y=>item('hydro-tray',4.7,1.2+y,-29.2)),
  ...[-3.5,3.5].flatMap(x=>[-32,-38].map(z=>item('ceiling-module',x,5.69,z))),
 ],
};
