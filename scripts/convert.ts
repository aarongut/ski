// Adds new photos and generates the web versions of every photo in data.json.
//
//   vp run images            add new originals, generate any missing web versions
//   vp run images -- --force regenerate every web version (e.g. after changing quality settings)
//   vp run images -- --no-new only process photos already in data.json; ignore img/original/
//
// New originals go in img/original/. Each is copied to img/<md5>.jpg, untouched (metadata and all),
// which is what the site's Download button serves. Web versions are written to img/v2/<size>/ with
// all metadata stripped. Photos whose img/<md5>.jpg isn't on this machine are skipped and listed.
//
// Camera settings (body, lens, focal length, aperture, shutter, ISO, time taken) are read from the
// full-size file into each photo's "exif" in data.json, only when it has none, so hand edits stick.
// Delete a photo's "exif" to read it again. Nothing else (GPS, serial numbers) is copied.

import { createHash } from "node:crypto";
import { availableParallelism } from "node:os";
import path from "node:path";
import { copyFile, mkdir, readFile, readdir, rename, rm, stat, writeFile } from "node:fs/promises";
import { pathToFileURL } from "node:url";

import exifReader from "exif-reader";
import sharp, { type Sharp } from "sharp";

import type { Exif } from "../src/lib/exif.ts";
import {
  AVIF_QUALITY,
  AVIF_SIZES,
  IMAGE_ROOT,
  JPEG_QUALITY,
  JPEG_SIZES,
  derivedPath,
  originalPath,
  type Format,
} from "../src/lib/images.ts";

const ORIGINAL_DIR = path.join(IMAGE_ROOT, "original");
const DATA_FILE = "data.json";
const JSON_WIDTH = 100;
const PLACEHOLDER_LOCATION = "TODO location";
const PLACEHOLDER_DESCRIPTION = "TODO description";
const AVIF_EFFORT = 6;
const LARGEST_SIZE = Math.max(...AVIF_SIZES, ...JPEG_SIZES);

interface ManifestImage {
  src: string;
  width: number;
  height: number;
  exif?: Exif;
}

interface ImageSet {
  location: string;
  description: string;
  images: ManifestImage[];
  [key: string]: unknown;
}

interface GalleryData {
  sets: ImageSet[];
}

interface Output {
  size: number;
  format: Format;
  file: string;
}

const exists = async (target: string): Promise<boolean> => {
  try {
    await stat(target);
    return true;
  } catch {
    return false;
  }
};

/** Runs `task` over `items` with at most `limit` running at once. */
const mapLimit = async <T, R>(
  items: T[],
  limit: number,
  task: (item: T) => Promise<R>,
): Promise<R[]> => {
  const results: R[] = [];
  let next = 0;
  const worker = async () => {
    while (next < items.length) {
      const index = next++;
      results[index] = await task(items[index]);
    }
  };
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return results;
};

// ---------------------------------------------------------------------------------------------
// New originals

const md5 = async (file: string): Promise<string> =>
  createHash("md5")
    .update(await readFile(file))
    .digest("hex");

/** Display dimensions, after applying EXIF orientation. */
const dimensionsOf = async (file: string): Promise<{ width: number; height: number }> => {
  const metadata = await sharp(file).metadata();
  const oriented = metadata.autoOrient;
  if (!oriented?.width || !oriented.height) {
    throw new Error(`Couldn't read dimensions of ${file}`);
  }
  return { width: oriented.width, height: oriented.height };
};

const ingestOriginals = async (): Promise<ManifestImage[]> => {
  if (!(await exists(ORIGINAL_DIR))) {
    return [];
  }
  const entries = await readdir(ORIGINAL_DIR, { withFileTypes: true });
  const sources = entries
    .filter((entry) => entry.isFile() && /\.jpe?g$/i.test(entry.name))
    .map((entry) => path.join(ORIGINAL_DIR, entry.name))
    .sort((a, b) => a.localeCompare(b));

  const images: ManifestImage[] = [];
  for (const source of sources) {
    const src = `${await md5(source)}.jpg`;
    const target = originalPath(src);
    if (!(await exists(target))) {
      console.log(`Copying ${source} → ${target}`);
      await copyFile(source, target);
    }
    images.push({ src, ...(await dimensionsOf(target)) });
  }
  return images;
};

