// Shared by the site and scripts/convert.ts, so it must stay free of Astro and Vite imports.

export const IMAGE_ROOT = "img";
export const DERIVED_DIR = "v2";

/** Long-edge sizes. Images are never upscaled, so small originals produce files at their own size. */
export const AVIF_SIZES = [480, 800, 1200, 1800, 2400, 3200] as const;
/** JPEG exists only as a fallback for browsers without AVIF and for link previews. */
export const JPEG_SIZES = [800, 1600] as const;

/** Chosen by blind test: q45 was indistinguishable from q65 and the old q70 on every sample photo. */
export const AVIF_QUALITY = 45;
export const JPEG_QUALITY = 75;

export type Format = "avif" | "jpg";

export interface Dimensions {
  width: number;
  height: number;
}

export const fitInside = ({ width, height }: Dimensions, size: number): Dimensions => {
  const longEdge = Math.max(width, height);
  if (longEdge <= size) {
    return { width, height };
  }
  const scale = size / longEdge;
  return { width: Math.round(width * scale), height: Math.round(height * scale) };
};

/** Path relative to the project root (and to the bucket root), e.g. `img/v2/800/abc.avif`. */
export const derivedPath = (src: string, size: number, format: Format): string =>
  `${IMAGE_ROOT}/${DERIVED_DIR}/${size}/${src.replace(/\.jpg$/i, `.${format}`)}`;

export const originalPath = (src: string): string => `${IMAGE_ROOT}/${src}`;

export const allDerivedPaths = (src: string): string[] => [
  ...AVIF_SIZES.map((size) => derivedPath(src, size, "avif")),
  ...JPEG_SIZES.map((size) => derivedPath(src, size, "jpg")),
];
