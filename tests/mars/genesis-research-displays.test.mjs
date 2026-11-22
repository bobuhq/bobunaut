import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import ts from "typescript";
import { campusArchitecture } from "../../src/imported-v11/core/mars/exploration/genesis-v5/campus-architecture.mjs";

const campus = new URL("../../src/core/mars/exploration/separate-v11/", import.meta.url);

test("Genesis uses one inward-facing display batch mounted on its real laboratory walls", async () => {
  globalThis.ProgressEvent ??= class ProgressEvent {};
  const bytes = readFileSync(new URL("../../public/mars/final-v11/campus/habitat-dome-8d3499.glb", import.meta.url));
  const { scene } = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "",
  );
  scene.scale.setScalar(1.35);
  scene.updateMatrixWorld(true);

  const cleanups = [];
  const labels = new Set();
  const noop = () => {};
  const canvas = {
    getContext: () => ({
      fillText: (label) => labels.add(label), fillRect: noop, strokeRect: noop,
      beginPath: noop, moveTo: noop, lineTo: noop, stroke: noop,
      save: noop, restore: noop, translate: noop,
    }),
  };
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: { useMemo: create => create(), useEffect: effect => cleanups.push(effect()) },
    "react/jsx-runtime": { jsx },
    three: THREE,
    "../../../../imported-v11/core/mars/exploration/genesis-v5/campus-architecture.mjs": { campusArchitecture },
  };
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(new URL("GenesisResearchDisplays.tsx", campus), "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  runInNewContext(outputText, {
    exports, document: { createElement: () => canvas }, require: id => modules[id],
  });
  const mount = exports.GenesisResearchDisplays({ site: { x: 3, deck: 7, z: -9 } });
  assert.equal(mount.type, "mesh");
  assert.deepEqual(Array.from(mount.props.position), [3, 7, -9]);
  assert.equal(mount.props.userData.cameraIgnore, true);
  assert.equal(mount.props.children.type, "meshBasicMaterial");
  assert.match(readFileSync(new URL("SeparateV11Campus.tsx", campus), "utf8"),
    /building\.id === 'habitat' && <GenesisResearchDisplays site=\{site\}/);

  for (const label of [
    "BOBU GENESIS", "ARES RESEARCH NETWORK", "CRYSTAL ENERGY SYSTEM",
    "RESOURCE ANALYSIS", "RESEARCH ARCHIVE", "SECTOR ARES", "COLONY INFRASTRUCTURE",
  ]) assert.ok(labels.has(label), label);
  assert.deepEqual([canvas.width, canvas.height], [2048, 1024]);

  const geometry = mount.props.geometry;
  const texture = mount.props.children.props.map;
  const material = new THREE.MeshBasicMaterial({ map: texture });
  const displays = new THREE.Mesh(geometry, material);
  assert.equal(geometry.attributes.position.count, 24);
  assert.equal(geometry.groups.length, 0);
  for (const side of [-1, 1]) {
    const wall = campusArchitecture("habitat").find(part =>
      part.name === "laboratory-wing" && Math.sign(part.position[0]) === side);
    const face = Math.abs(wall.position[0]) - wall.size[0] / 2;
    for (const z of [-4, -2.4, -.8, .8, 2.4, 4]) {
      for (const y of [1.29, 2.15, 3.01]) {
        const inward = new THREE.Raycaster(new THREE.Vector3(0, y, z), new THREE.Vector3(side, 0, 0), 0, face);
        const hit = inward.intersectObject(displays)[0];
        assert.ok(hit && Math.abs(hit.distance - (face - .012)) < 1e-5);
        assert.ok(Math.abs(hit.uv.x - .5) > .001);
        assert.equal(inward.intersectObject(scene, true).length, 0, "production GLB must not cover the panel");
        const outward = new THREE.Raycaster(new THREE.Vector3(side * face, y, z), new THREE.Vector3(-side, 0, 0), 0, 1);
        assert.equal(outward.intersectObject(displays).length, 0);
      }
    }
  }

  const disposed = [];
  geometry.addEventListener("dispose", () => disposed.push("geometry"));
  texture.addEventListener("dispose", () => disposed.push("texture"));
  cleanups.forEach(cleanup => cleanup());
  assert.deepEqual(disposed, ["geometry", "texture"]);
  material.dispose();
});
