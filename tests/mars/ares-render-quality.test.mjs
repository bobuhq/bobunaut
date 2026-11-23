import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";
import { runInNewContext } from "node:vm";
import ts from "typescript";

const source = readFileSync(new URL(
  "../../src/core/mars/exploration/components/AresRenderQuality.tsx",
  import.meta.url,
), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
});

function mountQuality({ mobile = true, narrow = false, native = false, outdoorWalking = false, dpr = 3, width = 800, height = 400 } = {}) {
  let frame;
  const effects = [];
  const visibilityListeners = new Set();
  const document = {
    hidden: false,
    addEventListener: (_, listener) => visibilityListeners.add(listener),
    removeEventListener: (_, listener) => visibilityListeners.delete(listener),
  };
  let refIndex;
  let now = 0;
  let renderDpr;
  const refs = [];
  const exports = {};
  const modules = {
    react: {
      useEffect: effect => { effects.push(effect); },
      useMemo: factory => factory(),
      useRef: current => {
        const index = refIndex++;
        return (refs[index] ??= { current });
      },
    },
    "@react-three/fiber": { useFrame: callback => { frame = callback; }, useThree: select => select({ size: { width, height } }) },
    "../engine/aresPerformance": { markAresStage() {} },
  };
  runInNewContext(outputText, {
    exports,
    require: id => modules[id],
    window: {
      devicePixelRatio: dpr,
      location: { pathname: "/mars" },
      matchMedia: query => ({ matches: mobile || (narrow && query.includes("max-width")) }),
    },
    navigator: { userAgent: native ? "BOBU-Mobile" : "Safari" },
    document,
    performance: { now: () => now },
  });
  const outdoorWalkingCheck = { current: outdoorWalking ? () => true : null };
  const props = {
    outdoorWalkingCheck,
    onDprChange: value => { renderDpr = value; },
  };
  function render() {
    refIndex = 0;
    effects.length = 0;
    exports.AresRenderQuality(props);
    effects[0]();
  }
  render();
  effects[1]();
  return {
    get dpr() { return renderDpr; },
    resize(nextWidth, nextHeight) {
      width = nextWidth;
      height = nextHeight;
      render();
    },
    setOutdoorWalking(outdoors) {
      outdoorWalkingCheck.current = () => outdoors;
    },
    setHidden(hidden) {
      document.hidden = hidden;
      for (const listener of visibilityListeners) listener();
    },
    advance(delta, frames) {
      for (let index = 0; index < frames; index += 1) {
        now += delta * 1000;
        frame(null, delta);
      }
    },
  };
}

test("mobile walking caps both Safari and native WebViews at HD DPR 1.5", () => {
  for (const native of [false, true]) {
    const quality = mountQuality({ native, outdoorWalking: true });
    quality.advance(0.016, 1);
    assert.equal(quality.dpr, native ? 1.75 : 1.5);
    quality.advance(0.016, 3_000);
    assert.equal(quality.dpr, native ? 1.75 : 1.5);
  }
});

test("walking degrades under sustained frame drops and recovers toward HD with measured headroom", () => {
  const quality = mountQuality({ outdoorWalking: true });
  quality.advance(0.04, 51);
  assert.equal(quality.dpr, 1.35);
  quality.advance(0.04, 500);
  assert.equal(quality.dpr, 1);
  quality.advance(0.023, 1_000);
  assert.equal(quality.dpr, 1);
  quality.advance(0.021, 410);
  assert.equal(quality.dpr, 1.25);
  quality.advance(0.021, 1_000);
  assert.equal(quality.dpr, 1.25);
  quality.advance(0.016, 1_020);
  assert.equal(quality.dpr, 1.5);
});

test("walking holds a reduced DPR through the first 30 seconds and then recovers", () => {
  const quality = mountQuality({ outdoorWalking: true });
  quality.advance(0.04, 51);
  assert.equal(quality.dpr, 1.35);
  quality.advance(0.016, 1_740);
  assert.equal(quality.dpr, 1.35);
  quality.advance(0.016, 1_000);
  assert.equal(quality.dpr, 1.5);
});

test("walking retains its lower stall floor and waits for fast frames before recovering", () => {
  for (const [native, stallFloor] of [[false, 0.85], [true, 0.9]]) {
    const quality = mountQuality({ native, outdoorWalking: true });
    quality.advance(0.04, 500);
    assert.equal(quality.dpr, 1);
    quality.advance(0.3, 1);
    assert.equal(quality.dpr, 1);
    quality.advance(0.3, 1);
    assert.equal(quality.dpr, stallFloor);
    quality.advance(0.04, 500);
    assert.equal(quality.dpr, stallFloor);
    quality.advance(0.021, 500);
    assert.equal(quality.dpr, stallFloor);
    quality.advance(0.01, 5_000);
    assert.equal(quality.dpr, native ? 1.75 : 1.5);
  }
});

