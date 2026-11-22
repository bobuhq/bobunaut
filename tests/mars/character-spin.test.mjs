import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { Group } from "three";
import * as THREE from "three";
import { GLTFLoader } from "three/addons/loaders/GLTFLoader.js";

function loadComponent(name, window, overrides = {}) {
  const source = readFileSync(new URL(
    `../../src/core/mars/exploration/components/${name}.tsx`,
    import.meta.url,
  ), "utf8");
  const { outputText } = ts.transpileModule(source, {
    compilerOptions: { jsx: ts.JsxEmit.ReactJSX, module: ts.ModuleKind.CommonJS },
  });
  const jsx = (type, props) => ({ type, props });
  const modules = {
    react: {
      useCallback: (callback) => callback,
      useMemo: (factory) => factory(),
      useRef: (current) => ({ current }),
      useState: (initial) => [initial, () => {}],
      ...overrides.react,
    },
    "react/jsx-runtime": { jsx, jsxs: jsx },
    "../audio/MarsAudioEngine": { marsAudio: { step() {} } },
    ...overrides.modules,
  };
  const exports = {};
  runInNewContext(outputText, {
    exports, window, Event, CustomEvent, require: (id) => modules[id],
  });
  return exports[name];
}

test("a second touch starts SPIN or LEFT ARM while the walking stick retains its pointer", () => {
  const window = new EventTarget();
  const MobileActions = loadComponent("AresMobileActions", window);
  assert.equal(MobileActions({}).props.children.filter(child => child?.type === "button").length, 2);
  const [jump, interact, spin, leftArm] = MobileActions({ canSpin: true, canMoveLeftArm: true }).props.children;
  assert.equal(leftArm.props["aria-label"], "Punch");
  assert.equal(jump.props["aria-label"], "Jump");
  assert.equal(interact.props["aria-label"], "No interaction available");
  assert.equal(spin.props["aria-label"], "Spin");

  const Joystick = loadComponent("AresMobileJoystick", window);
  const movement = [];
  const base = Joystick({ onMove: ({ x, y }) => movement.push([x, y]) }).props.children;
  const captured = new Set();
  const target = {
    getBoundingClientRect: () => ({ left: 0, top: 0, width: 116, height: 116 }),
    setPointerCapture: (id) => captured.add(id),
    hasPointerCapture: (id) => captured.has(id),
    releasePointerCapture: (id) => captured.delete(id),
  };
  base.props.ref.current = target;
  const stopped = [];
  const pointer = (pointerId, clientX) => ({
    pointerId, clientX, clientY: 58, currentTarget: target,
    isPrimary: pointerId === 1,
    preventDefault() { stopped.push("default"); },
    stopPropagation() { stopped.push("propagation"); },
  });

  base.props.onPointerDown(pointer(1, 100));
  const attacks = [];
  window.addEventListener("bobu:ares-attack", (event) => attacks.push(event.detail));
  stopped.length = 0;
  spin.props.onPointerDown(pointer(2, 0));
  assert.deepEqual(attacks, ["spin"]);
  assert.deepEqual(stopped, ["default", "propagation"]);
  assert.deepEqual([...captured], [1]);
  stopped.length = 0;
  leftArm.props.onPointerDown(pointer(2, 0));
  assert.deepEqual(attacks, ["spin", "punch"]);
  assert.deepEqual(stopped, ["default", "propagation"]);
  assert.deepEqual([...captured], [1]);
  base.props.onPointerMove(pointer(1, 16));
  base.props.onPointerUp(pointer(1, 16));
  assert.deepEqual(movement, [[1, 0], [-1, 0], [0, 0]]);
});

test("SPIN turns only the walking visual through one full revolution", () => {
  const window = new EventTarget();
  const cleanups = [];
  let advanceFrame;
  const CharacterVisual = loadComponent("BobuCharacterVisual", window, {
    react: { useEffect: (effect) => cleanups.push(effect()) },
    modules: {
      "@react-three/drei": {
        useGLTF: Object.assign(() => ({ scene: new Group(), animations: [] }), { preload() {} }),
        useAnimations: () => ({ actions: { Idle: {
          reset() { return this; },
          setEffectiveTimeScale() { return this; },
          setEffectiveWeight() { return this; },
          fadeIn() { return this; },
          play() {},
          stop() {},
        } }, names: ["Idle"] }),
      },
      "@react-three/fiber": { useFrame: (callback) => { advanceFrame = callback; } },
      three: { Mesh: class {} },
    },
  });

  const actor = new Group();
  actor.rotation.y = 0.7;
  const visual = new Group();
  actor.add(visual);
  const ready = [];
  CharacterVisual({ onSpinReadyChange: (value) => ready.push(value) }).props.ref.current = visual;
  const spin = () => window.dispatchEvent(new CustomEvent("bobu:ares-attack", { detail: "spin" }));

  spin();
  advanceFrame(null, 0.45);
  assert.equal(visual.rotation.y, Math.PI);
  advanceFrame(null, 0.225);
  assert.equal(visual.rotation.y, 1.5 * Math.PI);
  advanceFrame(null, 0.225);
  assert.equal(visual.rotation.y, 0);
  assert.equal(actor.rotation.y, 0.7);
  assert.equal(actor.position.length(), 0);

  spin();
  advanceFrame(null, 0.45);
  cleanups.forEach((cleanup) => cleanup?.());
  spin();
  advanceFrame(null, 0.45);
  assert.equal(visual.rotation.y, 0);
  assert.deepEqual(ready, [true, false]);

  const landingVisual = new Group();
  CharacterVisual({}).props.ref.current = landingVisual;
  spin();
  advanceFrame(null, 0.45);
  assert.equal(landingVisual.rotation.y, 0);
});


