import { useLayoutEffect } from "react";
import { useThree } from "@react-three/fiber";
import { markAresStage, measureAresInterval } from "../engine/aresPerformance";

export function AresRenderDiagnostics() {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);

  useLayoutEffect(() => {
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