// ---------------------------------------------------------------------------------------------
// Web versions

const outputsFor = (src: string): Output[] => [
  ...AVIF_SIZES.map((size) => ({
    size,
    format: "avif" as const,
    file: derivedPath(src, size, "avif"),
  })),
  ...JPEG_SIZES.map((size) => ({
    size,
    format: "jpg" as const,
    file: derivedPath(src, size, "jpg"),
  })),
];

const encode = (image: Sharp, format: Format): Sharp =>
  format === "avif"
    ? image.avif({ quality: AVIF_QUALITY, effort: AVIF_EFFORT, chromaSubsampling: "4:2:0" })
    : image.jpeg({ quality: JPEG_QUALITY, mozjpeg: true });

/** Writes via a temporary file so an interrupted run never leaves a truncated image behind. */
const writeAtomically = async (file: string, image: Sharp): Promise<void> => {
  await mkdir(path.dirname(file), { recursive: true });
  const temporary = `${file}.tmp-${process.pid}`;
  try {
    await image.toFile(temporary);
    await rename(temporary, file);
  } catch (error) {
    await rm(temporary, { force: true });
    throw error;
  }
};

const generate = async (src: string, force: boolean): Promise<number> => {
  const outputs = outputsFor(src);
  const pending = force
    ? outputs
    : (
        await Promise.all(
          outputs.map(async (output) => ((await exists(output.file)) ? null : output)),
        )
      ).filter((output): output is Output => output !== null);
  if (pending.length === 0) {
    return 0;
  }

  // Decode the (often 50+ megapixel) original once, then make every size from a 3200px copy.
  // sharp drops all metadata from its output by default and converts to sRGB.
  const { data, info } = await sharp(originalPath(src))
    .autoOrient()
    .resize(LARGEST_SIZE, LARGEST_SIZE, { fit: "inside", withoutEnlargement: true })
    .raw()
    .toBuffer({ resolveWithObject: true });
  const raw = { width: info.width, height: info.height, channels: info.channels };

  for (const output of pending) {
    const resized = sharp(data, { raw }).resize(output.size, output.size, {
      fit: "inside",
      withoutEnlargement: true,
    });
    await writeAtomically(output.file, encode(resized, output.format));
  }
  return pending.length;
};

// ---------------------------------------------------------------------------------------------
// Camera settings

const MAKES: Record<string, string> = {
  SONY: "Sony",
  CANON: "Canon",
  NIKON: "Nikon",
  "NIKON CORPORATION": "Nikon",
  FUJIFILM: "Fujifilm",
  "OLYMPUS CORPORATION": "Olympus",
  "OLYMPUS IMAGING CORP.": "Olympus",
  "OM DIGITAL SOLUTIONS": "OM System",
  PANASONIC: "Panasonic",
  "RICOH IMAGING COMPANY, LTD.": "Ricoh",
  APPLE: "Apple",
  GOPRO: "GoPro",
  "LEICA CAMERA AG": "Leica",
  DJI: "DJI",
};

const ROMAN = ["", "I", "II", "III", "IV", "V", "VI", "VII"];

/** Sony writes model codes: ILCE-7RM4 → A7R IV, ILCE-7M3 → A7 III, ILCE-6400 → A6400. */
const sonyModel = (model: string): string => {
  const match = /^ILCE-(\d+)([A-Z]*?)(?:M(\d+))?([A-Z]?)$/.exec(model);
  if (!match) {
    return model;
  }
  const [, number, letters, generation, suffix] = match;
  const roman = generation ? ` ${ROMAN[Number(generation)] ?? `M${generation}`}` : "";
  return `A${number}${letters}${roman}${suffix}`;
};

