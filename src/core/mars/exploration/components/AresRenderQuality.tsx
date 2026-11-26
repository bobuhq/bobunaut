import { markAresStage } from "../engine/aresPerformance";
import { useEffect, useMemo, useRef, type RefObject } from "react";
import { useFrame, useThree } from "@react-three/fiber";

export function hasCoarseAresPointer() {
  return window.matchMedia("(pointer: coarse), (max-width: 900px)").matches;
}


function isBobuNativeMars(): boolean {
  return typeof window !== "undefined" &&
    window.location.pathname.startsWith("/mars") &&
    navigator.userAgent.includes("BOBU-Mobile");
}

export function usesAresMobileVisuals() {
  return isBobuNativeMars() && hasCoarseAresPointer();
}

// ARES V26 Android safe rendering.
export function usesAresAndroidSafeRendering(): boolean {
  return typeof navigator !== "undefined" &&
    /Android/i.test(navigator.userAgent);
}

function androidRenderPolicy() {
  const memory = (navigator as Navigator & {
    deviceMemory?: number;
  }).deviceMemory;

  const cores = navigator.hardwareConcurrency;

  const weak =
    !Number.isFinite(memory) ||
    !Number.isFinite(cores) ||
    (memory ?? 0) <= 4 ||
    cores <= 4;

  return weak
    ? { ceiling: 0.5, floor: 0.4, budget: 200_000 }
    : { ceiling: 0.75, floor: 0.5, budget: 350_000 };
}

function androidDprCeiling(width: number, height: number) {
  const policy = androidRenderPolicy();

  return Math.min(
    window.devicePixelRatio || 1,
    policy.ceiling,
    Math.sqrt(policy.budget / Math.max(1, width * height)),
  );
}

export function getAresInitialDpr(): number {
  if (!usesAresAndroidSafeRendering()) return 1;

  return androidDprCeiling(
    window.innerWidth,
    window.innerHeight,
  );
}

const WALKING_PIXEL_BUDGET = 1_600_000;
const NATIVE_HD_PIXEL_BUDGET = 2_200_000;
const WALKING_PREFERRED_DPR = 1.25;
const WALKING_UPGRADE_DELAY_SECONDS = 30;

function getDprLimit(width: number, height: number, mobileOutdoorWalking: boolean) {
  if (usesAresAndroidSafeRendering()) {
    return androidDprCeiling(width, height);
  }

  const mobile = hasCoarseAresPointer();
  const nativeMobile = mobile && isBobuNativeMars();
  if (mobileOutdoorWalking) {
    return Math.min(
      window.devicePixelRatio || 1,
      nativeMobile ? 1.75 : 1.5,
      Math.sqrt(
        (nativeMobile ? NATIVE_HD_PIXEL_BUDGET : WALKING_PIXEL_BUDGET) /
        Math.max(1, width * height),
      ),
    );
  }

  const pixelBudget = mobile ? (nativeMobile ? 1_650_000 : 1_300_000) : 3_200_000;
  return Math.min(
    window.devicePixelRatio || 1,
    mobile ? (nativeMobile ? 1.75 : 1.5) : 2,
    Math.sqrt(pixelBudget / Math.max(1, width * height)),
  );
}

