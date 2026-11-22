import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { campusArchitecture } from "../../../../imported-v11/core/mars/exploration/genesis-v5/campus-architecture.mjs";
import type { CampusSite } from "../../../../imported-v11/core/mars/exploration/genesis-v5/3d/campus-layout.mjs";

const PANEL_PIXELS = [1024, 512] as const;
const PANEL_WIDTH = 3.5;
const PANEL_HEIGHT = 1.75;
const WALL_OFFSET = 0.012;

const DISPLAYS = [
  {
    section: "ARES RESEARCH NETWORK",
    title: "CRYSTAL ENERGY SYSTEM",
    caption: "CRYSTAL CORE / FIELD COUPLING",
    nodes: ["CORE", "COUPLER", "BUS"],
    notes: ["Lattice excitation", "Inductive coupling", "Distribution bus"],
    annotation: "field.couple(core, bus)",
    color: "#6de1d3",
    diagram: "crystal",
  },
  {
    section: "ARES RESEARCH NETWORK",
    title: "RESOURCE ANALYSIS",
    caption: "REGOLITH / ASSAY WORKFLOW",
    nodes: ["INTAKE", "ASSAY", "CATALOG"],
    notes: ["Sample preparation", "Spectral classification", "Mineral catalog"],
    annotation: "assay.index(sample)",
    color: "#a5d0ff",
    diagram: "process",
  },
  {
    section: "SECTOR ARES",
    title: "RESEARCH ARCHIVE",
    caption: "REFERENCE DATA / ARCHIVE INDEX",
    nodes: ["GEOLOGY", "ENERGY", "HABITAT"],
    notes: ["Field notebooks", "Crystal schematics", "Habitat references"],
    annotation: "archive.lookup(topic)",
    color: "#c4b4fa",
    diagram: "archive",
  },
  {
    section: "SECTOR ARES",
    title: "COLONY INFRASTRUCTURE",
    caption: "COLONY SERVICES / SYSTEM TOPOLOGY",
    nodes: ["POWER", "WATER", "RELAY"],
    notes: ["Power distribution", "Water treatment", "Relay communications"],
    annotation: "topology.links(sector)",
    color: "#eabf87",
    diagram: "network",
  },
] as const;

function drawDisplay(ctx: CanvasRenderingContext2D, display: (typeof DISPLAYS)[number]) {
  const { color, nodes } = display;
  function label(value: string, x: number, y: number, font: string, fill = "#d9e8f2") {
    ctx.font = font;
    ctx.fillStyle = fill;
    ctx.fillText(value, x, y);
  }
  function line(points: number[], stroke: string = color, width = 2) {
    ctx.beginPath();
    ctx.moveTo(points[0], points[1]);
    for (let i = 2; i < points.length; i += 2) ctx.lineTo(points[i], points[i + 1]);
    ctx.strokeStyle = stroke;
    ctx.lineWidth = width;
    ctx.stroke();
  }

  const [width, height] = PANEL_PIXELS;
  ctx.fillStyle = "#1b2935";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "#091724";
  ctx.fillRect(12, 12, width - 24, height - 24);
  ctx.strokeStyle = "#38566a";
  ctx.lineWidth = 2;
  ctx.strokeRect(17, 17, width - 34, height - 34);
  ctx.fillStyle = color;
  ctx.fillRect(36, 30, 3, 42);

  label("BOBU GENESIS", 52, 60, "bold 25px monospace", color);
  label(display.section, 655, 60, "bold 21px monospace", color);
  label(display.title, 40, 120, "bold 44px sans-serif");
  line([40, 143, 984, 143], "#38566a");
  label(display.caption, 40, 178, "20px monospace", "#a8bfd0");

  const xStart = 48;
  const xEnd = 613;
  const yStart = 199;
  const yEnd = 418;
  for (let x = xStart; x <= xEnd; x += 23) line([x, yStart, x, yEnd], "#172c3c", 1);
  for (let y = yStart; y <= yEnd; y += 22) line([xStart, y, xEnd, y], "#172c3c", 1);
  line([633, 199, 633, 418], "#38566a");

  if (display.diagram === "crystal") {
    line([78, 301, 155, 301, 198, 259, 250, 259, 324, 214, 400, 259, 452, 259, 496, 301, 584, 301]);
    line([324, 214, 400, 259, 400, 344, 324, 389, 250, 344, 250, 259, 324, 214, 324, 389]);
    line([250, 259, 324, 307, 400, 259, 324, 389, 250, 259], "#5895a0");
    line([78, 329, 164, 329, 214, 373, 246, 373], "#5895a0");
    line([584, 329, 493, 329, 442, 373, 407, 373], "#5895a0");
  } else {
    const centers = [142, 330, 518];
    if (display.diagram === "process") {
      line([142, 295, 518, 295]);
      for (const x of [237, 425]) line([x - 8, 288, x, 295, x - 8, 302], color, 3);
      line([142, 333, 142, 365, 518, 365, 518, 333], "#527491");
    } else if (display.diagram === "archive") {
      line([142, 257, 142, 232, 518, 232, 518, 257]);
      line([330, 232, 330, 257]);
      centers.forEach(x => line([x - 54, 350, x + 54, 350, x + 54, 366, x - 54, 366, x - 54, 350], "#527491"));
    } else {
      line([142, 333, 142, 370, 518, 370, 518, 333]);
      line([330, 333, 330, 370]);
      line([142, 257, 142, 231, 518, 231, 518, 257], "#527491");
    }
    centers.forEach((x, index) => {
      ctx.fillStyle = "#112738";
      ctx.fillRect(x - 70, 257, 140, 76);
      ctx.strokeStyle = color;
      ctx.strokeRect(x - 70, 257, 140, 76);
      ctx.textAlign = "center";
      label(nodes[index], x, 302, "bold 18px monospace", color);
      ctx.textAlign = "left";
    });
  }

  label("REFERENCE INDEX", 658, 226, "bold 20px monospace", color);
  display.notes.forEach((note, index) => {
    const y = 273 + index * 51;
    ctx.fillStyle = color;
    ctx.fillRect(660, y - 9, 6, 6);
    label(note, 682, y, "22px sans-serif");
    line([658, y + 16, 976, y + 16], "#243e50", 1);
  });

  line([40, 435, 984, 435], "#38566a");
  label(display.annotation, 40, 474, "21px monospace", color);
  label("REFERENCE SCHEMATIC", 718, 474, "20px monospace", "#a8bfd0");
}

