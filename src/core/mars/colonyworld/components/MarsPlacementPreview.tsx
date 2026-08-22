import {
  MARS_GRID_UNIT,
} from "../engine";

type Props = {
  worldX: number;
  worldZ: number;

  footprintWidth: number;
  footprintDepth: number;

  valid?: boolean;
  error?: boolean;

  mode:
    | "command"
    | "place"
    | "move";
};

export default function MarsPlacementPreview({
  worldX,
  worldZ,
  footprintWidth,
  footprintDepth,
  valid = true,
  error = false,
  mode,
}: Props) {
  const invalid =
    !valid || error;

  let color = "#a950ff";
  let opacity = 0.28;
  let height = 0.055;

  if (mode === "place") {
    color =
      invalid
        ? "#ff334f"
        : "#d28cff";

    opacity =
      invalid
        ? 0.44
        : 0.32;

    height = 0.065;
  }

  if (mode === "move") {
    color =
      invalid
        ? "#ff334f"
        : "#68d9ff";

    opacity =
      invalid
        ? 0.45
        : 0.28;

    height = 0.065;
  }

  return (
    <mesh
      position={[
        worldX,
        height,
        worldZ,
      ]}
      rotation={[
        -Math.PI / 2,
        0,
        0,
      ]}
    >
      <planeGeometry
        args={[
          footprintWidth *
            MARS_GRID_UNIT *
            0.96,

          footprintDepth *
            MARS_GRID_UNIT *
            0.96,
        ]}
      />

      <meshBasicMaterial
        color={color}
        transparent
        opacity={opacity}
        depthWrite={false}
      />
    </mesh>
  );
}
