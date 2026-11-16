import { useMemo } from "react";
import { useGLTF } from "@react-three/drei";
import * as THREE from "three";

/**
 * Local prototype: actual NASA mesh assets integrated with BOBU's
 * existing Command Center scene. Decorative structures only.
 * No collision, walkable surface, RPC, GP, or progression changes.
 *
 * NASA 3D Resources — https://github.com/nasa/NASA-3D-Resources
 * NASA does not endorse or sponsor BOBU.
 */
type ImportedStructureProps = {
  path: string;
  x: number;
  z: number;
  width: number;
  depth: number;
  height: number;
};

function ImportedStructure({
  path,
  x,
  z,
  width,
  depth,
  height,
}: ImportedStructureProps) {
  const { scene } = useGLTF(path);
  const fit = useMemo(() => {
    const model = scene.clone(true);
    const bounds = new THREE.Box3().setFromObject(model);
    const size = bounds.getSize(new THREE.Vector3());
    const center = bounds.getCenter(new THREE.Vector3());
    const fitScale = Math.min(
      width / Math.max(size.x, 0.01),
      depth / Math.max(size.z, 0.01),
      height / Math.max(size.y, 0.01),
    );

    model.traverse((object) => {
      if (object instanceof THREE.Mesh) {
        object.castShadow = true;
        object.receiveShadow = true;
      }
    });

    // Center the imported mesh, place its lowest vertex at ground level.
    return {
      object: model,
      scale: fitScale,
      offset: [
        -center.x * fitScale,
        -bounds.min.y * fitScale,
        -center.z * fitScale,
      ] as [number, number, number],
    };
  }, [scene, width, depth, height]);

  return (
    <group position={[x, 0.14, z]}>
      <group position={fit.offset}>
        <primitive object={fit.object} scale={fit.scale} />
      </group>
    </group>
  );
}

export function AresNASAHabitatPreview() {
  return (
    <group>
      {/* Exterior wings keep the central playable entrance clear. */}
      <ImportedStructure
        path="/models/mars/commandhub/nasa-preview/habitat-part-1.glb"
        x={-18}
        z={-5}
        width={8}
        depth={9}
        height={7}
      />
      <ImportedStructure
        path="/models/mars/commandhub/nasa-preview/habitat-part-2.glb"
        x={18}
        z={-5}
        width={8}
        depth={9}
        height={7}
      />
      {/* Rear facility: no obstruction of Command Hub front door. */}
      <ImportedStructure
        path="/models/mars/commandhub/nasa-preview/base-station.glb"
        x={0}
        z={-17}
        width={9}
        depth={7}
        height={6}
      />
    </group>
  );
}
