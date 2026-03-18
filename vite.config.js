import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";
var repositoryBase = process.env.GITHUB_REPOSITORY
    ? "/".concat(process.env.GITHUB_REPOSITORY.split("/")[1], "/")
    : "/";
export default defineConfig({
    base: repositoryBase,
    plugins: [react()],
    build: {
        rollupOptions: {
            output: {
                manualChunks: function (id) {
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
