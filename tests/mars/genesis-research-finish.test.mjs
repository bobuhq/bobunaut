import { createHash } from "node:crypto";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import test from "node:test";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";
import { mergeGeometries } from "three/addons/utils/BufferGeometryUtils.js";
import ts from "typescript";
import { campusArchitecture } from "../../src/imported-v11/core/mars/exploration/genesis-v5/campus-architecture.mjs";
import { buildings, hubFloor, loadTs, terrainAt } from "../genesis-v12/campus-fixture.mjs";
import { createCampusTraversal } from "../../src/core/mars/exploration/separate-v11/campus-traversal.mjs";

const root = "src/core/mars/exploration/separate-v11/";
const baseline = "0ddba9c961cfb35fc322be8ea71cb68ff37b4294";
const research = buildings.find(b => b.id === "habitat");
const site = research.plan.sites[0];
const model = createCampusTraversal(buildings, terrainAt, hubFloor);

function renderFinish() {
  const cleanups = [];
  const labels = [];
  const canvas = { getContext: () => ({ fillRect() {}, fillText: label => labels.push(label) }) };
  const jsx = (type, props) => typeof type === "function" ? type(props) : { type, props };
  const modules = {
    react: { useMemo: create => create(), useEffect: effect => cleanups.push(effect()) },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    three: THREE,
    "three/addons/utils/BufferGeometryUtils.js": { mergeGeometries },
    "../../../../imported-v11/core/mars/exploration/genesis-v5/campus-architecture.mjs": { campusArchitecture },
  };
  const exports = {};
  const { outputText } = ts.transpileModule(readFileSync(root + "GenesisResearchFinish.tsx", "utf8"), {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  runInNewContext(outputText, {
    exports, document: { createElement: () => ({ ...canvas }) }, require: id => modules[id],
  });
  return { ...exports, labels, cleanups };
}

function boxBounds(geometry) {
  const positions = geometry.attributes.position;
  // Each merged BoxGeometry contributes 24 vertices (four per face).
  return Array.from({ length: positions.count / 24 }, (_, i) => {
    const bounds = new THREE.Box3();
    for (let j = 0; j < 24; j++) bounds.expandByPoint(new THREE.Vector3().fromBufferAttribute(positions, i * 24 + j));
    return bounds;
  });
}

async function loadResearchHull() {
  const bytes = readFileSync("public/mars/final-v11/campus/" + site.file);
  const { scene } = await new GLTFLoader().parseAsync(bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "");
  scene.scale.setScalar(site.scale);
  scene.updateMatrixWorld(true);
  return scene;
}

test("laboratory finish hugs the actual wing collision envelope or sits overhead", async () => {
  const { GenesisResearchFinish, cleanups } = renderFinish();
  const mount = GenesisResearchFinish({ site });
  const mesh = mount.props.children;
  assert.equal(mesh.props.userData.cameraIgnore, true);
  assert.deepEqual(Array.from(mount.props.position), [site.x, site.deck, site.z]);
  const geometry = mesh.props.geometry;
  assert.equal(geometry.groups.length, 2);
  assert.ok(geometry.index.count / 3 < 1000);

  const scene = await loadResearchHull();
  let overhead = 0;
  for (const bounds of boxBounds(geometry)) {
    if (bounds.min.y > 4) {
      overhead++;
      const center = bounds.getCenter(new THREE.Vector3());
      // The panel must be visible from below the production hull.
      const origin = new THREE.Vector3(center.x, 2.6, center.z);
      const ray = new THREE.Raycaster(origin, new THREE.Vector3(0, 1, 0), 0, bounds.min.y - origin.y - .01);
      assert.equal(ray.intersectObject(scene, true).length, 0);
      continue;
    }
    const center = bounds.getCenter(new THREE.Vector3());
    const wing = model.obstacles.find(o => o.kind === "box" && o.halfWidth === 1.2 &&
      Math.sign(o.x - research.worldX) === Math.sign(center.x));
    assert.ok(wing);
    assert.ok(bounds.min.x >= wing.x - research.worldX - wing.halfWidth);
    assert.ok(bounds.max.x <= wing.x - research.worldX + wing.halfWidth);
    assert.ok(bounds.min.z >= -wing.halfDepth && bounds.max.z <= wing.halfDepth);
  }
  assert.equal(overhead, 8);
  let disposed = false;
  geometry.addEventListener("dispose", () => { disposed = true; });
  cleanups.forEach(cleanup => cleanup());
  assert.equal(disposed, true);
});

test("both Genesis trim sets preserve the GLB opening and rear moving-door sweep", async () => {
  const { GenesisPortalFinish, cleanups, labels } = renderFinish();
  const { createCampusExperience } = loadTs(root + "campus-experience.ts");
  const experience = createCampusExperience(model, buildings, hubFloor);
  const rear = experience.doors.find(door => door.id === "v12-genesis-rear");
  assert.equal(rear.z, research.worldZ - 5.4);
  assert.equal(rear.floor, site.deck + .4);

  // Cut the actual production mesh in unscaled scene space, just as the campus loader does.
  const scene = await loadResearchHull();
  scene.scale.setScalar(1);
  const { openResearchShell } = loadTs(root + "portal-geometry.ts");
  const owned = openResearchShell(scene, site.scale);
  scene.scale.setScalar(site.scale);
  scene.updateMatrixWorld(true);

  let disposed = 0;
  for (const entrance of ["front", "rear"]) {
    const [mesh, sign] = GenesisPortalFinish({ entrance }).props.children;
    assert.equal(mesh.props.userData.cameraIgnore, true);
    assert.equal(sign.props.userData.cameraIgnore, true);
    const bounds = boxBounds(mesh.props.geometry);
    const opening = new THREE.Box3(new THREE.Vector3(-1.4, 0, -.45), new THREE.Vector3(1.4, 3.12, .45));
    for (const box of bounds) {
      assert.equal(box.intersectsBox(opening), false);
      // Includes the V19 mobile door's deepest hardware (the cyan edge and base).
      assert.ok(box.min.z > .06);
    }
    assert.ok(sign.props.position[1] - sign.props.children[0].props.args[1] / 2 > opening.max.y);
    const frameZ = entrance === "front" ? 6.4 : rear.z - research.worldZ;
    const signZ = frameZ + sign.props.position[2];
    const signY = .4 + sign.props.position[1];
    for (const x of [-.7, 0, .7]) {
      const ray = new THREE.Raycaster(new THREE.Vector3(x, signY, signZ + 1), new THREE.Vector3(0, 0, -1), 0, .999);
      assert.equal(ray.intersectObject(scene, true).length, 0, entrance + " sign is visible from its approach");
    }
    sign.props.children[1].props.map.addEventListener("dispose", () => disposed++);
  }
  owned.forEach(geometry => geometry.dispose());
  assert.deepEqual(labels, ["GENESIS ACCESS", "RESEARCH LAB"]);
  cleanups.forEach(cleanup => cleanup());
  assert.equal(disposed, 2);

  const architecture = readFileSync(root + "ConnectedCampusArchitecture.tsx", "utf8");
  assert.match(architecture, /research&&\[-5\.4,6\.4\]\.map/);
  assert.match(architecture, /<GenesisPortalFinish entrance=\{i === 1 \? 'front' : 'rear'\}/);
});

test("V20 protects production paths with approved release fingerprints", () => {
  const changed = [
    ...execFileSync("git", ["diff", "--name-only", baseline], {
      encoding: "utf8",
    }).trim().split("\n"),
    ...execFileSync("git", ["ls-files", "--others", "--exclude-standard"], {
      encoding: "utf8",
    }).trim().split("\n"),
  ].filter(Boolean);

  const protectedCore =
    /(?:MarsExploreWorld|BobuCharacterVisual|AresMobileActions|AresMobileJoystick|MarsFollowCamera|AresRenderQuality|AresColonyVoicePanel)\.tsx$/;

  const protectedCampus =
    /(?:campus-experience\.ts|CampusInteriorEffects\.tsx|campus-traversal\.mjs|portal-geometry\.ts|GenesisResearchDisplays\.tsx)$/;

  const protectedSystems =
    /(?:^supabase\/|\/(?:commandhub|flight|missions|auth)\/|\/multiplayer\/AresColonyVoiceEngine\.ts$)/i;

  const approved = {
    "src/core/mars/exploration/session/useAresCheckpointRestore.ts":
      "8b30189002a861ce930665615b801ba2ed43abfeeb5a68fcdb244598c655ec71",
    "src/core/mars/exploration/session/aresCheckpointRestore.mjs":
      "bee3b93e37b9eee6ef425dbfe9006808ac1c46b22daabb64320535714184a5a2",
    "src/core/mars/exploration/session/aresCheckpointRestore.d.mts":
      "f9356d7017f4cb14a7d07106c3f4bf8cbab4f471aceeef185f07753ebafdaeee",
    "src/core/mars/exploration/session/aresCheckpoint.mjs":
      "cd4f99c1ffcbc0e3a42ccd767997ce4c2670b7b5bff8247b995f150934ab103e",
    "src/core/mars/exploration/session/aresCheckpoint.d.mts":
      "8344d6d64e30bfe1ab12af5faa14b3a32e4b0bdd54ab2cf056efab95fc2a2d25",
    "src/imported-v11/core/mars/exploration/genesis-v5/FinalV11CampusAssets.tsx":
      "41b0a992e37ecdf70e7cf27e6f00604a68085c8e30ec0fc4e5ec14c13d59ee64",
    "src/core/mars/exploration/separate-v11/SeparateV11Campus.tsx":
      "8b3ef39f4033b096561ecb7d72a950439b88c754d0f3eaf0df490607794acf7a",
    "src/core/mars/exploration/components/BobuCharacterController.tsx":
      "e87f1b51154bcf93e639e637c21249583b5e0233660d200aeb64b5e8ff3887f8",
    "src/core/mars/exploration/MarsExploreWorld.tsx":
      "cd3da13e6d7cf79e7c6a21a7c4c8fbdb03c252da00d408297dcb93c7e90f9d9c",
    "src/core/mars/exploration/components/AresMobileActions.tsx":
      "550710637718f23013eb8053f39c1de68980bea41fa24082a27833cc5134bf97",
    "src/core/mars/exploration/components/AresMobileJoystick.tsx":
      "5b77d24db946c17939e41dfdafdf278edc7740489485be3132a0fed3d8bf44b0",
    "src/core/mars/exploration/components/AresRenderQuality.tsx":
      "52ea6c46290775b015b3b74ac71af2f0f02f93abae0e60d3105f77ca09f78a49",
    "src/core/mars/exploration/components/MarsFollowCamera.tsx":
      "e930e65374888e33902f8bd63d059838c3b243f309d5cb2a667d40eb16563f1d",
    "src/core/mars/exploration/commandhub/AresCommandHub.tsx":
      "80cbabae1196699a497837f376b156fee0cc286d996f4f85d2952a751430138a",
    "src/core/mars/exploration/commandhub/AresCommandHubV31Facility.tsx":
      "4a503a988f6608c958fbef47050921eb4723e7bd73a01e577bd4cacfc02e9899",
    "src/core/mars/exploration/commandhub/AresCommandHubWalkableSurface.ts":
      "9e42a20e2b584330e8fdd9dcc4fdd218a38e323949cc7c1981db2d5da8ac87f8",
    "src/core/mars/exploration/missions/AresHiddenMissionService.ts":
      "f03f58c4ba424646163085e7903459a17eb6de9f293c9fd2a6844e34145e48a8",
    "src/core/mars/exploration/missions/AresMissionTerminal.tsx":
      "75ad23a3013c63a6fb82b22007c9b5d90a1668eee9b719b92a371c47c651872b",
    "src/core/mars/exploration/multiplayer/AresColonyVoiceEngine.ts":
      "3aabe4eaa7e1415c08491420114f32465c066aed391418f93ba94c5133bc8e5a",
    "src/core/mars/exploration/multiplayer/AresColonyVoicePanel.tsx":
      "df99cb7a1bb06775257a2122ea7c34717239f540620412e10fc2830a10b1e2f7",
    "supabase/config.toml":
      "c037b41612fa34849aaf5cc24e73f718b8ab8b4120fdb455d0464e12c405c05b",
    "supabase/functions/ares-colony-voice-revoke/.npmrc":
      "2cc495d5b8918533470e2666eccfcc0532a2a75699e8ad7c887163c83322ab55",
    "supabase/functions/ares-colony-voice-revoke/deno.json":
      "ae97dc88b198860287daea830449c4e19f00c8f01d1a1df2bbea54cf4bad37f4",
    "supabase/functions/ares-colony-voice-revoke/deno.lock":
      "9e12af446c74b98249ee34d037fd15175781d2cdf9e5be619c2d3e1ca43a87fa",
    "supabase/functions/ares-colony-voice-revoke/index.ts":
      "7e14b20f07c934fa5e8923d11a13ccba62f7974720fd9701d64db2abaa6e1d6f",
    "supabase/functions/ares-colony-voice-token/deno.json":
      "a9d96073a1744d376bcea948d0ca7870d2e0a441a18fc262d609a32b6a284ee6",
    "supabase/functions/ares-colony-voice-token/deno.lock":
      "07c28024e407d6b429350dae6825f743ea210eef9578324c2e3f50f700eeb232",
    "supabase/functions/ares-colony-voice-token/index.ts":
      "5a4450c9f059b4cc82d159c61c2cd01e3eea676085e08f44ea5788ca620c264e",
    "supabase/migrations/20261124151406_ares_colony_voice_revocation_queue.sql":
      "9f53f464aad443e4d790e018258f588fac879e24222237eebb92e9b2b14cdc04",
    "supabase/migrations/20261126072035_ares_voice_public_access_v1.sql":
      "5b5a037eb9b3675117d12e40f2013b38430722b65dc77366bcdedb26c2b806af",
    "supabase/functions/x-verification-status/index.ts":
      "ea33955ebeb2952738ac23880671254a8119bd49e58fa723f07c61e5ce7469f0",
  };

  const protectedResume =
    /(?:BobuCharacterController|SeparateV11Campus|FinalV11CampusAssets)\.tsx$|\/exploration\/session\//;

  const protectedChanges = changed.filter(path =>
    protectedCore.test(path) ||
    protectedCampus.test(path) ||
    protectedSystems.test(path) ||
    protectedResume.test(path)
  );

  assert.deepEqual(
    protectedChanges.sort(),
    Object.keys(approved).sort(),
    "Unexpected protected production file change"
  );

  for (const [path, expected] of Object.entries(approved)) {
    assert.equal(
      createHash("sha256")
        .update(readFileSync(path))
        .digest("hex"),
      expected,
      "Approved production source fingerprint mismatch: " + path
    );
  }
});
