import { useEffect, useLayoutEffect, useMemo, useState } from "react";
import { useLoader, useThree } from "@react-three/fiber";
import * as THREE from "three";
import {
  ARES_GENESIS_SURFACE_TEXTURE_URL,
  loadAresGenesisTerrainData,
  type AresGenesisTerrainData,
} from "../engine/AresGenesisTerrainData";
import { markAresStage, startAresStage } from "../engine/aresPerformance";

type TerrainTile = {
  position: Float32Array;
  normal: Float32Array;
  uv: Float32Array;
  bounds: [number, number, number, number];
};

type TerrainPayload = {
  tiles: TerrainTile[];
  index: Uint16Array;
  bump: Uint8Array<ArrayBuffer>;
  bumpSize: number;
  geometryMs: number;
  bumpMs: number;
};

type TerrainResources = {
  terrainData: AresGenesisTerrainData;
  geometries: THREE.BufferGeometry[];
  bump: THREE.DataTexture;
};

export function useMarsExplorationTerrain() {
  const [resources, setResources] = useState<TerrainResources | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let worker: Worker | undefined;
    let owned: TerrainResources | undefined;

    function fail() {
      worker?.terminate();
      if (!active) return;
      markAresStage("terrain-failed");
      setFailed(true);
    }

    // Wait for the initial commit to paint and cancel any discarded effect.
    const frame = requestAnimationFrame(() => {
      markAresStage("terrain-height-request");
      void loadAresGenesisTerrainData().then((terrainData) => {
        if (!active) return;
        markAresStage("terrain-height-ready");
        worker = new Worker(new URL("../engine/aresTerrain.worker.ts", import.meta.url), {
          type: "module",
        });
        worker.onerror = fail;
        worker.onmessageerror = fail;
        worker.onmessage = ({ data }: MessageEvent<TerrainPayload>) => {
          if (!active) return;
          worker?.terminate();
          markAresStage("terrain-worker-ready", {
            geometryMs: data.geometryMs,
            bumpMs: data.bumpMs,
          });

          const finishResources = startAresStage("terrain-resource-create");
          const index = new THREE.BufferAttribute(data.index, 1);
          if (import.meta.env.DEV) {
            index.onUpload(() => markAresStage("terrain-index-upload", { bytes: index.array.byteLength }));
          }
          const geometries = data.tiles.map((tile) => {
            const geometry = new THREE.BufferGeometry();
            geometry.setAttribute("position", new THREE.BufferAttribute(tile.position, 3));
            geometry.setAttribute("normal", new THREE.BufferAttribute(tile.normal, 3));
            geometry.setAttribute("uv", new THREE.BufferAttribute(tile.uv, 2));
            geometry.setIndex(index);
            if (import.meta.env.DEV) {
              let attributesUploaded = 0;
              const bytes = tile.position.byteLength + tile.normal.byteLength + tile.uv.byteLength;
              const uploaded = () => {
                if (++attributesUploaded !== 3) return;
                markAresStage("terrain-tile-upload", { bytes });
                attributesUploaded = 0;
              };
              for (const attribute of Object.values(geometry.attributes)) {
                (attribute as THREE.BufferAttribute).onUpload(uploaded);
              }
            }
            const [x, y, z, radius] = tile.bounds;
            geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(x, y, z), radius);
            return geometry;
          });

          const bump = new THREE.DataTexture(data.bump, data.bumpSize, data.bumpSize, THREE.RedFormat);
          bump.wrapS = bump.wrapT = THREE.RepeatWrapping;
          bump.repeat.set(32, 32);
          bump.magFilter = THREE.LinearFilter;
          bump.minFilter = THREE.LinearMipmapLinearFilter;
          bump.generateMipmaps = true;
          if (import.meta.env.DEV) {
            bump.onUpdate = () => markAresStage("terrain-bump-upload", { bytes: data.bump.byteLength });
          }
          bump.needsUpdate = true;

          owned = { terrainData, geometries, bump };
          finishResources?.();
          setResources(owned);
        };
        worker.postMessage(terrainData);
      }).catch(fail);
    });

    return () => {
      active = false;
      cancelAnimationFrame(frame);
      worker?.terminate();
      owned?.geometries.forEach((geometry) => geometry.dispose());
      owned?.bump.dispose();
    };
  }, []);

  return { resources, failed };
}

export function MarsExplorationTerrain({ resources }: { resources: TerrainResources | null }) {
  const surface = useLoader(THREE.TextureLoader, ARES_GENESIS_SURFACE_TEXTURE_URL);
  const maxAnisotropy = useThree(({ gl }) => gl.capabilities.getMaxAnisotropy());

  useLayoutEffect(() => {
    const anisotropy = Math.min(4, maxAnisotropy);
    if (surface.colorSpace === THREE.SRGBColorSpace && surface.anisotropy === anisotropy) return;
    surface.colorSpace = THREE.SRGBColorSpace;
    surface.anisotropy = anisotropy;
    surface.needsUpdate = true;
  }, [surface, maxAnisotropy]);

  const material = useMemo(() => {
    if (!resources) return null;
    return new THREE.MeshStandardMaterial({
      map: surface,
      bumpMap: resources.bump,
      bumpScale: 1.7,
      roughness: 0.94,
      metalness: 0,
    });
  }, [resources, surface]);
  useEffect(() => () => material?.dispose(), [material]);

  if (!resources || !material) return null;

  return (
    <group userData={{ offlineTerrain: true }}>
      {resources.geometries.map((geometry) => (
        <mesh key={geometry.id} geometry={geometry} material={material} receiveShadow />
      ))}
    </group>
  );
}

useLoader.preload(THREE.TextureLoader, ARES_GENESIS_SURFACE_TEXTURE_URL);
