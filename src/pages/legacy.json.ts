import type { APIRoute } from "astro";
import { tripUrl, trips } from "../lib/gallery.ts";

/** Maps the old single-page site's #hashes to their new URLs. Used by the home page's redirect script. */
export const GET: APIRoute = () => {
  const redirects: Record<string, string> = {};
  for (const trip of trips) {
    redirects[trip.legacyHash] = tripUrl(trip);
    for (const image of trip.images) {
      redirects[image.src] = `${tripUrl(trip)}#${image.src}`;
    }
  }
  return new Response(JSON.stringify(redirects), {
    headers: { "Content-Type": "application/json" },
  });
};