const cameraName = (
  rawMake: string | undefined,
  rawModel: string | undefined,
): string | undefined => {
  const make = rawMake?.trim() ?? "";
  const model = rawModel?.trim() ?? "";
  if (!model) {
    return undefined;
  }
  const brand = MAKES[make.toUpperCase()] ?? make;
  const name = brand === "Sony" ? sonyModel(model) : model;
  if (!brand || name.toLowerCase().startsWith(brand.toLowerCase())) {
    return name;
  }
  return `${brand} ${name}`;
};

const roundTo = (value: number, places: number): number => Number(value.toFixed(places));

const shutterSpeed = (seconds: number): string =>
  seconds < 1 ? `1/${Math.round(1 / seconds)}` : `${roundTo(seconds, 1)}`;

const isUsefulLens = (lens: string): boolean =>
  lens.length > 0 && !/^-+$/.test(lens) && !/\b0(\.0)? ?mm\b/i.test(lens);

/** Reads the handful of fields the lightbox shows. Missing or unreadable fields are left out. */
const readExif = async (file: string): Promise<Exif> => {
  const { exif: buffer } = await sharp(file).metadata();
  if (!buffer) {
    return {};
  }
  let tags: ReturnType<typeof exifReader>;
  try {
    tags = exifReader(buffer);
  } catch {
    return {};
  }
  const image = tags.Image ?? {};
  const photo = tags.Photo ?? {};
  const exif: Exif = {};

  const camera = cameraName(image.Make, image.Model);
  if (camera) {
    exif.camera = camera;
  }
  const lens = typeof photo.LensModel === "string" ? photo.LensModel.trim() : "";
  if (isUsefulLens(lens)) {
    exif.lens = lens;
  }
  if (photo.FocalLength && photo.FocalLength > 0) {
    exif.focalLength = roundTo(photo.FocalLength, 1);
  }
  if (photo.FNumber && photo.FNumber > 0) {
    exif.aperture = roundTo(photo.FNumber, 1);
  }
  if (photo.ExposureTime && photo.ExposureTime > 0) {
    exif.shutter = shutterSpeed(photo.ExposureTime);
  }
  const iso = Array.isArray(photo.ISOSpeedRatings)
    ? photo.ISOSpeedRatings[0]
    : photo.ISOSpeedRatings;
  if (typeof iso === "number" && iso > 0) {
    exif.iso = iso;
  }
  // exif-reader returns the camera's local wall-clock time labelled as UTC, so the UTC fields are
  // exactly what the camera recorded.
  const taken = photo.DateTimeOriginal;
  if (taken instanceof Date && !Number.isNaN(taken.getTime())) {
    exif.taken = taken.toISOString().slice(0, 19);
  }
  return exif;
};

/** Adds "exif" to photos that don't have it yet and whose full-size file is here. */
const fillExif = async (data: GalleryData): Promise<number> => {
  let filled = 0;
  for (const set of data.sets) {
    for (const image of set.images) {
      if (image.exif === undefined && (await exists(originalPath(image.src)))) {
        image.exif = await readExif(originalPath(image.src));
        filled++;
      }
    }
  }
  return filled;
};

// ---------------------------------------------------------------------------------------------
// data.json

const readGalleryData = async (): Promise<GalleryData> =>
  JSON.parse(await readFile(DATA_FILE, "utf8")) as GalleryData;

const indent = (depth: number): string => "  ".repeat(depth);

const formatInline = (object: object): string => {
  const entries = Object.entries(object).filter(([, value]) => value !== undefined);
  if (entries.length === 0) {
    return "{}";
  }
  return `{ ${entries.map(([key, value]) => `${JSON.stringify(key)}: ${JSON.stringify(value)}`).join(", ")} }`;
};

/** One photo per line, so data.json stays easy to reorder and edit by hand. */
const formatImage = (image: ManifestImage, depth: number): string => {
  const { exif, ...rest } = image;
  const fields = formatInline(rest).slice(0, -2);
  return `${indent(depth)}${fields}${exif ? `, "exif": ${formatInline(exif)}` : ""} }`;
};

