import { defineConfig } from "vite-plus";
import react from "@vitejs/plugin-react";
import path from "node:path";
import { fileURLToPath } from "node:url";

const rootDir = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {},
  plugins: [
    react({
      babel: {
        // React Compiler must run first in the Babel pipeline.
        plugins: ["babel-plugin-react-compiler"],
      },
    }),
    {
      // Rolldown-vite's JSON HMR logs an update but doesn't reload the browser.
      // Force a full reload when data.json changes.
      name: "reload-data-json",
      handleHotUpdate({ file, server }) {
        if (file.endsWith("/data.json")) {
          server.ws.send({ type: "full-reload" });
          return [];
        }
      },
    },
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
});
