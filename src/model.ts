export const SIZES = [1600, 1200, 800, 600, 400, 200];

export function dataUrl() {
  return window.location.host === "ski.aarongutierrez.com"
    ? "https://s3-us-west-2.amazonaws.com/ski.aarongutierrez.com/img/data.json"
    : "img/data.json";
}

export interface Data {
  sets: ImageSet[];
}

export interface ImageSet {
  location: string;
  description: string;
  images: Image[];
}

export interface Image {
  src: string;
  height: number;
  width: number;
}
