import { describe, expect, test } from "bun:test";
import { GRID_H, GRID_W, type Mask, inkMask, normalize, otsu, segment } from "./glyphs.ts";
import type { Raster } from "./raster.ts";

/** A grey raster with grey rectangles painted on it, and coloured ones. */
function raster(w: number, h: number, ground: number, rects: [number, number, number, number, [number, number, number]][]): Raster {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) data.set([ground, ground, ground, 255], i * 4);
  for (const [x0, y0, rw, rh, colour] of rects) {
    for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) data.set([...colour, 255], (y * w + x) * 4);
  }
  return { width: w, height: h, data };
}

const inked = (m: Mask, x: number, y: number) => m.ink[y * m.w + x];

describe("otsu", () => {
  test("cuts between the two classes", () => {
    const histogram = Array.from({ length: 256 }, (_, i) => (i === 50 || i === 200 ? 100 : 0));
    const t = otsu(histogram);
    expect(t).toBeGreaterThanOrEqual(50);
    expect(t).toBeLessThan(200);
  });
});

describe("inkMask", () => {
  test("dark text on a light page is ink, the page is not", () => {
    const r = raster(20, 10, 250, [[5, 2, 3, 6, [60, 60, 60]]]);
    const m = inkMask(r, { x: 0, y: 0, w: 20, h: 10 }, "dark");
    expect(inked(m, 6, 4)).toBe(1);
    expect(inked(m, 1, 1)).toBe(0);
  });

  test("text on a grey pill: a second cut keeps the pill out of the ink", () => {
    // The page (250) at the edges, a pill (205) over most of the box, and text (110) on the pill.
    const r = raster(20, 10, 250, [
      [1, 1, 18, 8, [205, 205, 205]],
      [8, 3, 2, 4, [110, 110, 110]],
    ]);
    const m = inkMask(r, { x: 0, y: 0, w: 20, h: 10 }, "dark");
    expect(inked(m, 8, 4)).toBe(1);
    expect(inked(m, 3, 4)).toBe(0);
  });

  test("a coloured mark is never ink, however dark", () => {
    const r = raster(20, 10, 250, [
      [2, 2, 3, 6, [200, 20, 20]],
      [10, 2, 3, 6, [60, 60, 60]],
    ]);
    const m = inkMask(r, { x: 0, y: 0, w: 20, h: 10 }, "dark");
    expect(inked(m, 3, 4)).toBe(0);
    expect(inked(m, 11, 4)).toBe(1);
  });

  test("light text on a dark ground with the light polarity", () => {
    const r = raster(20, 10, 70, [[5, 2, 3, 6, [250, 250, 250]]]);
    const m = inkMask(r, { x: 0, y: 0, w: 20, h: 10 }, "light");
    expect(inked(m, 6, 4)).toBe(1);
    expect(inked(m, 1, 1)).toBe(0);
  });
});

describe("segment and normalize", () => {
  const mask: Mask = { w: 12, h: 8, ink: new Uint8Array(96) };
  for (let y = 1; y < 7; y++) {
    mask.ink[y * 12 + 2] = 1;
    mask.ink[y * 12 + 3] = 1;
    for (let x = 6; x < 10; x++) mask.ink[y * 12 + x] = y >= 5 ? 1 : 0;
  }

  test("each run of inked columns is a glyph, with the rows its ink spans", () => {
    expect(segment(mask)).toEqual([
      { x: 2, y: 1, w: 2, h: 6 },
      { x: 6, y: 5, w: 4, h: 2 },
    ]);
  });

  test("a narrow bar fills the grid's height, centred, with its proportions kept", () => {
    const [bar] = segment(mask);
    if (bar === undefined) throw new Error("no glyph");
    const cells = normalize(mask, bar);
    const at = (x: number, y: number) => cells[y * GRID_W + x];
    expect(at(GRID_W / 2, GRID_H / 2)).toBe(1);
    expect(at(0, GRID_H / 2)).toBe(0);
    expect(at(GRID_W - 1, GRID_H / 2)).toBe(0);
  });
});
