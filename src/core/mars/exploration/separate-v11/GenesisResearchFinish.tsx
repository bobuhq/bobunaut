import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import { campusArchitecture } from "../../../../imported-v11/core/mars/exploration/genesis-v5/campus-architecture.mjs";
import type { CampusSite } from "../../../../imported-v11/core/mars/exploration/genesis-v5/3d/campus-layout.mjs";

type Vec3 = [number, number, number];
type Finish = "alloy" | "graphite" | "cyan" | "violet" | "white" | "green" | "amber";
type Part = { finish: Finish; position: Vec3; size: Vec3; rotation?: number };

const palette: Record<Finish, string> = {
  alloy: "#71889a", graphite: "#263949", cyan: "#65d8ee", violet: "#b69ae8",
  white: "#dee8f0", green: "#73dcab", amber: "#eebc77",
};

function FinishBatch({ parts }: { parts: Part[] }) {
  const geometry = useMemo(() => {
    const boxes = parts.map(({ finish, position, size, rotation = 0 }) => {
      const box = new THREE.BoxGeometry(...size).rotateX(rotation).translate(...position);
      const color = new THREE.Color(palette[finish]);
      const colors = new Float32Array(box.attributes.position.count * 3);
      for (let i = 0; i < colors.length; i += 3) color.toArray(colors, i);
      box.setAttribute("color", new THREE.BufferAttribute(colors, 3));
      // The luminous surfaces use the same batch and a separate material group.
      return box;
    });
    const batch = mergeGeometries(boxes);
    boxes.forEach(box => box.dispose());
    const metalCount = parts.filter(part => part.finish === "alloy" || part.finish === "graphite").length;
    batch.addGroup(0, metalCount * 36, 0);
    batch.addGroup(metalCount * 36, (parts.length - metalCount) * 36, 1);
    return batch;
  }, [parts]);
  useEffect(() => () => geometry.dispose(), [geometry]);

  return <mesh geometry={geometry} userData={{ cameraIgnore: true }}>
    <meshStandardMaterial attach="material-0" vertexColors metalness={.5} roughness={.42}
      emissive="#2a4055" emissiveIntensity={.35} />
    <meshBasicMaterial attach="material-1" vertexColors toneMapped={false} />
  </mesh>;
}

function orderParts(parts: Part[]) {
  const isMetal = ({ finish }: Part) => finish === "alloy" || finish === "graphite";
  return [...parts.filter(isMetal), ...parts.filter(part => !isMetal(part))];
}

const structure = campusArchitecture("habitat");
const ceilingBand = structure.find(part => part.name === "upper-science-band")!;
const ceilingUnderside = ceilingBand.position[1] - ceilingBand.size[1] / 2;

const laboratory = orderParts(structure.filter(part => part.name === "laboratory-wing").flatMap(wall => {
  const side = Math.sign(wall.position[0]);
  const face = wall.position[0] - side * wall.size[0] / 2;
  const parts: Part[] = [];
  const onWall = (finish: Finish, y: number, z: number, depth: number, height: number, width: number) => {
    parts.push({ finish, position: [face - side * depth / 2, y, z], size: [depth, height, width] });
  };

  // Keep the finish within the existing 0.10 m wing collider inset.
  for (const z of [-2.4, 2.4]) {
    for (const y of [1.23, 3.07]) onWall("alloy", y, z, .076, .09, 3.72);
    for (const edge of [-1, 1]) onWall("graphite", 2.15, z + edge * 1.805, .074, 1.76, .105);
    onWall("graphite", .97, z, .088, .28, 3.36);
    onWall("alloy", .84, z, .094, .045, 3.38);
    onWall("cyan", 3.07, z, .083, .016, 1.16);
    for (const offset of [-1.1, -.93, -.76]) onWall("white", .98, z + offset, .092, .065, .11);
    parts.push(
      { finish: "graphite", position: [side * 2.75, ceilingUnderside - .08, z], size: [.56, .18, 2.76] },
      { finish: "white", position: [side * 2.75, ceilingUnderside - .174, z], size: [.33, .018, 2.53] },
    );
  }

  // Twin surface-mounted conduits and a static crystal lattice between consoles.
  onWall("alloy", 3.57, 0, .05, .045, 9);
  onWall("graphite", 3.67, 0, .062, .05, 9);
  for (const z of [-4.4, 0, 4.4]) onWall("alloy", 3.62, z, .081, .23, .18);
  onWall("graphite", 2.15, 0, .042, 1.6, .92);
  for (const edge of [-1, 1]) {
    for (const tier of [-1, 1]) {
      parts.push({
        finish: "violet", position: [face - side * .058, 2.15 + tier * .22, edge * .15],
        size: [.025, .532, .024], rotation: -edge * tier * .6,
      });
    }
  }
  onWall("cyan", 2.15, 0, .081, .023, .59);
  return parts;
}));

export function GenesisResearchFinish({ site }: { site: CampusSite }) {
  return <group name="genesis-research-finish" position={[site.x, site.deck, site.z]}>
    <FinishBatch parts={laboratory} />
  </group>;
}

// Both labels face +Z: the exterior approach at the front and the lab at the rear.
const portalFinish = (() => {
  const parts: Part[] = [];
  for (const side of [-1, 1]) {
    parts.push(
      { finish: "graphite", position: [side * 1.535, 1.62, .285], size: [.18, 3.12, .065] },
      { finish: "alloy", position: [side * 1.561, 1.62, .325], size: [.117, 3.08, .025] },
      { finish: "cyan", position: [side * 1.464, 1.62, .326], size: [.025, 2.93, .014] },
      { finish: side < 0 ? "green" : "amber", position: [side * 1.561, 2.61, .343], size: [.056, .12, .014] },
    );
  }
  parts.push(
    { finish: "graphite", position: [0, 3.28, .29], size: [3.25, .24, .067] },
    { finish: "alloy", position: [0, 3.392, .327], size: [3.2, .024, .024] },
    { finish: "cyan", position: [0, 3.17, .327], size: [2.89, .022, .02] },
  );
  return orderParts(parts);
})();

export function GenesisPortalFinish({ entrance }: { entrance: "front" | "rear" }) {
  const front = entrance === "front";
  const map = useMemo(() => {
    const canvas = document.createElement("canvas");
    canvas.width = 512;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    ctx.fillStyle = "#263949";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.font = "bold 39px monospace";
    ctx.fillStyle = "#dee8f0";
    ctx.fillText(front ? "GENESIS ACCESS" : "RESEARCH LAB", 256, 32);
    const texture = new THREE.CanvasTexture(canvas);
    texture.colorSpace = THREE.SRGBColorSpace;
    return texture;
  }, [front]);
  useEffect(() => () => map?.dispose(), [map]);

  return <group name={`genesis-${entrance}-portal-finish`}>
    <FinishBatch parts={portalFinish} />
    {map && <mesh position={[0, 3.28, .336]}
      userData={{ cameraIgnore: true }}>
      <planeGeometry args={[1.6, .2]} />
      <meshBasicMaterial map={map} toneMapped={false} />
    </mesh>}
  </group>;
}