export function AresRenderQuality({
  onDprChange,
  outdoorWalkingCheck,
}: {
  onDprChange: (dpr: number) => void;
  outdoorWalkingCheck: RefObject<(() => boolean) | null>;
}) {
  const { width, height } = useThree((state) => state.size);
  const coarsePointer = useMemo(() => window.matchMedia("(pointer: coarse)"), []);
  const current = useRef<number | null>(null);
  const samples = useRef({ elapsed: 0, count: 0, fastWindows: 0 });
  const wasMobileOutdoorWalking = useRef(false);
  const walkingSeconds = useRef(0);
  // BOBU_ARES_STALL_RECOVERY_V1
  const stallState = useRef({ count: 0, lastAt: 0, recovering: false });

  useEffect(() => {
    const walking = wasMobileOutdoorWalking.current;
    const ceiling = getDprLimit(width, height, walking);
    // Resizing can tighten the ceiling, but recovery still requires fast frames.
    current.current = Math.min(current.current ?? ceiling, ceiling);
    onDprChange(current.current);
    markAresStage("render-dpr-initial", { dpr: current.current, width, height });
    samples.current = { elapsed: 0, count: 0, fastWindows: 0 };
  }, [width, height, onDprChange]);

  const discardResumeFrame = useRef(false);
  useEffect(() => {
    const onVisibilityChange = () => {
      discardResumeFrame.current = true;
      samples.current = { elapsed: 0, count: 0, fastWindows: 0 };
      stallState.current.count = 0;
    };
    document.addEventListener("visibilitychange", onVisibilityChange);
    return () => document.removeEventListener("visibilitychange", onVisibilityChange);
  }, []);

  useFrame((_, delta) => {
    if (discardResumeFrame.current && !document.hidden) {
      discardResumeFrame.current = false;
      return;
    }
    let dpr = current.current;
    if (dpr === null) return;
    const sample = samples.current;
    if (document.hidden) {
      sample.elapsed = sample.count = sample.fastWindows = 0;
      stallState.current.count = 0;
      return;
    }

    // Android quality remains conservative across flight,
    // landing, interior and walking transitions.
    if (usesAresAndroidSafeRendering()) {
      const ceiling = androidDprCeiling(width, height);
      const floor = Math.min(ceiling, androidRenderPolicy().floor);

      // Never exceed the safe pixel budget.
      if (dpr > ceiling) {
        current.current = ceiling;
        onDprChange(ceiling);
        sample.elapsed = sample.count = 0;
        return;
      }

      // Foreground stalls and sustained slow rendering
      // may lower resolution but never raise it.
      sample.elapsed += Math.min(delta, 0.25);
      sample.count += 1;

      if (sample.elapsed >= 2) {
        const average = sample.elapsed / sample.count;
        sample.elapsed = sample.count = 0;

        if (average > 0.04) {
          const next = Math.min(
            dpr,
            Math.max(floor, dpr - 0.1),
          );

          if (next < dpr) {
            current.current = next;
            onDprChange(next);

            markAresStage("android-safe-dpr-reduced", {
              dpr: next,
              averageFrameMs: average * 1000,
            });
          }
        }
      }

      return;
    }

    const checkOutdoorWalking = outdoorWalkingCheck.current;
    const mobileOutdoorWalking = checkOutdoorWalking !== null &&
      coarsePointer.matches && checkOutdoorWalking();
    if (mobileOutdoorWalking !== wasMobileOutdoorWalking.current) {
      sample.elapsed = sample.count = sample.fastWindows = 0;
      stallState.current.count = 0;
      wasMobileOutdoorWalking.current = mobileOutdoorWalking;
      walkingSeconds.current = 0;
      stallState.current.recovering = false;
      if (mobileOutdoorWalking) {
        const ceiling = getDprLimit(width, height, true);
        if (dpr > ceiling) {
          dpr = current.current = ceiling;
          onDprChange(ceiling);
        }
        markAresStage("mobile-walking-dpr-policy", {
          dpr,
          ceiling,
          pixelBudget: WALKING_PIXEL_BUDGET,
        });
      }
    }

    if (delta > 0.25) {
      sample.fastWindows = 0;

      const nativeMobile = usesAresMobileVisuals();
      if (nativeMobile || mobileOutdoorWalking) {
        sample.elapsed = sample.count = 0;
        const now = performance.now();
        const stall = stallState.current;

        stall.count = now - stall.lastAt < 8000
          ? stall.count + 1
          : 1;
        stall.lastAt = now;

        if (stall.count >= 2) {
          stall.count = 0;
          const ceiling = getDprLimit(width, height, mobileOutdoorWalking);
          const floor = Math.min(ceiling, nativeMobile ? 0.9 : 0.85);
          const reduced = Math.max(floor, dpr - 0.15);
          const next = mobileOutdoorWalking ? Math.min(ceiling, reduced) : reduced;

          if (next < dpr) {
            stall.recovering = mobileOutdoorWalking;
            if (mobileOutdoorWalking) walkingSeconds.current = 0;
            current.current = next;
            onDprChange(next);
            markAresStage("mobile-stall-dpr-recovery", {
              dpr: next,
              frameMs: delta * 1000,
            });
          }
        }
        return;
      }
      // Repeated foreground desktop stalls are evidence of slow frames.
      // Bound their weight so one long foreground gap cannot set the DPR.
      delta = 0.25;
    }
    if (mobileOutdoorWalking) walkingSeconds.current += delta;
    sample.elapsed += delta;
    sample.count += 1;
    if (sample.elapsed < 2) return;

    const average = sample.elapsed / sample.count;
    const canUpgrade = !mobileOutdoorWalking ||
      walkingSeconds.current - sample.elapsed >= WALKING_UPGRADE_DELAY_SECONDS;
    sample.elapsed = sample.count = 0;
    const ceiling = getDprLimit(width, height, mobileOutdoorWalking);
    const preferredFloor = mobileOutdoorWalking || !hasCoarseAresPointer()
      ? 1
      : isBobuNativeMars() ? 0.9 : 0.85;
    const floor = Math.min(ceiling, preferredFloor);
    const approachingPreferredDpr = mobileOutdoorWalking &&
      !stallState.current.recovering && dpr >= 1 && dpr < WALKING_PREFERRED_DPR;
    // Keep the stricter gate after a stall and above the preferred target.
    const fastThreshold = approachingPreferredDpr ? 0.022 : 0.019;
    const requiredFastWindows = approachingPreferredDpr ? 2 : 4;
    const upgradeCeiling = approachingPreferredDpr ? Math.min(ceiling, WALKING_PREFERRED_DPR) : ceiling;
    // Start counting recovery windows after the walking scene has settled.
    sample.fastWindows = canUpgrade && average < fastThreshold ? sample.fastWindows + 1 : 0;
    const adjusted = average > 0.026
      ? Math.max(floor, dpr - 0.15)
      : sample.fastWindows >= requiredFastWindows
        ? Math.min(upgradeCeiling, dpr + 0.15)
        : dpr;
    // A slow window cannot raise DPR from below the usual floor.
    const next = Math.min(ceiling, average > 0.026 ? Math.min(dpr, adjusted) : adjusted);

    if (next === dpr) return;
    if (mobileOutdoorWalking && next < dpr) walkingSeconds.current = 0;
    if (next > dpr) stallState.current.recovering = false;
    sample.fastWindows = 0;
    current.current = next;
    onDprChange(next);
    markAresStage("render-dpr-adjusted", { dpr: next, averageFrameMs: average * 1000 });
  });

  return null;
}
