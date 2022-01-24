export const SIZES = [2400, 1600, 1200, 800, 600, 400, 200];

export const dataUrl = "img/data.json";

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
