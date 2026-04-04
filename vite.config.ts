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
  ],
  resolve: {
    alias: {
      "@": path.resolve(rootDir, "src"),
    },
  },
});
