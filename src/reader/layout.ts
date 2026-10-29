/**
 * Where things are on a memory screenshot. The game lays both tabs out on a 720-wide grid scaled to
 * the screenshot's width, so a length in "units" is `width / 720` pixels on every device. What a
 * device changes is where the content starts: a tall phone adds a band at the top, the DMM window
 * keeps a scroll bar, and the player may have scrolled. So every position is measured from an
 * anchor found in the image: the green 「カスタム」 label over the first P-item on the 基本情報 tab,
 * and the pink 「SP」 badge of 発動中効果 on the 編成 tab (decision G7). The unit offsets below were
 * measured on the DMM sample (one unit a pixel) and checked on the five phone samples. Pure.
 */

import type { Box } from "./glyphs.ts";
import { type Raster, rgbAt } from "./raster.ts";

export type Tab = "kihon" | "hensei";

/** A located screenshot: its tab, the anchor's top-left in pixels, and its unit in pixels. */
export interface Frame {
  tab: Tab;
  unit: number;
  x: number;
  y: number;
  /** The first pixel row where the panel shows; above it the idol image hides what has scrolled. */
  top: number;
}

/** A rectangle in units, relative to the anchor. */
export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export function boxOf(frame: Frame, rect: Rect): Box {
  return { x: frame.x + rect.x * frame.unit, y: frame.y + rect.y * frame.unit, w: rect.w * frame.unit, h: rect.h * frame.unit };
}

/** Whether the rectangle lies wholly inside the screenshot and below the idol image. */
export function shows(frame: Frame, rect: Rect, r: Raster): boolean {
  const b = boxOf(frame, rect);
  return b.y >= frame.top && b.x >= 0 && b.x + b.w <= r.width && b.y + b.h <= r.height;
}

type Colour = (red: number, green: number, blue: number) => boolean;

const CUSTOM_GREEN: Colour = (red, green, blue) => green > 160 && red < 90 && blue > 60 && blue < 130;
const SP_PINK: Colour = (red, green, blue) => red > 200 && green < 120 && blue > 110 && blue < 190;
const SP_BLUE: Colour = (red, green, blue) => blue > 200 && red < 140 && green > 100 && green < 200;
const SP_YELLOW: Colour = (red, green, blue) => red > 200 && green > 150 && blue < 90;

function is(r: Raster, x: number, y: number, colour: Colour): boolean {
  return colour(...rgbAt(r, x, y));
}

/** The first row, from the top, holding at least `count` pixels of the colour in the left fifth. */
function firstRow(r: Raster, colour: Colour, count: number): number {
  const right = Math.round(r.width / 5);
  for (let y = 0; y < r.height; y++) {
    let n = 0;
    for (let x = 0; x < right; x++) if (is(r, x, y, colour)) n++;
    if (n >= count) return y;
  }
  return -1;
}

/** The first and last pixel of the colour along the row, within the left fifth: [start, span]. */
function span(r: Raster, y: number, colour: Colour): [number, number] {
  let first = -1;
  let last = -1;
  for (let x = 0; x < Math.round(r.width / 5); x++) {
    if (!is(r, x, y, colour)) continue;
    if (first < 0) first = x;
    last = x;
  }
  return [first, last - first + 1];
}

// The 「カスタム」 label is 84.5 units wide; the 「SP」 badges are 38.5 units square, 75 apart.
const PILL_WIDTH = 84.5;
const BADGE = 38.5;
const BADGE_STEP = 75;
/** How far above the label the panel starts when it is not scrolled (DMM: 713 − 405). */
const PANEL_ABOVE_PILL = 308;

function locateKihon(r: Raster, unit: number): Frame | null {
  const y = firstRow(r, CUSTOM_GREEN, 60 * unit);
  if (y < 0) return null;
  const [x, width] = span(r, y + 4 * unit, CUSTOM_GREEN);
  if (Math.abs(width / unit - PILL_WIDTH) > 8) return null;
  return { tab: "kihon", unit, x, y, top: panelTop(r, x, y, unit) };
}

function locateHensei(r: Raster, unit: number): Frame | null {
  const y = firstRow(r, SP_PINK, 30 * unit);
  if (y < 0) return null;
  const [x, width] = span(r, y + 5 * unit, SP_PINK);
  if (Math.abs(width / unit - BADGE) > 5) return null;
  // Near a corner, clear of the white 「SP」 letters.
  const corner = x + 5 * unit;
  const below = (k: number) => y + (5 + k * BADGE_STEP) * unit;
  if (!is(r, corner, below(1), SP_BLUE) || !is(r, corner, below(2), SP_YELLOW)) return null;
  return { tab: "hensei", unit, x, y, top: 0 };
}

function lightNeutral(r: Raster, x: number, y: number): boolean {
  const [red, green, blue] = rgbAt(r, x, y);
  return Math.min(red, green, blue) > 215 && Math.max(red, green, blue) - Math.min(red, green, blue) < 25;
}

/**
 * The panel's first visible row. The panel's left margin is plain background, so walking up from
 * the label it stays light grey until the idol image begins. Never higher than where the panel
 * starts unscrolled, in case the image itself is light at its edge.
 */
function panelTop(r: Raster, pillX: number, pillY: number, unit: number): number {
  const floor = Math.max(0, Math.round(pillY - PANEL_ABOVE_PILL * unit));
  const x0 = Math.round(3 * unit);
  const x1 = Math.max(x0 + 1, pillX - Math.round(4 * unit));
  for (let y = pillY - 1; y >= floor; y--) {
    for (let x = x0; x < x1; x++) if (!lightNeutral(r, x, y)) return y + 1;
  }
  return floor;
}

/**
 * Height over width of the layouts that scale with the width (decision G7): portrait phones and
 * DMM, from 9:16 to about 9:20. The samples measure 1.778 to 2.167.
 */
export const ASPECT = { min: 1.75, max: 2.25 };

/**
 * Which tab the screenshot shows and where its anchor is, or null when it is neither, or when its
 * shape is one the reader does not support (G7): refused, never misread.
 */
export function locate(r: Raster): Frame | null {
  const aspect = r.height / r.width;
  if (!(aspect >= ASPECT.min && aspect <= ASPECT.max)) return null;
  const unit = r.width / 720;
  return locateKihon(r, unit) ?? locateHensei(r, unit);
}
