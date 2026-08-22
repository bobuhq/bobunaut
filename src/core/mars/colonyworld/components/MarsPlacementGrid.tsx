import * as THREE from "three";

import {
  MARS_GRID_UNIT,
} from "../engine";

export default function MarsPlacementGrid() {
  return (
    <gridHelper
      args={[
        25 * MARS_GRID_UNIT,
        25,
        new THREE.Color("#aa74df"),
        new THREE.Color("#754e67"),
      ]}
      position={[0, 0.025, 0]}
      material-transparent
      material-opacity={0.16}
    />
  );
}
