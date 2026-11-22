import { markAresStage } from "../engine/aresPerformance";
import { useEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";

export function hasCoarseAresPointer() {
  return window.matchMedia("(pointer: coarse), (max-width: 900px)").matches;
}

function getDprLimit(width: number, height: number) {
  const mobile = hasCoarseAresPointer();
  const pixelBudget = mobile ? 1_650_000 : 3_200_000;
  return Math.min(
    window.devicePixelRatio || 1,
    mobile ? 1.6 : 2,
    Math.sqrt(pixelBudget / Math.max(1, width * height)),
  );
}

export function AresRenderQuality({ onDprChange }: { onDprChange: (dpr: number) => void }) {
  const { width, height } = useThree((state) => state.size);
  const current = useRef(1);
  const samples = useRef({ elapsed: 0, count: 0, fastWindows: 0 });

  useEffect(() => {
    current.current = getDprLimit(width, height);
    onDprChange(current.current);
    markAresStage("render-dpr-initial", { dpr: current.current, width, height });
    samples.current = { elapsed: 0, count: 0, fastWindows: 0 };
  }, [width, height, onDprChange]);

  useFrame((_, delta) => {
    const sample = samples.current;
    if (document.hidden || delta > 0.25) {
      sample.elapsed = sample.count = sample.fastWindows = 0;
      return;
    }
    sample.elapsed += delta;
    sample.count += 1;
    if (sample.elapsed < 2) return;

    const average = sample.elapsed / sample.count;
    sample.elapsed = sample.count = 0;
    const ceiling = getDprLimit(width, height);
    const floor = Math.min(ceiling, hasCoarseAresPointer() ? 0.9 : 1);
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
