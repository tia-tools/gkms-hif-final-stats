/**
 * Glyphs from a box of a screenshot: which pixels are ink, where each character sits, and its shape
 * on a fixed grid, ready to compare with a template. Pure.
 *
 * Every number the reader wants is drawn in a neutral grey or white, while what surrounds it (stat
 * labels, rank badges, the bonus chevrons, card art at the edges) is coloured. So a pixel is ink
 * only if its saturation is low, and its brightness is on the text's side of a threshold chosen per
 * box by Otsu's method.
 */

import type { Raster } from "./raster.ts";

/** A rectangle in pixels of the screenshot. */
export interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

/** "dark": dark text on a light ground (stats, counts); "light": white text (item digits, Lv). */
export type Polarity = "dark" | "light";

export const GRID_W = 12;
export const GRID_H = 16;

/** Above this (max − min of R, G, B) a pixel is colour, never ink. */
const SATURATION_MAX = 60;

export interface Mask {
  w: number;
  h: number;
  /** 1 where the pixel is ink, row by row. */
  ink: Uint8Array;
}

function luminance(r: number, g: number, b: number): number {
  return (299 * r + 587 * g + 114 * b) / 1000;
}

/** Otsu's threshold over a 256-bin histogram: the cut that best separates two classes. */
export function otsu(histogram: readonly number[]): number {
  const total = histogram.reduce((a, b) => a + b, 0);
  const sum = histogram.reduce((a, n, i) => a + n * i, 0);
  let best = 0;
  let bestVariance = -1;
  let below = 0;
  let belowSum = 0;
  for (let t = 0; t < 256; t++) {
    below += histogram[t] ?? 0;
    belowSum += (histogram[t] ?? 0) * t;
    const above = total - below;
    if (below === 0 || above === 0) continue;
    const meanBelow = belowSum / below;
    const meanAbove = (sum - belowSum) / above;
    const variance = below * above * (meanBelow - meanAbove) ** 2;
    if (variance > bestVariance) {
      bestVariance = variance;
      best = t;
    }
  }
  return best;
}

/** The box clipped to the image. */
export function clip(r: Raster, box: Box): Box {
  const x = Math.max(0, Math.round(box.x));
  const y = Math.max(0, Math.round(box.y));
  const x1 = Math.min(r.width, Math.round(box.x + box.w));
  const y1 = Math.min(r.height, Math.round(box.y + box.h));
  return { x, y, w: Math.max(0, x1 - x), h: Math.max(0, y1 - y) };
}

/** The neutral pixels' luminances in the box, NaN where a pixel is coloured or transparent. */
function neutralLuminance(r: Raster, box: Box): Float32Array {
  const out = new Float32Array(box.w * box.h);
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const i = ((box.y + y) * r.width + box.x + x) * 4;
      const R = r.data[i] ?? 0;
      const G = r.data[i + 1] ?? 0;
      const B = r.data[i + 2] ?? 0;
      const opaque = (r.data[i + 3] ?? 0) >= 128;
      const neutral = Math.max(R, G, B) - Math.min(R, G, B) <= SATURATION_MAX;
      out[y * box.w + x] = opaque && neutral ? luminance(R, G, B) : Number.NaN;
    }
  }
  return out;
}

function histogramOf(lum: Float32Array, keep: (v: number) => boolean): number[] {
  const histogram = Array.from({ length: 256 }, () => 0);
  for (const v of lum) if (!Number.isNaN(v) && keep(v)) histogram[Math.round(v)] = (histogram[Math.round(v)] ?? 0) + 1;
  return histogram;
}

/** Text covers well under this share of a field's box; more means the cut fell between two grounds. */
const INK_SHARE_MAX = 0.45;

/**
 * Ink in the box: neutral pixels on the text's side of the box's Otsu threshold. A box can hold two
 * grounds, such as the page and the grey pill behind a bonus: then the first cut separates the
 * grounds, and a second cut, within the text's side, separates the text.
 */
export function inkMask(r: Raster, box: Box, polarity: Polarity): Mask {
  const clipped = clip(r, box);
  const lum = neutralLuminance(r, clipped);
  const side = (t: number) => (v: number) => !Number.isNaN(v) && (polarity === "dark" ? v <= t : v > t);
  let t = otsu(histogramOf(lum, () => true));
  const neutral = lum.filter((v) => !Number.isNaN(v)).length;
  if (lum.filter(side(t)).length > INK_SHARE_MAX * neutral) t = otsu(histogramOf(lum, side(t)));
  const ink = Uint8Array.from(lum, (v) => (side(t)(v) ? 1 : 0));
  return { w: clipped.w, h: clipped.h, ink };
}

/** Each run of columns holding ink, with the rows its ink spans, in the mask's coordinates. */
export function segment(mask: Mask): Box[] {
  const out: Box[] = [];
  let start = -1;
  const columnHasInk = (x: number) => {
    for (let y = 0; y < mask.h; y++) if (mask.ink[y * mask.w + x] === 1) return true;
    return false;
  };
  for (let x = 0; x <= mask.w; x++) {
    const ink = x < mask.w && columnHasInk(x);
    if (ink && start < 0) start = x;
    if (!ink && start >= 0) {
      out.push(rowsOf(mask, start, x));
      start = -1;
    }
  }
  return out;
}

function rowsOf(mask: Mask, x0: number, x1: number): Box {
  let top = mask.h;
  let bottom = -1;
  for (let y = 0; y < mask.h; y++) {
    for (let x = x0; x < x1; x++) {
      if (mask.ink[y * mask.w + x] === 1) {
        top = Math.min(top, y);
        bottom = Math.max(bottom, y);
      }
    }
  }
  return { x: x0, y: top, w: x1 - x0, h: bottom - top + 1 };
}

interface Fit {
  scale: number;
  offsetX: number;
  offsetY: number;
}

/** The share of ink among 4 × 4 samples of grid cell (cx, cy), mapped back into the mask. */
function cellShare(mask: Mask, glyph: Box, fit: Fit, cx: number, cy: number): number {
  let hits = 0;
  for (let s = 0; s < 16; s++) {
    const x = Math.floor(glyph.x + (cx + ((s % 4) + 0.5) / 4 - fit.offsetX) / fit.scale);
    const y = Math.floor(glyph.y + (cy + (Math.floor(s / 4) + 0.5) / 4 - fit.offsetY) / fit.scale);
    const inside = x >= glyph.x && x < glyph.x + glyph.w && y >= glyph.y && y < glyph.y + glyph.h;
    if (inside && mask.ink[y * mask.w + x] === 1) hits++;
  }
  return hits / 16;
}

/**
 * The glyph's shape on a GRID_W × GRID_H grid: scaled to fit the grid with its proportions kept
 * (a digit fills the height, the wider 「%」 the width), centred, each cell its share of ink.
 */
export function normalize(mask: Mask, glyph: Box): Float32Array {
  const scale = Math.min(GRID_H / glyph.h, GRID_W / glyph.w);
  const fit = { scale, offsetX: (GRID_W - glyph.w * scale) / 2, offsetY: (GRID_H - glyph.h * scale) / 2 };
  const cells = new Float32Array(GRID_W * GRID_H);
  for (let cy = 0; cy < GRID_H; cy++) {
    for (let cx = 0; cx < GRID_W; cx++) cells[cy * GRID_W + cx] = cellShare(mask, glyph, fit, cx, cy);
  }
  return cells;
}
