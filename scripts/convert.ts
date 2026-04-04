import { createHash } from "node:crypto";
import { spawn } from "node:child_process";
import path from "node:path";
import { cp, mkdir, readFile, readdir, stat, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

const IMAGE_ROOT = "img";
const ORIGINAL_DIR = path.join(IMAGE_ROOT, "original");
const DATA_FILE = path.join(IMAGE_ROOT, "data.json");
const JPG_QUALITY = 30;
const JSON_WIDTH = 100;
const PLACEHOLDER_LOCATION = "TODO location";
const PLACEHOLDER_DESCRIPTION = "TODO description";

const IMAGE_SIZES = [2400, 1600, 1200, 800, 600, 400, 200] as const;
const WEBP_QUALITIES = new Map<number, number>([
  [2400, 50],
  [1600, 50],
  [1200, 50],
  [800, 40],
  [600, 40],
  [400, 40],
  [200, 40],
]);
const AVIF_QUALITIES = new Map<number, number>([
  [2400, 70],
  [1600, 70],
  [1200, 70],
  [800, 60],
  [600, 60],
  [400, 50],
  [200, 50],
]);

interface ManifestImage {
  src: string;
  width: number;
  height: number;
}

interface ImageSet {
  location: string;
  description: string;
  images: ManifestImage[];
}

interface GalleryData {
  sets: ImageSet[];
}

const runCommand = async (command: string, args: string[]): Promise<string> =>
  new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      cwd: process.cwd(),
      env: process.env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";

    child.stdout.on("data", (chunk) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("exit", (code) => {
      if (code === 0) {
        resolve(stdout);
        return;
      }

      reject(new Error(`${command} ${args.join(" ")} exited with code ${code}\n${stderr}`.trim()));
    });
  });

const exists = async (target: string): Promise<boolean> => {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
};

const identifyImage = async (filename: string): Promise<ManifestImage> => {
  const output = await runCommand("magick", ["identify", "-format", "%f,%w,%h", filename]);
  const [src, width, height] = output.trim().split(",");
  return {
    src,
    width: Number(width),
    height: Number(height),
  };
};

const resizeImage = async (
  source: string,
  output: string,
  size: number,
  quality: number,
): Promise<void> => {
  if (await exists(output)) {
    return;
  }

  await mkdir(path.dirname(output), { recursive: true });
  console.log(`Converting ${output}`);
  await runCommand("magick", [
    source,
    "-resize",
    `${size}x${size}`,
    "-quality",
    `${quality}`,
    output,
  ]);
};

const hashOriginal = async (source: string): Promise<string> => {
  const contents = await readFile(source);
  return createHash("md5").update(contents).digest("hex");
};

const sourceFiles = async (): Promise<string[]> => {
  const entries = await readdir(ORIGINAL_DIR, { withFileTypes: true });

  return entries
    .filter((entry) => entry.isFile() && entry.name.toLowerCase().endsWith(".jpg"))
    .map((entry) => path.join(ORIGINAL_DIR, entry.name))
    .sort((a, b) => a.localeCompare(b));
};

const processOriginal = async (source: string): Promise<ManifestImage> => {
  const hash = await hashOriginal(source);
  const hashedName = `${hash}.jpg`;
  const hashedPath = path.join(IMAGE_ROOT, hashedName);

  if (!(await exists(hashedPath))) {
    console.log(`Copying ${hashedPath}`);
    await cp(source, hashedPath);
  }

  const metadata = await identifyImage(hashedPath);

  const conversions: Promise<void>[] = [];
  for (const size of IMAGE_SIZES) {
    conversions.push(
      resizeImage(hashedPath, path.join(IMAGE_ROOT, `${size}`, hashedName), size, JPG_QUALITY),
    );
    conversions.push(
      resizeImage(
        hashedPath,
        path.join(IMAGE_ROOT, `${size}`, hashedName.replace(/\.jpg$/i, ".webp")),
        size,
        WEBP_QUALITIES.get(size) ?? 40,
      ),
    );
    conversions.push(
      resizeImage(
        hashedPath,
        path.join(IMAGE_ROOT, `${size}`, hashedName.replace(/\.jpg$/i, ".avif")),
        size,
        AVIF_QUALITIES.get(size) ?? 50,
      ),
    );
  }

  await Promise.all(conversions);
  return metadata;
};

const readGalleryData = async (): Promise<GalleryData> => {
  const contents = await readFile(DATA_FILE, "utf8");
  return JSON.parse(contents) as GalleryData;
};

const findNewImages = (existing: GalleryData, images: ManifestImage[]): ManifestImage[] => {
  const known = new Set(existing.sets.flatMap((set) => set.images.map((image) => image.src)));

  return images.filter((image) => !known.has(image.src));
};

const indent = (depth: number): string => "  ".repeat(depth);

const formatImage = (image: ManifestImage, depth: number): string =>
  `${indent(depth)}{ "src": "${image.src}", "width": ${image.width}, "height": ${image.height} }`;

const formatSet = (set: ImageSet, depth: number): string => {
  const inline = `{ "location": ${JSON.stringify(set.location)}, "description": ${JSON.stringify(
    set.description,
  )}, "images": [] }`;
  if (set.images.length === 0 && indent(depth).length + inline.length <= JSON_WIDTH) {
    return `${indent(depth)}${inline}`;
  }

  return [
    `${indent(depth)}{`,
    `${indent(depth + 1)}"location": ${JSON.stringify(set.location)},`,
    `${indent(depth + 1)}"description": ${JSON.stringify(set.description)},`,
    `${indent(depth + 1)}"images": [`,
    set.images
      .map((image, index) => {
        const suffix = index === set.images.length - 1 ? "" : ",";
        return `${formatImage(image, depth + 2)}${suffix}`;
      })
      .join("\n"),
    `${indent(depth + 1)}]`,
    `${indent(depth)}}`,
  ].join("\n");
};

const formatGalleryData = (data: GalleryData): string => {
  const sets = data.sets
    .map((set, index) => {
      const suffix = index === data.sets.length - 1 ? "" : ",";
      return `${formatSet(set, 2)}${suffix}`;
    })
    .join("\n");

  return `{\n  "sets": [\n${sets}\n  ]\n}\n`;
};

const prependPlaceholderSet = async (images: ManifestImage[]): Promise<void> => {
  const existing = await readGalleryData();
  const newImages = findNewImages(existing, images);

  if (newImages.length === 0) {
    console.log("No new images to add to img/data.json");
    return;
  }

  existing.sets.unshift({
    location: PLACEHOLDER_LOCATION,
    description: PLACEHOLDER_DESCRIPTION,
    images: newImages,
  });

  await writeFile(DATA_FILE, formatGalleryData(existing), "utf8");
  console.log(`Prepended ${newImages.length} new images to ${DATA_FILE}`);
};

export const convert = async (): Promise<void> => {
  const originals = await sourceFiles();
  const manifest: ManifestImage[] = [];

  for (const original of originals) {
    manifest.push(await processOriginal(original));
  }

  await prependPlaceholderSet(manifest);
};

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;

if (entrypoint === import.meta.url) {
  convert().catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
