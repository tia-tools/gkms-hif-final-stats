import { describe, expect, test } from "bun:test";
import { rgbAt } from "./raster.ts";

describe("rgbAt", () => {
  // 2 × 2: red, green / blue, white.
  const r = { width: 2, height: 2, data: new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]) };

  test("reads a pixel, rounding its coordinates", () => {
    expect(rgbAt(r, 1, 0)).toEqual([0, 255, 0]);
    expect(rgbAt(r, 0.4, 1.4)).toEqual([0, 0, 255]);
  });

  test("off the image every channel is NaN, never the next row's pixel", () => {
    // (2, 0) would be (0, 1), blue, if the index were allowed to run past the row's end.
    for (const [x, y] of [[2, 0], [-1, 0], [0, 2], [0, -1]]) expect(rgbAt(r, x ?? 0, y ?? 0).every(Number.isNaN)).toBe(true);
  });
});