const formatSet = (set: ImageSet, depth: number): string => {
  const { location, description, images, ...extra } = set;
  const extraLines = Object.entries(extra).map(
    ([key, value]) => `${indent(depth + 1)}${JSON.stringify(key)}: ${JSON.stringify(value)},`,
  );
  const inline = `{ "location": ${JSON.stringify(location)}, "description": ${JSON.stringify(
    description,
  )}, "images": [] }`;
  if (
    images.length === 0 &&
    extraLines.length === 0 &&
    indent(depth).length + inline.length <= JSON_WIDTH
  ) {
    return `${indent(depth)}${inline}`;
  }

  return [
    `${indent(depth)}{`,
    `${indent(depth + 1)}"location": ${JSON.stringify(location)},`,
    `${indent(depth + 1)}"description": ${JSON.stringify(description)},`,
    ...extraLines,
    `${indent(depth + 1)}"images": [`,
    images
      .map(
        (image, index) =>
          `${formatImage(image, depth + 2)}${index === images.length - 1 ? "" : ","}`,
      )
      .join("\n"),
    `${indent(depth + 1)}]`,
    `${indent(depth)}}`,
  ].join("\n");
};

const formatGalleryData = (data: GalleryData): string => {
  const sets = data.sets
    .map((set, index) => `${formatSet(set, 2)}${index === data.sets.length - 1 ? "" : ","}`)
    .join("\n");
  return `{\n  "sets": [\n${sets}\n  ]\n}\n`;
};

/** Adds originals that aren't in data.json yet as a new placeholder trip at the top. */
const addNewImages = (data: GalleryData, ingested: ManifestImage[]): number => {
  const known = new Set(data.sets.flatMap((set) => set.images.map((image) => image.src)));
  const newImages = ingested.filter((image) => !known.has(image.src));
  if (newImages.length > 0) {
    data.sets.unshift({
      location: PLACEHOLDER_LOCATION,
      description: PLACEHOLDER_DESCRIPTION,
      images: newImages,
    });
    console.log(`Added ${newImages.length} new photos under "${PLACEHOLDER_LOCATION}".`);
  }
  return newImages.length;
};

// ---------------------------------------------------------------------------------------------

export const convert = async ({ force = false, addNew = true } = {}): Promise<void> => {
  const data = await readGalleryData();
  const added = addNew ? addNewImages(data, await ingestOriginals()) : 0;
  const withExif = await fillExif(data);
  if (withExif > 0) {
    console.log(`Read camera settings for ${withExif} photos.`);
  }
  if (added > 0 || withExif > 0) {
    await writeFile(DATA_FILE, formatGalleryData(data), "utf8");
  }

  const all = data.sets.flatMap((set) => set.images.map((image) => image.src));
  const available: string[] = [];
  const missing: string[] = [];
  for (const src of all) {
    ((await exists(originalPath(src))) ? available : missing).push(src);
  }

  // sharp already uses several threads per image; a few images at a time keeps every core busy.
  const concurrency = Math.max(1, Math.floor(availableParallelism() / 4));
  let done = 0;
  let written = 0;
  await mapLimit(available, concurrency, async (src) => {
    const count = await generate(src, force);
    written += count;
    done++;
    if (count > 0) {
      console.log(`[${done}/${available.length}] ${src}: wrote ${count} files`);
    }
  });

  console.log(`Wrote ${written} files for ${available.length} photos.`);
  if (missing.length > 0) {
    console.log(
      `Skipped ${missing.length} photos whose full-size file (img/<hash>.jpg) isn't on this machine. ` +
        `Run this where those files live.`,
    );
  }
};

const entrypoint = process.argv[1] ? pathToFileURL(path.resolve(process.argv[1])).href : null;

if (entrypoint === import.meta.url) {
  convert({
    force: process.argv.includes("--force"),
    addNew: !process.argv.includes("--no-new"),
  }).catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  });
}
