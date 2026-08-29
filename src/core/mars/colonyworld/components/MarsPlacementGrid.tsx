import * as THREE from "three";

import {
  MARS_GRID_UNIT,
} from "../engine";

type Props = {
  mapMin: number;
  mapMax: number;
};

export default function MarsPlacementGrid({
  mapMin,
  mapMax,
}: Props) {
  const cellCount =
    Math.max(
      mapMax - mapMin + 1,
      1,
    );

  const centerGrid =
    (mapMin + mapMax) / 2;

  return (
    <gridHelper
      args={[
        cellCount * MARS_GRID_UNIT,
        cellCount,
        new THREE.Color("#aa74df"),
        new THREE.Color("#754e67"),
      ]}
      position={[
        centerGrid * MARS_GRID_UNIT,
        0.025,
        centerGrid * MARS_GRID_UNIT,
      ]}
      material-transparent
      material-opacity={0.16}
    />
  );
}