test("stalls that leave walking DPR above 1 still require the stricter recovery gate", () => {
  const quality = mountQuality({ outdoorWalking: true });
  quality.advance(0.3, 4);
  assert.ok(Math.abs(quality.dpr - 1.2) < 1e-12);
  quality.advance(0.021, 500);
  assert.ok(Math.abs(quality.dpr - 1.2) < 1e-12);
  quality.advance(0.016, 2_000);
  assert.ok(Math.abs(quality.dpr - 1.35) < 1e-12);
});

test("walking viewport changes preserve a stall downgrade and enforce a tighter budget", () => {
  const quality = mountQuality({ outdoorWalking: true });
  quality.advance(0.04, 500);
  quality.advance(0.3, 2);
  quality.resize(390, 844);
  assert.equal(quality.dpr, 0.85);
  quality.resize(2_000, 2_000);
  assert.equal(quality.dpr, Math.sqrt(1_600_000 / 4_000_000));
});

test("mobile flight and landing retain the native and browser legacy floors", () => {
  for (const [native, ceiling, floor] of [[false, 1.5, 0.85], [true, 1.75, 0.9]]) {
    const quality = mountQuality({ native });
    assert.equal(quality.dpr, ceiling);
    quality.advance(0.3, 2);
    assert.equal(quality.dpr, native ? ceiling - 0.15 : ceiling);
    quality.advance(0.04, 500);
    assert.equal(quality.dpr, floor);
  }
});

test("walking handoff and interior transitions start fresh performance samples", () => {
  const quality = mountQuality({ native: true });
  quality.advance(0.3, 1);
  quality.setOutdoorWalking(true);
  quality.advance(0.3, 1);
  assert.equal(quality.dpr, 1.75);
  quality.advance(0.04, 500);
  assert.equal(quality.dpr, 1);
  quality.setOutdoorWalking(false);
  quality.advance(0.04, 500);
  assert.equal(quality.dpr, 0.9);
  quality.advance(0.016, 5_000);
  assert.equal(quality.dpr, 1.75);
});

test("desktop keeps its legacy adaptive behavior even during outdoor walking", () => {
  for (const outdoorWalking of [false, true]) {
    const desktop = mountQuality({ mobile: false, outdoorWalking });
    assert.equal(desktop.dpr, 2);
    desktop.advance(0.3, 2);
    assert.equal(desktop.dpr, 2);
    desktop.advance(0.04, 500);
    assert.equal(desktop.dpr, 1);
    desktop.advance(0.01, 6_000);
    assert.equal(desktop.dpr, 2);
  }
});

test("a narrow desktop retains its legacy shared mobile budget and floor", () => {
  const desktop = mountQuality({ mobile: false, narrow: true, outdoorWalking: true });
  assert.equal(desktop.dpr, 1.5);
  desktop.advance(0.3, 2);
  assert.equal(desktop.dpr, 1.5);
  desktop.advance(0.04, 500);
  assert.equal(desktop.dpr, 0.85);
});

test("device and pixel-budget ceilings take precedence over the walking floor", () => {
  const deviceLimited = mountQuality({ outdoorWalking: true, dpr: 0.8 });
  deviceLimited.advance(0.04, 500);
  deviceLimited.advance(0.3, 2);
  deviceLimited.advance(0.01, 5_000);
  assert.equal(deviceLimited.dpr, 0.8);

  for (const [mobile, native, outdoorWalking, budget] of [
    [true, false, true, 1_600_000],
    [true, true, true, 2_200_000],
    [true, false, false, 1_300_000],
    [true, true, false, 1_650_000],
    [false, false, true, 3_200_000],
  ]) {
    const quality = mountQuality({ mobile, native, outdoorWalking, width: 2_000, height: 2_000 });
    quality.advance(0.016, 1);
    // The initial non-walking budget may be tighter than walking HD.
    const initialBudget = mobile
      ? native ? 1_650_000 : 1_300_000
      : 3_200_000;
    assert.equal(
      quality.dpr,
      Math.sqrt(Math.min(budget, initialBudget) / 4_000_000)
    );
    quality.advance(0.04, 500);
    quality.advance(0.3, 2);
    quality.advance(0.01, 5_000);
    assert.equal(quality.dpr, Math.sqrt(budget / 4_000_000));
  }
});


test("repeated desktop stalls lower DPR and resize cannot undo the downgrade", () => {
  const desktop = mountQuality({ mobile: false });
  desktop.advance(0.3, 8);
  assert.equal(desktop.dpr, 1.85);
  desktop.resize(850, 450);
  assert.equal(desktop.dpr, 1.85);
});

test("a hidden-tab gap is excluded from a desktop foreground quality window", () => {
  const desktop = mountQuality({ mobile: false });
  desktop.advance(0.03, 60);
  desktop.setHidden(true);
  desktop.setHidden(false);
  desktop.advance(20, 1);
  desktop.advance(0.016, 125);
  assert.equal(desktop.dpr, 2);
});
