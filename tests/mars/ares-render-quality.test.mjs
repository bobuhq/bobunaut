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
  let now = 0;
  let renderDpr;
  const exports = {};
  const modules = {
    react: { useEffect: effect => effect(), useRef: current => ({ current }) },
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
    document: { hidden: false },
    performance: { now: () => now },
  });
  const outdoorWalkingCheck = { current: outdoorWalking ? () => true : null };
  exports.AresRenderQuality({
    outdoorWalkingCheck,
    onDprChange: value => { renderDpr = value; },
  });
  return {
    get dpr() { return renderDpr; },
    setOutdoorWalking(outdoors) {
      outdoorWalkingCheck.current = () => outdoors;
    },
    advance(delta, frames) {
      for (let index = 0; index < frames; index += 1) {
        now += delta * 1000;
        frame(null, delta);
      }
    },
  };
}

test("mobile walking prefers DPR 1 and retains a lower floor for repeated stalls", () => {
  for (const [native, ceiling, stallFloor] of [[false, 1.5, 0.85], [true, 1.75, 0.9]]) {
    const quality = mountQuality({ native, outdoorWalking: true });
    assert.equal(quality.dpr, ceiling);
    quality.advance(0.04, 500);
    assert.equal(quality.dpr, 1);
    quality.advance(0.3, 1);
    assert.equal(quality.dpr, 1);
    quality.advance(0.3, 1);
    assert.equal(quality.dpr, stallFloor);
    quality.advance(0.04, 500);
    assert.equal(quality.dpr, stallFloor);
    quality.advance(0.01, 5_000);
    assert.equal(quality.dpr, ceiling);
  }
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

  for (const [mobile, native, budget] of [[true, false, 1_300_000], [true, true, 1_650_000], [false, false, 3_200_000]]) {
    const quality = mountQuality({ mobile, native, outdoorWalking: true, width: 2_000, height: 2_000 });
    quality.advance(0.04, 500);
    quality.advance(0.3, 2);
    quality.advance(0.01, 5_000);
    assert.equal(quality.dpr, Math.sqrt(budget / 4_000_000));
  }
});
