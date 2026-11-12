import { useEffect, useMemo } from "react";
import * as THREE from "three";
import { mergeGeometries } from
  "three/examples/jsm/utils/BufferGeometryUtils.js";

type Finish =
  | "armor"
  | "frame"
  | "graphite"
  | "recess"
  | "green";

const finishes: Finish[] = [
  "armor", "frame", "graphite", "recess", "green"
];

function createExterior() {
  const parts: Record<Finish, THREE.BufferGeometry[]> = {
    armor: [], frame: [], graphite: [],
    recess: [], green: [],
  };

  function addBox(
    finish: Finish,
    x: number, y: number, z: number,
    w: number, h: number, d: number,
    rz = 0
  ) {
    const g = new THREE.BoxGeometry(w, h, d);
    g.applyMatrix4(
      new THREE.Matrix4().compose(
        new THREE.Vector3(x, y, z),
        new THREE.Quaternion().setFromEuler(
          new THREE.Euler(0, 0, rz)
        ),
        new THREE.Vector3(1, 1, 1)
      )
    );
    parts[finish].push(g.toNonIndexed());
    g.dispose();
  }

  function addArmor(
    x: number, y: number, z: number,
    w: number, h: number, depth: number
  ) {
    const shape = new THREE.Shape();
    shape.moveTo(-w / 2 + .28, 0);
    shape.lineTo(w / 2 - .28, 0);
    shape.lineTo(w / 2, .4);
    shape.lineTo(w / 2 - .18, h - .45);
    shape.lineTo(w / 2 - .55, h);
    shape.lineTo(-w / 2 + .55, h);
    shape.lineTo(-w / 2 + .18, h - .45);
    shape.lineTo(-w / 2, .4);
    shape.closePath();

    const g = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: .035,
      bevelSize: .035,
      bevelSegments: 2,
      curveSegments: 1,
    });
    g.translate(x, y, z);
    parts.armor.push(g.index ? g.toNonIndexed() : g);
  }

  // Large segmented front armor, avoiding central door.
  for (const side of [-1, 1]) {
    const x = side * 5.18;

    addArmor(x, 1.43, 9.92, 4.95, 4.32, .19);

    // Exposed structural vertical members.
    addBox("frame", x - 2.12, 3.55, 10.18,
      .22, 4.3, .30);
    addBox("frame", x + 2.12, 3.55, 10.18,
      .22, 4.3, .30);

    // Engineered inset equipment panel.
    addBox("graphite", x, 3.19, 10.19,
      3.2, 1.55, .10);
    addBox("recess", x, 3.2, 10.26,
      2.7, 1.13, .055);

    for (const offset of [-.43, -.14, .15, .44]) {
      addBox("frame", x, 3.2 + offset, 10.31,
        2.42, .023, .045);
    }

    // Lower and upper reinforced armor.
    addBox("frame", x, 1.78, 10.22,
      3.8, .16, .28);
    addBox("frame", x, 5.72, 10.22,
      4.3, .22, .30);

    // Small integrated access indicator.
    addBox("green", x, 2.02, 10.35,
      1.0, .035, .045);
  }

  // Roof-edge exoskeleton: outside the opening/cutaway.
  for (const side of [-1, 1]) {
    addBox("armor", side * 7.7, 6.48, 0,
      .52, .44, 18.6);
    addBox("frame", side * 7.35, 6.16, 0,
      .12, .22, 18.6);

    for (const z of [-6, -2, 2, 6]) {
      // Slanted external structural buttresses.
      addBox("frame",
        side * 8.53, 3.72, z,
        .30, 4.8, .44,
        side * -.17
      );

      addBox("armor",
        side * 8.52, 5.75, z,
        .75, .42, 1.65
      );
    }

    // Roof-mounted equipment housing.
    for (const z of [-5.5, 1.8, 6]) {
      addBox("graphite",
        side * 6.35, 6.42, z,
        1.85, .65, 1.9);
      addBox("armor",
        side * 6.35, 6.85, z,
        1.98, .24, 2.05);

      for (let i = -2; i <= 2; i++) {
        addBox("frame",
          side * 6.35 + i * .26,
          6.76, z + 1.055,
          .095, .28, .055
        );
      }
    }
  }

  // A larger, engineered entrance arch around vestibule.
  for (const side of [-1, 1]) {
    addBox("graphite", side * 2.40,
      3.17, 13.46, .57, 3.95, .78);
    addBox("armor", side * 2.43,
      3.24, 13.85, .30, 3.88, .19);
    addBox("frame", side * 2.64,
      3.25, 13.67, .15, 4.12, .65);
    addBox("green", side * 2.23,
      3.21, 13.94, .045, 3.47, .035);
  }

  addBox("graphite", 0, 5.48, 13.55,
    5.65, .78, 1.0);
  addBox("armor", 0, 5.74, 13.86,
    6.10, .28, .73);
  addBox("frame", 0, 5.14, 13.99,
    5.10, .12, .13);
  addBox("green", 0, 5.02, 14.07,
    4.15, .035, .045);


  // V8.7 PREMIUM ENTRANCE
  // Decorative architecture only: no colliders or lights.

  // Layered industrial entrance structure.
  for (const side of [-1, 1]) {
    // Exterior support tower.
    addBox("graphite",
      side * 2.92, 3.75, 13.55,
      .48, 4.65, .98);

    addBox("armor",
      side * 2.92, 3.77, 14.08,
      .34, 4.35, .12);

    // Mechanical face plates.
    for (const y of [2.2, 3.45, 4.7]) {
      addBox("frame",
        side * 2.92, y, 14.16,
        .40, .13, .14);
    }

    // Recessed green access channel.
    addBox("graphite",
      side * 2.67, 3.5, 14.12,
      .13, 3.54, .095);

    addBox("green",
      side * 2.67, 3.5, 14.18,
      .035, 3.28, .025);

    // Canopy-side load bearing bracket.
    addBox("frame",
      side * 2.62, 5.94, 13.60,
      .34, .42, 1.44);

    // Upper external armor support.
    addBox("armor",
      side * 3.45, 6.08, 13.38,
      1.05, .37, 1.3);
  }

  // Layered deep entry canopy and roof silhouette.
  addBox("graphite",
    0, 6.11, 13.48,
    6.55, .54, 1.78);

  addBox("armor",
    0, 6.48, 13.54,
    7.05, .25, 1.96);

  addBox("frame",
    0, 5.79, 14.46,
    6.25, .14, .18);

  addBox("green",
    0, 5.68, 14.56,
    5.78, .035, .035);

  // Symmetrical large-scale front engineering details.
  for (const side of [-1, 1]) {
    const x = side * 5.2;

    // Upper facade armor.
    addBox("armor",
      x, 5.79, 10.48,
      4.45, .34, .5);

    // Recessed equipment surround.
    addBox("frame",
      x, 3.22, 10.38,
      3.38, 1.78, .09);

    addBox("graphite",
      x, 3.23, 10.47,
      2.91, 1.30, .065);

    // Deep ventilation slots.
    for (const y of [2.84, 3.12, 3.40, 3.68]) {
      addBox("recess",
        x, y, 10.52,
        2.45, .075, .045);
    }

    // Equipment identification bar.
    addBox("green",
      x, 2.15, 10.48,
      1.03, .027, .035);
  }


  // V8.8 CINEMATIC EXTERIOR MODULES
  // Static exterior architecture. No lights or colliders.

  // Heavy roof perimeter with segmented load-bearing ribs.
  for (const side of [-1, 1]) {
    addBox("graphite",
      side * 8.12, 6.32, 0,
      .68, .62, 18.5);

    addBox("armor",
      side * 8.28, 6.76, 0,
      .83, .26, 18.7);

    for (const z of [-7, -3.5, 0, 3.5, 7]) {
      // External angled support members.
      addBox("frame",
        side * 8.84, 4.66, z,
        .32, 3.62, .48,
        -side * .24);

      addBox("armor",
        side * 8.71, 6.32, z,
        1.12, .40, .92);
    }
  }

  // Four prominent elevated lateral service pods.
  // Kept outside the main room/corridor envelope.
  for (const side of [-1, 1]) {
    for (const z of [-4.8, 4.8]) {
      const x = side * 10.12;

      // Reinforced connection to building side.
      addBox("frame",
        side * 9.02, 4.08, z,
        2.0, .36, 2.45);

      // Equipment pod chassis.
      addBox("graphite",
        x, 4.18, z,
        3.32, 2.14, 3.72);

      addBox("armor",
        x, 4.38, z,
        3.50, 1.84, 3.42);

      // Deep layered roof housing.
      addBox("graphite",
        x, 5.48, z,
        3.68, .44, 3.92);

      addBox("armor",
        x, 5.76, z,
        3.88, .24, 4.08);

      // Outward facing radiator and access plates.
      addBox("graphite",
        x + side * 1.79, 4.28, z,
        .10, 1.25, 2.82);

      for (let i = -4; i <= 4; i++) {
        addBox("frame",
          x + side * 1.87, 4.28,
          z + i * .29,
          .085, 1.04, .075);
      }

      // Upper service conduits.
      for (const offset of [-.8, 0, .8]) {
        addBox("frame",
          x + offset, 5.95, z,
          .13, .27, 3.42);
      }
    }
  }

  // Central rooftop life-support and atmosphere processing.
  // Raised above the existing roof cutaway.
  for (const z of [-5.8, -1.8, 2.2, 6.2]) {
    addBox("graphite",
      0, 6.54, z,
      3.38, .72, 2.52);

    addBox("armor",
      0, 7.02, z,
      3.68, .24, 2.72);

    // Recessed ventilation panel housings.
    for (const x of [-1.1, 0, 1.1]) {
      addBox("recess",
        x, 7.17, z,
        .76, .075, 1.86);

      for (const dz of [-.55, -.22, .11, .44]) {
        addBox("frame",
          x, 7.23, z + dz,
          .67, .055, .065);
      }
    }
  }

  // Broad front armor shoulders improve long-distance silhouette.
  for (const side of [-1, 1]) {
    const x = side * 5.22;

    addBox("graphite",
      x, 6.35, 9.58,
      4.44, .56, .70);

    addBox("armor",
      x, 6.70, 9.73,
      4.72, .26, .88);

    addBox("frame",
      x, 6.04, 10.14,
      4.14, .16, .16);

    // Vertical facade divisions.
    for (const dx of [-1.7, 1.7]) {
      addBox("frame",
        x + dx, 4.07, 10.56,
        .18, 3.10, .20);
    }
  }

  const materials: Record<Finish, THREE.MeshStandardMaterial> = {
    armor: new THREE.MeshStandardMaterial({
      color: "#c5d0cd",
      metalness: .12,
      roughness: .72,
      emissive: "#b5c7bf",
      emissiveIntensity: .14,
    }),
    frame: new THREE.MeshStandardMaterial({
      color: "#889ca5",
      metalness: .28,
      roughness: .55,
      emissive: "#7a9196",
      emissiveIntensity: .10,
    }),
    graphite: new THREE.MeshStandardMaterial({
      color: "#343f49",
      metalness: .17,
      roughness: .77,
    }),
    recess: new THREE.MeshStandardMaterial({
      color: "#6f838c",
      metalness: .16,
      roughness: .69,
    }),
    green: new THREE.MeshStandardMaterial({
      color: "#00c965",
      emissive: "#00c965",
      emissiveIntensity: .65,
      metalness: 0,
      roughness: .5,
      toneMapped: false,
    }),
  };

  const meshes: THREE.Mesh[] = finishes.flatMap(finish => {
    const geometries = parts[finish];
    if (!geometries.length) return [];

    const merged = mergeGeometries(geometries, false);
    geometries.forEach(g => g.dispose());

    if (!merged) throw new Error(
      "V8.6 geometry merge failed: " + finish
    );

    const mesh = new THREE.Mesh(merged, materials[finish]);
    mesh.name = "v86-" + finish;
    mesh.castShadow = false;
    mesh.receiveShadow = false;
    mesh.frustumCulled = true;
    return [mesh];
  });

  // Station designation — static artwork, not gameplay data.
  const canvas = document.createElement("canvas");
  canvas.width = 1024;
  canvas.height = 256;
  const ctx = canvas.getContext("2d");

  if (ctx) {
    ctx.fillStyle = "#0c1821";
    ctx.fillRect(0, 0, 1024, 256);
    ctx.strokeStyle = "#3c6470";
    ctx.lineWidth = 9;
    ctx.strokeRect(7, 7, 1010, 242);

    ctx.fillStyle = "#e3f3ef";
    ctx.font = "bold 104px sans-serif";
    ctx.textAlign = "center";
    ctx.fillText("BOBU GENESIS", 512, 118);

    ctx.fillStyle = "#28d58d";
    ctx.font = "bold 39px monospace";
    ctx.fillText("ARES RESEARCH OUTPOST", 512, 187);

    ctx.fillStyle = "#85aeb3";
    ctx.font = "24px monospace";
    ctx.fillText("MARS / SECTOR ARES", 512, 224);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.colorSpace = THREE.SRGBColorSpace;
  texture.needsUpdate = true;

  const signMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    toneMapped: false,
    side: THREE.DoubleSide,
  });

  const sign = new THREE.Mesh(
    new THREE.PlaneGeometry(5.70, 1.42),
    signMaterial
  );
  sign.name = "v86-bobu-genesis-sign";
  sign.position.set(0, 6.04, 14.58);
  sign.castShadow = false;

  meshes.push(sign);

  return {
    meshes,
    dispose() {
      meshes.forEach(mesh => {
        mesh.geometry.dispose();
        const m = mesh.material;
        if (Array.isArray(m)) m.forEach(x => x.dispose());
        else m.dispose();
      });
      Object.values(materials).forEach(m => m.dispose());
      texture.dispose();
    },
  };
}

export function GenesisExteriorV86() {
  const kit = useMemo(() => createExterior(), []);

  useEffect(() => {
    return () => kit.dispose();
  }, [kit]);

  return (
    <group name="genesis-v86-exterior" dispose={null}>
      {kit.meshes.map(mesh => (
        <primitive
          key={mesh.name}
          object={mesh}
        />
      ))}
    </group>
  );
}
