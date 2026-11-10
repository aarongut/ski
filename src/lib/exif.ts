// Shared by the site and scripts/convert.ts, so it must stay free of Astro and Vite imports.

/**
 * Camera settings stored per photo in data.json. Filled in by `vp run images` from the full-size
 * original, and only when missing, so hand edits stick. Any field can be absent.
 */
export interface Exif {
  camera?: string;
  lens?: string;
  /** Millimetres. */
  focalLength?: number;
  /** The f-number, e.g. 5.6 for f/5.6. */
  aperture?: number;
  /** As photographers write it: "1/3200", or whole seconds like "2". */
  shutter?: string;
  iso?: number;
  /** Camera-local wall-clock time, no timezone: "2026-04-10T09:58:24". */
  taken?: string;
}

/** What the lightbox shows: the gear on one line and the exposure readout on the next. */
export interface ExifDisplay {
  gear: string[];
  exposure: string[];
}

export const exifDisplay = (exif: Exif | undefined): ExifDisplay | undefined => {
  if (!exif) {
    return undefined;
  }
  const gear = [exif.camera, exif.lens].filter((part): part is string => Boolean(part));
  const exposure = [
    exif.focalLength ? `${exif.focalLength}mm` : "",
    exif.aperture ? `f/${exif.aperture}` : "",
    exif.shutter ? `${exif.shutter}s` : "",
    exif.iso ? `ISO ${exif.iso}` : "",
    exif.taken ? exif.taken.replace("T", " ").slice(0, 16) : "",
  ].filter(Boolean);
  return gear.length > 0 || exposure.length > 0 ? { gear, exposure } : undefined;
};