test("LEFT ARM layers over the real clips, moves the hand outward, and restores the clip pose", async () => {
  globalThis.ProgressEvent ??= class ProgressEvent {};
  const bytes = readFileSync(new URL("../../public/models/bobu/bobu-explorer-v1.glb", import.meta.url));
  const gltf = await new GLTFLoader().parseAsync(
    bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength), "",
  );
  assert.deepEqual(gltf.animations.map(clip => clip.name).sort(), ["Idle", "Run", "Walk"]);

  for (const clip of gltf.animations) {
    const window = new EventTarget();
    const cleanups = [];
    const frames = [];
    const ready = [];
    let mixer;
    const CharacterVisual = loadComponent("BobuCharacterVisual", window, {
      react: { useEffect: (effect) => cleanups.push(effect()) },
      modules: {
        "@react-three/drei": {
          useGLTF: Object.assign(() => gltf, { preload() {} }),
          useAnimations: (_clips, scene) => {
            mixer = new THREE.AnimationMixer(scene);
            const actions = Object.fromEntries(gltf.animations.map(c => [c.name, mixer.clipAction(c)]));
            frames.push([0, (_state, delta) => mixer.update(delta)]);
            return { actions, names: Object.keys(actions) };
          },
        },
        "@react-three/fiber": { useFrame: (callback, priority = 0) => frames.push([priority, callback]) },
        three: THREE,
      },
    });

    const visual = CharacterVisual({ onLeftArmReadyChange: value => ready.push(value) });
    const scene = visual.props.children.props.object;
    const arm = scene.getObjectByName("Arm_L");
    assert.ok(arm.isBone);
    assert.equal(arm.parent.name, "Torso");
    assert.deepEqual(arm.children.map(child => child.name).sort(), ["Hand_-1", "Shoulder_-1", "UpperArm_-1"]);
    assert.ok(clip.tracks.some(track => track.name === "Arm_L.quaternion"));

    mixer.stopAllAction();
    mixer.clipAction(clip).play();
    const baseline = gltf.scene.clone(true);
    const baselineMixer = new THREE.AnimationMixer(baseline);
    baselineMixer.clipAction(clip).play();
    const baselineArm = baseline.getObjectByName("Arm_L");
    frames.sort((a, b) => a[0] - b[0]);
    const frame = delta => {
      baselineMixer.update(delta);
      frames.forEach(([, callback]) => callback(null, delta));
    };

    for (let sample = 0; sample < 8; sample++) {
      frame(clip.duration / 8);
      window.dispatchEvent(new Event("bobu:ares-left-arm"));
      frame(0.36);
      const handX = object => object.getObjectByName("Hand_-1").getWorldPosition(new THREE.Vector3()).x;
      assert.ok(handX(arm) < handX(baselineArm) - .12, clip.name);
      const cap = arm.getObjectByName("Shoulder_-1");
      const baselineCap = baselineArm.getObjectByName("Shoulder_-1");
      assert.ok(cap.getWorldPosition(new THREE.Vector3())
        .distanceTo(baselineCap.getWorldPosition(new THREE.Vector3())) < .00001);
      assert.ok(cap.getWorldQuaternion(new THREE.Quaternion())
        .angleTo(baselineCap.getWorldQuaternion(new THREE.Quaternion())) < .001);
      scene.traverse(object => {
        if (object.isBone && object !== arm) {
          assert.ok(object.quaternion.angleTo(baseline.getObjectByName(object.name).quaternion) < .001);
        }
      });
      frame(0.36);
      assert.ok(arm.quaternion.angleTo(baselineArm.quaternion) < .001);
    }

    window.dispatchEvent(new Event("bobu:ares-left-arm"));
    frame(0.36);
    cleanups.forEach(cleanup => cleanup?.());
    const afterCleanup = arm.quaternion.clone();
    window.dispatchEvent(new Event("bobu:ares-left-arm"));
    frame(0.36);
    assert.ok(arm.quaternion.angleTo(afterCleanup) < .001);
    assert.deepEqual(ready, [true, false]);
  }
});
