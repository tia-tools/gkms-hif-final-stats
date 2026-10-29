/**
 * The 編成 tab's fields, relative to the pink 「SP」 badge (units; see `layout.ts`): the six support
 * tiles, each tile's Lv and lit × marks, and the 相談リフレッシュ count. Pure.
 */

import { type Box, type Mask, inkMask } from "./glyphs.ts";
import { type Frame, type Rect, boxOf } from "./layout.ts";
import { type Raster, rgbAt } from "./raster.ts";

export const TILES = 6;
/** Tile k of the 2 × 3 grid, row by row. */
export function tile(k: number): Rect {
  return { x: 1 + 203 * (k % 2), y: -459 + 121.5 * Math.floor(k / 2), w: 191, h: 107 };
}

/** The Lv digits, relative to the tile. */
const LV: Rect = { x: 4, y: 70, w: 44, h: 28 };
/** The four × marks, relative to the tile: mark m spans 19 units from 47.5 + 22.5 m. */
const MARK = { x: 47.5, pitch: 22.5, w: 19, y: 75, h: 20 };

function within(t: Rect, r: Rect): Rect {
  return { x: t.x + r.x, y: t.y + r.y, w: r.w, h: r.h };
}

const rgb = rgbAt;

function pixelBox(frame: Frame, rect: Rect): Box {
  const b = boxOf(frame, rect);
  return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) };
}

/** Labels 4-connected components of the mask; returns each one's pixel indices. */
function components(mask: Mask): number[][] {
  const seen = new Uint8Array(mask.ink.length);
  const out: number[][] = [];
  for (let start = 0; start < mask.ink.length; start++) {
    if (mask.ink[start] !== 1 || seen[start] === 1) continue;
    const stack = [start];
    const part: number[] = [];
    seen[start] = 1;
    while (stack.length > 0) {
      const i = stack.pop() ?? 0;
      part.push(i);
      const x = i % mask.w;
      const next = [x > 0 ? i - 1 : -1, x < mask.w - 1 ? i + 1 : -1, i - mask.w, i + mask.w];
      for (const j of next) {
        if (j < 0 || j >= mask.ink.length || mask.ink[j] !== 1 || seen[j] === 1) continue;
        seen[j] = 1;
        stack.push(j);
      }
    }
    out.push(part);
  }
  return out;
}

/**
 * Tile k's Lv digits as a mask: the white fill of each digit. The digits' dark outline keeps their
 * fill apart from light art behind them, so only white components at least half the box tall stay.
 */
export function lvMask(r: Raster, frame: Frame, k: number): Mask {
  const box = pixelBox(frame, within(tile(k), LV));
  const all = new Uint8Array(box.w * box.h);
  for (let y = 0; y < box.h; y++) {
    for (let x = 0; x < box.w; x++) {
      const [red, green, blue] = rgb(r, box.x + x, box.y + y);
      if (Math.min(red, green, blue) > 225 && Math.max(red, green, blue) - Math.min(red, green, blue) < 40) all[y * box.w + x] = 1;
    }
  }
  const ink = new Uint8Array(all.length);
  for (const part of components({ w: box.w, h: box.h, ink: all })) {
    let top = box.h;
    let bottom = -1;
    for (const i of part) {
      const y = Math.floor(i / box.w);
      top = Math.min(top, y);
      bottom = Math.max(bottom, y);
    }
    if (bottom - top + 1 < 0.5 * box.h) continue;
    for (const i of part) ink[i] = 1;
  }
  return { w: box.w, h: box.h, ink };
}

/** Share of a lit mark's pale pixels a mark position must show to count as lit. */
const LIT_SHARE = 0.5;

/** Tile k's lit × marks: its 凸. A lit mark is pale; an unlit one darkens the art behind it. */
export function litMarks(r: Raster, frame: Frame, k: number): number {
  let lit = 0;
  for (let m = 0; m < 4; m++) {
    const inner = { x: MARK.x + m * MARK.pitch + 5, y: MARK.y + 5, w: MARK.w - 10, h: MARK.h - 10 };
    const b = pixelBox(frame, within(tile(k), inner));
    let pale = 0;
    for (let y = b.y; y < b.y + b.h; y++) {
      for (let x = b.x; x < b.x + b.w; x++) if (Math.min(...rgb(r, x, y)) > 170) pale++;
    }
    if (pale >= LIT_SHARE * b.w * b.h) lit++;
  }
  return lit;
}

/** Where the 発動中効果 block ends, below the third 「SP」 badge, and where the count lines may run. */
const BELOW_EFFECTS = 195;
const TEXT_X = { from: -25, to: 330 };
const LINE = { min: 10, max: 24, gap: 4, step: 30 };

function darkNeutral(r: Raster, x: number, y: number): boolean {
  const [red, green, blue] = rgb(r, x, y);
  const lum = (299 * red + 587 * green + 114 * blue) / 1000;
  return lum < 140 && Math.max(red, green, blue) - Math.min(red, green, blue) < 40;
}

/** Bands of rows holding dark text, in pixels, from below the effects block to the image's foot. */
function textBands(r: Raster, frame: Frame): { top: number; bottom: number }[] {
  const u = frame.unit;
  const x0 = Math.max(0, Math.round(frame.x + TEXT_X.from * u));
  const x1 = Math.min(r.width, Math.round(frame.x + TEXT_X.to * u));
  const bands: { top: number; bottom: number }[] = [];
  let last = -1;
  for (let y = Math.round(frame.y + BELOW_EFFECTS * u); y < r.height; y++) {
    let n = 0;
    for (let x = x0; x < x1; x++) if (darkNeutral(r, x, y)) n++;
    if (n < 2 * u) continue;
    const band = bands[bands.length - 1];
    if (band !== undefined && y - last <= LINE.gap * u) band.bottom = y;
    else bands.push({ top: y, bottom: y });
    last = y;
  }
  return bands;
}

/**
 * The three count lines under the effects (or under 除去済みスキルカード when the run deleted
 * cards), as boxes: 「スキルカード再抽選可能回数 残りN」, 「スキルカード除去可能回数 残りN」 and
 * 「相談リフレッシュ回数 残りN」. They are the first three text lines one step apart.
 */
export function countLines(r: Raster, frame: Frame): [Box, Box, Box] | null {
  const u = frame.unit;
  const lines = textBands(r, frame).filter((b) => {
    const h = (b.bottom - b.top + 1) / u;
    return h >= LINE.min && h <= LINE.max;
  });
  const x = Math.round(frame.x + TEXT_X.from * u);
  const w = Math.round((TEXT_X.to - TEXT_X.from) * u);
  const box = (b: { top: number; bottom: number }): Box => ({ x, y: b.top - Math.round(2 * u), w, h: b.bottom - b.top + Math.round(5 * u) });
  for (let i = 0; i + 2 < lines.length; i++) {
    const [a, b, c] = [lines[i], lines[i + 1], lines[i + 2]];
    if (a === undefined || b === undefined || c === undefined) continue;
    const steps = [(b.top - a.top) / u, (c.top - b.top) / u];
    if (steps.every((step) => Math.abs(step - LINE.step) <= 6)) return [box(a), box(b), box(c)];
  }
  return null;
}

/** A count line's ink; its last glyph is the count. */
export function lineMask(r: Raster, box: Box): Mask {
  return inkMask(r, box, "dark");
}
