import { useLayoutEffect, useRef } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import { markAresStage, measureAresInterval } from "../engine/aresPerformance";

export function AresRenderDiagnostics() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const { width, height } = useThree((state) => state.size);
  const adaptiveDpr = useThree((state) => state.viewport.dpr);
  const frameTimes = useRef<number[]>([]);
  const discardResumeFrame = useRef(false);

  useFrame((_, delta) => {
    if (document.hidden) return;
    if (discardResumeFrame.current) {
      discardResumeFrame.current = false;
      return;
    }
    frameTimes.current.push(delta * 1000);
  });

  useLayoutEffect(() => {
    const reset = () => {
      frameTimes.current.length = 0;
      discardResumeFrame.current = true;
    };
    document.addEventListener("visibilitychange", reset);

    const interval = window.setInterval(() => {
      const samples = frameTimes.current;
      if (document.hidden || samples.length === 0) return;

      samples.sort((a, b) => a - b);
      const percentile = (p: number) => samples[Math.ceil(samples.length * p) - 1];
      const context = gl.getContext();
      markAresStage("render-frame-window", {
        frames: samples.length,
        p50Ms: percentile(0.5),
        p95Ms: percentile(0.95),
        p99Ms: percentile(0.99),
        maxMs: samples[samples.length - 1],
        dpr: gl.getPixelRatio(),
        drawingBufferWidth: context.drawingBufferWidth,
        drawingBufferHeight: context.drawingBufferHeight,
        geometries: gl.info.memory.geometries,
        textures: gl.info.memory.textures,
        programs: gl.info.programs?.length ?? 0,
        drawCalls: gl.info.render.calls,
        triangles: gl.info.render.triangles,
      });
      samples.length = 0;
    }, 5000);

    return () => {
      window.clearInterval(interval);
      document.removeEventListener("visibilitychange", reset);
    };
  }, [gl]);

  useLayoutEffect(() => {
    const frame = requestAnimationFrame(() => {
      const context = gl.getContext();
      markAresStage("render-resolution", {
        cssWidth: width,
        cssHeight: height,
        devicePixelRatio: window.devicePixelRatio,
        adaptiveDpr: gl.getPixelRatio(),
        drawingBufferWidth: context.drawingBufferWidth,
        drawingBufferHeight: context.drawingBufferHeight,
        antialias: Number(context.getContextAttributes()?.antialias ?? false),
      });
    });
    return () => cancelAnimationFrame(frame);
  }, [gl, width, height, adaptiveDpr]);

  useLayoutEffect(() => {
    // WebGL interception can perturb the frame timings under investigation.
    if (new URLSearchParams(window.location.search).get("aresWebGLTrace") !== "1") return;
    const context = gl.getContext();
    const restore: (() => void)[] = [];

    type TimedCall = "bufferData" | "bufferSubData" | "compileShader" | "linkProgram"
      | "getProgramParameter" | "getShaderParameter" | "getActiveUniform" | "getActiveAttrib"
      | "texImage2D" | "texSubImage2D" | "generateMipmap";
    const calls: { key: TimedCall; count: number; durationMs: number }[] = [];

    function observeCall(key: TimedCall) {
      const stats = { key, count: 0, durationMs: 0 };
      calls.push(stats);
      const original = context[key];
      if (typeof original !== "function") return;
      const wrapped = (...args: unknown[]) => {
        const start = performance.now();
        try {
          return Reflect.apply(original, context, args);
        } finally {
          const end = performance.now();
          stats.count++;
          stats.durationMs += end - start;
          if (end - start >= 4) measureAresInterval("webgl-" + key, start, end);
        }
      };
      // Embedded browsers may expose non-writable WebGL methods.
      try {
        const descriptor = Object.getOwnPropertyDescriptor(context, key);
        Object.defineProperty(context, key, { configurable: true, writable: true, value: wrapped });
        restore.push(() => {
          if (context[key] !== wrapped) return;
          if (descriptor) Object.defineProperty(context, key, descriptor);
          else Reflect.deleteProperty(context, key);
        });
      } catch {
        markAresStage("webgl-call-diagnostics-unavailable");
      }
    }

    const timedCalls: TimedCall[] = [
      "bufferData", "bufferSubData", "compileShader", "linkProgram", "getProgramParameter",
      "getShaderParameter", "getActiveUniform", "getActiveAttrib", "texImage2D", "texSubImage2D", "generateMipmap",
    ];
    timedCalls.forEach(observeCall);
    markAresStage("renderer-diagnostics-mounted");

    const before = scene.onBeforeRender;
    const after = scene.onAfterRender;
    let start = 0;
    let previousRender: number | undefined;
    const resetCadence = () => { previousRender = undefined; };
    const contextLost = () => markAresStage("webgl-context-lost");
    const contextRestored = () => markAresStage("webgl-context-restored");
    document.addEventListener("visibilitychange", resetCadence);
    gl.domElement.addEventListener("webglcontextlost", contextLost);
    gl.domElement.addEventListener("webglcontextrestored", contextRestored);
    let geometries = 0;
    let textures = 0;
    let programs = 0;
    scene.onBeforeRender = function (...args) {
      before.apply(this, args);
      start = performance.now();
      if (!document.hidden) {
        if (previousRender !== undefined && start - previousRender > 50) {
          measureAresInterval("scene-render-gap", previousRender, start);
        }
        previousRender = start;
      }
      for (const call of calls) {
        call.count = 0;
        call.durationMs = 0;
      }
      geometries = gl.info.memory.geometries;
      textures = gl.info.memory.textures;
      programs = gl.info.programs?.length ?? 0;
    };
    scene.onAfterRender = function (...args) {
      const end = performance.now();
      const durationMs = end - start;
      const newGeometries = gl.info.memory.geometries - geometries;
      const newTextures = gl.info.memory.textures - textures;
      const newPrograms = (gl.info.programs?.length ?? 0) - programs;
      if (durationMs > 20 || newGeometries || newTextures || newPrograms) {
        const detail: Record<string, number> = { newGeometries, newTextures, newPrograms };
        for (const call of calls) {
          if (call.count === 0) continue;
          detail[call.key + "Count"] = call.count;
          detail[call.key + "Ms"] = call.durationMs;
        }
        measureAresInterval("webgl-scene-render", start, end, detail);
      }
      after.apply(this, args);
    };
    return () => {
      markAresStage("renderer-diagnostics-unmounted");
      scene.onBeforeRender = before;
      scene.onAfterRender = after;
      document.removeEventListener("visibilitychange", resetCadence);
      gl.domElement.removeEventListener("webglcontextlost", contextLost);
      gl.domElement.removeEventListener("webglcontextrestored", contextRestored);
      restore.forEach((reset) => reset());
    };
  }, [gl, scene]);

  return null;
}
