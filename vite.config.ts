import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";

const resolveVendorChunk = (
  moduleId: string,
): string | undefined => {
  if (!moduleId.includes("node_modules")) {
    return undefined;
  }

  if (
    moduleId.includes("/react/") ||
    moduleId.includes("/react-dom/") ||
    moduleId.includes("/react-router/") ||
    moduleId.includes("/react-router-dom/")
  ) {
    return "vendor-react";
  }

  if (
    moduleId.includes("/@supabase/") ||
    moduleId.includes("/supabase-js/")
  ) {
    return "vendor-supabase";
  }

  if (moduleId.includes("/framer-motion/")) {
    return "vendor-motion";
  }

  if (moduleId.includes("/lucide-react/")) {
    return "vendor-icons";
  }

  if (moduleId.includes("/html-to-image/")) {
    return "vendor-image";
  }

  if (moduleId.includes("/zustand/")) {
    return "vendor-state";
  }

  /*
   * Mars / Three runtime is deliberately split.
   *
   * Order matters:
   * postprocessing must be detected before the generic
   * @react-three rule.
   */

  if (
    moduleId.includes("/@react-three/postprocessing/") ||
    moduleId.includes("/postprocessing/")
  ) {
    return "vendor-postprocessing";
  }

  /*
   * Three example/addon modules can be large and are not part
   * of the minimal renderer core.
   */
  if (
    moduleId.includes("/three/examples/jsm/") ||
    moduleId.includes("/three/addons/")
  ) {
    return "vendor-three-extras";
  }

  /*
   * React Three Fiber + Drei.
   */
  if (
    moduleId.includes("/@react-three/fiber/") ||
    moduleId.includes("/@react-three/drei/")
  ) {
    return "vendor-react-three";
  }

  /*
   * Three.js core.
   */
  if (moduleId.includes("/three/")) {
    return "vendor-three-core";
  }

  /*
   * Supporting Three ecosystem libraries.
   */
  if (
    moduleId.includes("/three-stdlib/") ||
    moduleId.includes("/camera-controls/") ||
    moduleId.includes("/maath/") ||
    moduleId.includes("/meshline/") ||
    moduleId.includes("/three-mesh-bvh/") ||
    moduleId.includes("/troika-three-") ||
    moduleId.includes("/stats-gl/")
  ) {
    return "vendor-three-support";
  }

  /*
   * Let Rollup decide the remaining shared modules instead of
   * forcing every dependency into one generic vendor chunk.
   * This prevents circular vendor relationships introduced by
   * the optional Mars 3D runtime.
   */
  return undefined;
};

export default defineConfig({
  base: "/",

  plugins: [
    react(),
    tailwindcss(),
  ],

  build: {
    rollupOptions: {
      output: {
        manualChunks: resolveVendorChunk,
      },
    },
  },
});
