import {
  useEffect,
  useMemo,
} from "react";
import {
  ClampToEdgeWrapping,
  DataTexture,
  NearestFilter,
  RepeatWrapping,
  RGBAFormat,
  SRGBColorSpace,
  UnsignedByteType,
} from "three";
import type {
  ThreeEvent,
} from "@react-three/fiber";
import type {
  MarsPixelPublicAllocation,
} from "../MarsPixelNetworkService";

type MarsPixelCoordinate = {
  x: number;
  y: number;
};

type MarsPixelOverlayProps = {
  radius: number;
  gridWidth: number;
  gridHeight: number;
  allocations: MarsPixelPublicAllocation[];
  visible: boolean;
  onPixelSelect?: (
    coordinate: MarsPixelCoordinate,
    allocation: MarsPixelPublicAllocation | null,
  ) => void;
};

function allocationColor(
  allocationId: string,
): [number, number, number, number] {
  let hash = 2166136261;

  for (let index = 0; index < allocationId.length; index += 1) {
    hash ^= allocationId.charCodeAt(index);
    hash = Math.imul(hash, 16777619);
  }

  const red = 110 + ((hash >>> 16) & 0x5f);
  const green = 70 + ((hash >>> 8) & 0x6f);
  const blue = 150 + (hash & 0x69);

  return [
    Math.min(255, red),
    Math.min(255, green),
    Math.min(255, blue),
    176,
  ];
}

function containsCoordinate(
  allocation: MarsPixelPublicAllocation,
  coordinate: MarsPixelCoordinate,
) {
  return (
    coordinate.x >= allocation.x_start &&
    coordinate.x <
      allocation.x_start + allocation.width &&
    coordinate.y >= allocation.y_start &&
    coordinate.y <
      allocation.y_start + allocation.height
  );
}

export function MarsPixelOverlay({
  radius,
  gridWidth,
  gridHeight,
  allocations,
  visible,
  onPixelSelect,
}: MarsPixelOverlayProps) {
  const texture = useMemo(() => {
    const data = new Uint8Array(
      gridWidth * gridHeight * 4,
    );

    for (const allocation of allocations) {
      const [
        red,
        green,
        blue,
        alpha,
      ] = allocationColor(
        allocation.allocation_id,
      );

      const xEnd = Math.min(
        gridWidth,
        allocation.x_start + allocation.width,
      );

      const yEnd = Math.min(
        gridHeight,
        allocation.y_start + allocation.height,
      );

      for (
        let y = Math.max(0, allocation.y_start);
        y < yEnd;
        y += 1
      ) {
        for (
          let x = Math.max(0, allocation.x_start);
          x < xEnd;
          x += 1
        ) {
          const textureY =
            gridHeight - 1 - y;

          const offset =
            (textureY * gridWidth + x) * 4;

          data[offset] = red;
          data[offset + 1] = green;
          data[offset + 2] = blue;
          data[offset + 3] = alpha;
        }
      }
    }

    const nextTexture = new DataTexture(
      data,
      gridWidth,
      gridHeight,
      RGBAFormat,
      UnsignedByteType,
    );

    nextTexture.wrapS = RepeatWrapping;
    nextTexture.wrapT = ClampToEdgeWrapping;
    nextTexture.magFilter = NearestFilter;
    nextTexture.minFilter = NearestFilter;
    nextTexture.generateMipmaps = false;
    nextTexture.flipY = false;
    nextTexture.colorSpace = SRGBColorSpace;
    nextTexture.needsUpdate = true;

    return nextTexture;
  }, [
    allocations,
    gridHeight,
    gridWidth,
  ]);

  useEffect(
    () => () => {
      texture.dispose();
    },
    [texture],
  );

  if (!visible) {
    return null;
  }

  return (
    <mesh
      onClick={(
        event: ThreeEvent<MouseEvent>,
      ) => {
        if (!onPixelSelect) {
          return;
        }

        const uv = event.uv;

        if (!uv) {
          return;
        }

        event.stopPropagation();

        const x = Math.min(
          gridWidth - 1,
          Math.max(
            0,
            Math.floor(uv.x * gridWidth),
          ),
        );

        const y = Math.min(
          gridHeight - 1,
          Math.max(
            0,
            Math.floor(
              (1 - uv.y) * gridHeight,
            ),
          ),
        );

        const coordinate = {
          x,
          y,
        };

        const allocation =
          allocations.find((candidate) =>
            containsCoordinate(
              candidate,
              coordinate,
            ),
          ) ?? null;

        onPixelSelect(
          coordinate,
          allocation,
        );
      }}
    >
      <sphereGeometry
        args={[
          radius * 1.0015,
          96,
          96,
        ]}
      />

      <meshBasicMaterial
        map={texture}
        transparent
        opacity={1}
        depthWrite={false}
        toneMapped={false}
      />
    </mesh>
  );
}
