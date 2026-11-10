// Vite+ configuration for formatting, linting and the pre-commit hook. The site itself is built by
// Astro (see astro.config.ts), run through `vp run dev` / `vp run build`.
import { defineConfig } from "vite-plus";

export default defineConfig({
  staged: {
    "*": "vp check --fix",
  },
  fmt: {
    // scripts/convert.ts writes data.json with one photo per line; don't reflow it.
    ignorePatterns: ["data.json"],
  },
  lint: {
    ignorePatterns: ["dist/**", ".astro/**"],
    options: {
      typeAware: true,
      typeCheck: true,
    },
  },
});
