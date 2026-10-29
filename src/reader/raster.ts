/**
 * An image as the browser's `ImageData` holds it: RGBA, row by row, four bytes a pixel. The reader
 * works on this shape only, so a canvas in the page and a decoded fixture in a test feed it alike.
 */
export interface Raster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}