function createDisplayKit() {
  const canvas = document.createElement("canvas");
  const [width, height] = PANEL_PIXELS;
  canvas.width = 2 * width;
  canvas.height = 2 * height;
  const ctx = canvas.getContext("2d");
  if (!ctx) return null;

  const walls = campusArchitecture("habitat").filter(part => part.name === "laboratory-wing");
  const positions: number[] = [];
  const uvs: number[] = [];

  walls.forEach((wall, wallIndex) => {
    const side = Math.sign(wall.position[0]);
    const x = wall.position[0] - side * (wall.size[0] / 2 + WALL_OFFSET);
    for (const [row, z] of [-2.4, 2.4].entries()) {
      ctx.save();
      ctx.translate(wallIndex * width, row * height);
      drawDisplay(ctx, DISPLAYS[wallIndex * 2 + row]);
      ctx.restore();

      // Front winding points into the room from both actual wing faces.
      for (const [u, v] of [[0, 0], [1, 0], [1, 1], [0, 0], [1, 1], [0, 1]]) {
        positions.push(x, 2.15 + (v - .5) * PANEL_HEIGHT, z + side * (u - .5) * PANEL_WIDTH);
        // Keep mip-filtered edges within the atlas tile's bezel.
        uvs.push(
          (wallIndex * width + 2 + u * (width - 4)) / canvas.width,
          ((1 - row) * height + 2 + v * (height - 4)) / canvas.height,
        );
      }
    }
  });

  const geometry = new THREE.BufferGeometry();
  geometry.setAttribute("position", new THREE.Float32BufferAttribute(positions, 3));
  geometry.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.anisotropy = 4;
  return { geometry, texture };
}

export function GenesisResearchDisplays({ site }: { site: CampusSite }) {
  const kit = useMemo(createDisplayKit, []);
  useEffect(() => () => {
    kit?.geometry.dispose();
    kit?.texture.dispose();
  }, [kit]);

  if (!kit) return null;
  return (
    <mesh
      name="genesis-research-wall-displays"
      position={[site.x, site.deck, site.z]}
      geometry={kit.geometry}
      userData={{ cameraIgnore: true }}
    >
      <meshBasicMaterial map={kit.texture} />
    </mesh>
  );
}
