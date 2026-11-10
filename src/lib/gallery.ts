import galleryData from "../../data.json";
import { exifDisplay, type Exif } from "./exif.ts";
import {
  AVIF_SIZES,
  JPEG_SIZES,
  derivedPath,
  fitInside,
  originalPath,
  type Dimensions,
} from "./images.ts";

export const SITE_TITLE = "Aaron's Ski Pictures";
export const SITE_DESCRIPTION = "Mostly ski pictures, mostly in the backcountry.";
export const SITE_URL = "https://ski.aarongutierrez.com";

export interface Image extends Dimensions {
  src: string;
  exif?: Exif;
}

interface TripData {
  location: string;
  description: string;
  images: Image[];
  /** Optional `src` of the image to use as the cover; defaults to the first image. */
  cover?: string;
  /** Optional URL slug override. */
  slug?: string;
}

export interface Trip extends TripData {
  slug: string;
  title: string;
  coverImage: Image;
  /** The pre-Astro `#hash` this trip lived at, kept so old links still resolve. */
  legacyHash: string;
}

const MONTHS = [
  "january",
  "february",
  "march",
  "april",
  "may",
  "june",
  "july",
  "august",
  "september",
  "october",
  "november",
  "december",
];

const slugify = (text: string): string =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");

/** "CMH Galena" + "9-13 April 2026" → "galena-april-2026". Uses the first month and year mentioned. */
const slugFor = (trip: TripData): string => {
  if (trip.slug) {
    return trip.slug;
  }
  const place = slugify(trip.location.replace(/^CMH\s+/i, ""));
  const words = trip.description.toLowerCase().split(/[^a-z0-9]+/);
  const month = words.find((word) => MONTHS.includes(word));
  const year = words.find((word) => /^\d{4}$/.test(word));
  return [place, month, year].filter(Boolean).join("-");
};

const legacyHashFor = (trip: TripData): string =>
  `${trip.location.replace(/[^a-zA-Z0-9-_]/g, "-")}-${trip.description.replace(/[^a-zA-Z0-9-_]/g, "-")}`;

const buildTrips = (): Trip[] => {
  const seen = new Map<string, string>();
  return (galleryData as { sets: TripData[] }).sets
    .filter((trip) => trip.images.length > 0)
    .map((trip) => {
      const slug = slugFor(trip);
      const title = `${trip.location} · ${trip.description}`;
      const previous = seen.get(slug);
      if (previous) {
        throw new Error(
          `Trips "${previous}" and "${title}" both map to /${slug}; add a "slug" to one.`,
        );
      }
      seen.set(slug, title);
      const coverImage = trip.images.find((image) => image.src === trip.cover) ?? trip.images[0];
      return { ...trip, slug, title, coverImage, legacyHash: legacyHashFor(trip) };
    });
};

export const trips: Trip[] = buildTrips();

export const tripUrl = (trip: Trip): string => `/${trip.slug}`;

export const url = (path: string): string => `/${path}`;

export const avifSrcset = (image: Image): string =>
  AVIF_SIZES.map(
    (size) => `${url(derivedPath(image.src, size, "avif"))} ${fitInside(image, size).width}w`,
  ).join(", ");

export const jpegSrcset = (image: Image): string =>
  JPEG_SIZES.map(
    (size) => `${url(derivedPath(image.src, size, "jpg"))} ${fitInside(image, size).width}w`,
  ).join(", ");

const LARGEST_JPEG = JPEG_SIZES[JPEG_SIZES.length - 1];
const LARGEST_AVIF = AVIF_SIZES[AVIF_SIZES.length - 1];

export const fallbackJpeg = (image: Image): string =>
  url(derivedPath(image.src, LARGEST_JPEG, "jpg"));
export const smallJpeg = (image: Image): string =>
  url(derivedPath(image.src, JPEG_SIZES[0], "jpg"));

/** The dimensions of the largest file we serve, which is as far as the lightbox should zoom. */
export const largestDimensions = (image: Image): Dimensions => fitInside(image, LARGEST_AVIF);

export const previewImage = (image: Image) => ({
  url: `${SITE_URL}${fallbackJpeg(image)}`,
  ...fitInside(image, LARGEST_JPEG),
});

export const downloadUrl = (image: Image): string => url(originalPath(image.src));

export const aspectRatio = (image: Image): number => image.width / image.height;

/** JSON for the lightbox caption, or undefined when the photo has no camera info. */
export const exifAttribute = (image: Image): string | undefined => {
  const display = exifDisplay(image.exif);
  return display ? JSON.stringify(display) : undefined;
};
