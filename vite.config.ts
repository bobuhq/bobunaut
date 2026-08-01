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

  return "vendor";
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
