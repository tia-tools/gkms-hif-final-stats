/**
 * An image as the browser's `ImageData` holds it: RGBA, row by row, four bytes a pixel. The reader
 * works on this shape only, so a canvas in the page and a decoded fixture in a test feed it alike.
 */
export interface Raster {
  readonly width: number;
  readonly height: number;
  readonly data: Uint8ClampedArray;
}

/** Off the image, every channel is NaN, which fails every comparison a colour test makes. */
const OFF: [number, number, number] = [Number.NaN, Number.NaN, Number.NaN];

/**
 * The pixel's R, G and B, or NaN for each off the image: an index past a row's end would read the
 * next row instead, and a reader must refuse such a pixel rather than take another's colour.
 */
export function rgbAt(r: Raster, x: number, y: number): [number, number, number] {
  const px = Math.round(x);
  const py = Math.round(y);
  if (px < 0 || py < 0 || px >= r.width || py >= r.height) return OFF;
  const i = (py * r.width + px) * 4;
  return [r.data[i] ?? 0, r.data[i + 1] ?? 0, r.data[i + 2] ?? 0];
}
