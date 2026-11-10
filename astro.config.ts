import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

import { defineConfig } from "astro/config";
import mime from "mime-types";
import type { Connect, Plugin } from "vite";

const rootDir = path.dirname(fileURLToPath(import.meta.url));
const imageDir = path.join(rootDir, "img");
const LIVE_SITE = "https://ski.aarongutierrez.com";

/** Old (pre-v2) long-edge sizes on the live site, used to stand in for v2 files in development. */
const LEGACY_SIZES = [200, 400, 600, 800, 1200, 1600, 2400];

const legacyFallback = (rel: string): string => {
  const match = /^\/v2\/(\d+)\/(.+)$/.exec(rel);
  if (!match) {
    return rel;
  }
  const size = Number(match[1]);
  const legacySize = LEGACY_SIZES.find((candidate) => candidate >= size) ?? 2400;
  return `/${legacySize}/${match[2]}`;
};

/**
 * Serves ./img at /img during development. Images live outside public/ so builds don't copy
 * hundreds of megabytes into dist/. Anything missing locally (older trips whose sources live on
 * another machine) is redirected to the closest equivalent on the live site.
 */
const imageMiddleware: Connect.NextHandleFunction = async (req, res, next) => {
  const rel = decodeURIComponent((req.url ?? "/").split("?")[0]);
  const file = path.join(imageDir, rel);
  if (!file.startsWith(imageDir + path.sep)) {
    next();
    return;
  }
  try {
    const info = await stat(file);
    if (info.isFile()) {
      res.setHeader("Content-Type", mime.lookup(file) || "application/octet-stream");
      res.setHeader("Content-Length", info.size);
      createReadStream(file).pipe(res);
      return;
    }
  } catch {
    // Not available locally; fall through to the live site.
  }
  res.statusCode = 302;
  res.setHeader("Location", `${LIVE_SITE}/img${legacyFallback(rel)}`);
  res.end();
};

const serveImages = (): Plugin => ({
  name: "ski:serve-images",
  configureServer(server) {
    server.middlewares.use("/img", imageMiddleware);
  },
});

export default defineConfig({
  site: LIVE_SITE,
  trailingSlash: "never",
  build: {
    // Pages are uploaded as extensionless S3 keys (see scripts/publish.ts), so emit galena-april-2026.html.
    format: "file",
  },
  devToolbar: { enabled: false },
  vite: {
    plugins: [serveImages()],
  },
});
