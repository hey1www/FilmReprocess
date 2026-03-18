import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  // Relative asset URLs make the static build work on GitHub Pages project sites,
  // user/org sites, and custom domains without repository-specific rebuilds.
  base: "./",
  plugins: [react()],
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes("leaflet") || id.includes("react-leaflet")) {
            return "map";
          }

          if (id.includes("jszip")) {
            return "zip";
          }

          if (id.includes("node_modules")) {
            return "vendor";
          }

          return undefined;
        },
      },
    },
  },
  worker: {
    format: "es",
  },
});
