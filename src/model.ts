export const SIZES = [1600, 1200, 800, 600, 400, 200];
export const URL = "img/data.json";

export interface Images {
    [name: string]: Image
}

export interface Image {
    height: number;
    width: number;
}
