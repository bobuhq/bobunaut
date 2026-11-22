import { markAresStage } from "../engine/aresPerformance";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

export function hasCoarseAresPointer() {
  return window.matchMedia("(pointer: coarse), (max-width: 900px)").matches;
}


function isBobuNativeMars(): boolean {
  return typeof window !== "undefined" &&
    new URLSearchParams(window.location.search).get("nativeBridge") === "1";
}

function getDprLimit(width: number, height: number) {
  const mobile = hasCoarseAresPointer();
  const pixelBudget = mobile ? (isBobuNativeMars() ? 1_650_000 : 1_300_000) : 3_200_000;
  return Math.min(
    window.devicePixelRatio || 1,
    mobile ? (isBobuNativeMars() ? 1.6 : 1.5) : 2,
    Math.sqrt(pixelBudget / Math.max(1, width * height)),
  );
}

export function AresRenderQuality({ onDprChange }: { onDprChange: (dpr: number) => void }) {
  const { width, height } = useThree((state) => state.size);
  const current = useRef(1);
  const samples = useRef({ elapsed: 0, count: 0, fastWindows: 0 });
  // BOBU_ARES_STALL_RECOVERY_V1
  const stallState = useRef({ count: 0, lastAt: 0 });

  useEffect(() => {
    current.current = getDprLimit(width, height);
    onDprChange(current.current);
    markAresStage("render-dpr-initial", { dpr: current.current, width, height });
    samples.current = { elapsed: 0, count: 0, fastWindows: 0 };
  }, [width, height, onDprChange]);

  useFrame((_, delta) => {
    const sample = samples.current;
    if (document.hidden) {
      sample.elapsed = sample.count = sample.fastWindows = 0;
      stallState.current.count = 0;
      return;
    }

    if (delta > 0.25) {
      sample.elapsed = sample.count = sample.fastWindows = 0;

      if (isBobuNativeMars() && hasCoarseAresPointer()) {
        const now = performance.now();
        const stall = stallState.current;

        stall.count = now - stall.lastAt < 8000
          ? stall.count + 1
          : 1;
        stall.lastAt = now;

        if (stall.count >= 2) {
          stall.count = 0;
          const ceiling = getDprLimit(width, height);
          const floor = Math.min(ceiling, 0.9);
          const next = Math.max(floor, current.current - 0.15);

          if (next < current.current) {
            current.current = next;
            onDprChange(next);
            markAresStage("mobile-stall-dpr-recovery", {
              dpr: next,
              frameMs: delta * 1000,
            });
          }
        }
      }
      return;
    }
    sample.elapsed += delta;
    sample.count += 1;
    if (sample.elapsed < 2) return;

    const average = sample.elapsed / sample.count;
    sample.elapsed = sample.count = 0;
    const ceiling = getDprLimit(width, height);
    const floor = Math.min(ceiling, hasCoarseAresPointer() ? (isBobuNativeMars() ? 0.9 : 0.85) : 1);
    sample.fastWindows = average < 0.019 ? sample.fastWindows + 1 : 0;
    const next = average > 0.026
      ? Math.max(floor, current.current - 0.15)
      : sample.fastWindows >= 4
        ? Math.min(ceiling, current.current + 0.15)
        : current.current;

    if (next === current.current) return;
    sample.fastWindows = 0;
    current.current = next;
    onDprChange(next);
    markAresStage("render-dpr-adjusted", { dpr: next, averageFrameMs: average * 1000 });
  });

  return null;
}
