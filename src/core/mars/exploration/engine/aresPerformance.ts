const prefix = "ares:";

export function markAresStage(stage: string, detail?: Record<string, number>) {
  if (!import.meta.env.DEV) return;
  performance.mark(prefix + stage, { detail });
}

export function measureAresInterval(stage: string, start: number, end: number, detail?: Record<string, number>) {
  if (!import.meta.env.DEV) return;
  performance.measure(prefix + stage, { start, end, detail });
}

export function observeAresLongTasks() {
  if (!import.meta.env.DEV || typeof PerformanceObserver === "undefined") return;
  if (!PerformanceObserver.supportedEntryTypes?.includes("longtask")) return;

  const start = performance.now();
  const observer = new PerformanceObserver((list) => {
    for (const entry of list.getEntries()) {
      if (entry.startTime >= start && entry.duration > 50) {
        measureAresInterval("long-task", entry.startTime, entry.startTime + entry.duration);
      }
    }
  });
  observer.observe({ type: "longtask" });
  return () => observer.disconnect();
}

export function startAresStage(stage: string, detail?: Record<string, number>) {
  if (!import.meta.env.DEV) return;
  const startTime = performance.now();
  markAresStage(stage + "-start", detail);
  return () => {
    const end = performance.now();
    measureAresInterval(stage, startTime, end, detail);
    markAresStage(stage + "-end", { ...detail, durationMs: end - startTime });
  };
}

export function observeAresFrameGaps() {
  if (!import.meta.env.DEV) return;
  let previous: number | undefined;
  let frame: number;
  const reset = () => { previous = undefined; };
  const tick = (now: number) => {
    if (previous !== undefined && now - previous > 50 && !document.hidden) {
      measureAresInterval("foreground-raf-gap", previous, now);
    }
    previous = document.hidden ? undefined : now;
    frame = requestAnimationFrame(tick);
  };
  document.addEventListener("visibilitychange", reset);
  frame = requestAnimationFrame(tick);
  return () => {
    cancelAnimationFrame(frame);
    document.removeEventListener("visibilitychange", reset);
  };
}
