/**
 * The 基本情報 tab's fields: where each sits relative to the 「カスタム」 label (units; see
 * `layout.ts`), and how its glyphs are cut out. Pure.
 */

import type { Stat } from "../engine/types.ts";
import { type Box, type Mask, inkMask } from "./glyphs.ts";
import { type Frame, type Rect, boxOf } from "./layout.ts";
import { type Raster, rgbAt } from "./raster.ts";

export const STAR: Rect = { x: 90, y: -108, w: 80, h: 26 };
export const PARAMS: Record<Stat, Rect> = {
  vocal: { x: 205, y: -125, w: 130, h: 26 },
  dance: { x: 345, y: -125, w: 130, h: 26 },
  visual: { x: 484, y: -125, w: 110, h: 26 },
};
export const BONUSES: Record<Stat, Rect> = {
  vocal: { x: 205, y: -93, w: 130, h: 22 },
  dance: { x: 345, y: -93, w: 130, h: 22 },
  visual: { x: 484, y: -93, w: 110, h: 22 },
};
/** Only the first number of 「37/37」: between the heart's outline and the slash. */
export const AFFECTION: Rect = { x: 521, y: -260, w: 31, h: 22 };

export const ITEM_SLOTS = 7;
/** The P-item row: icon k's frame starts at `x + k × pitch`, measured on all six samples. */
export const ITEM_PITCH = 90.7;
export const ITEM_ICON: Rect = { x: -1, y: 24, w: 84, h: 82 };
/**
 * The grey badge holding an item's fires left, over the icon's bottom-right corner, relative to the
 * icon's slot. It shares its grey with the icons' thin outlines, so it is told apart by being
 * filled: a pixel counts only if every pixel within a unit of it is that grey too.
 */
const BADGE: Rect = { x: 60, y: 84, w: 26, h: 18 };
/** Filled badge grey in units²: none without a badge, a little around the digit, a lot when spent. */
const BADGE_MIN = 2;
const SPENT_MIN = 150;

export function itemIcon(k: number): Rect {
  return { ...ITEM_ICON, x: ITEM_ICON.x + k * ITEM_PITCH };
}

function badgeBox(frame: Frame, k: number, rect: Rect = BADGE): Box {
  const b = boxOf(frame, { ...rect, x: rect.x + k * ITEM_PITCH });
  return { x: Math.round(b.x), y: Math.round(b.y), w: Math.round(b.w), h: Math.round(b.h) };
}

const pixel = rgbAt;

function badgeGrey(r: Raster, x: number, y: number): boolean {
  const [red, green, blue] = pixel(r, x, y);
  const lum = (299 * red + 587 * green + 114 * blue) / 1000;
  return lum >= 98 && lum <= 128 && Math.max(red, green, blue) - Math.min(red, green, blue) < 14;
}

interface Filled {
  /** In units². */
  area: number;
  /** Where the filled grey lies, widened by the erosion's reach and two units. */
  box: Box;
}

/** Filled badge grey in slot k's corner. */
function filledGrey(r: Raster, frame: Frame, k: number): Filled {
  const b = badgeBox(frame, k, { ...BADGE, x: BADGE.x - 4, w: BADGE.w + 4 });
  const reach = Math.max(1, Math.round(1.5 * frame.unit));
  let n = 0;
  let x0 = Number.POSITIVE_INFINITY;
  let y0 = Number.POSITIVE_INFINITY;
  let x1 = -1;
  let y1 = -1;
  for (let y = b.y; y < b.y + b.h; y++) {
    for (let x = b.x; x < b.x + b.w; x++) {
      let filled = true;
      for (let dy = -reach; dy <= reach && filled; dy++) for (let dx = -reach; dx <= reach && filled; dx++) filled = badgeGrey(r, x + dx, y + dy);
      if (!filled) continue;
      n++;
      [x0, y0, x1, y1] = [Math.min(x0, x), Math.min(y0, y), Math.max(x1, x), Math.max(y1, y)];
    }
  }
  const pad = reach + Math.round(2 * frame.unit);
  const box = n === 0 ? b : { x: x0 - pad, y: y0 - pad, w: x1 - x0 + 1 + 2 * pad, h: y1 - y0 + 1 + 2 * pad };
  return { area: n / frame.unit ** 2, box };
}

/**
 * What slot k's corner shows: a badge with fires left, nothing (an item with no fire limit), or the
 * grey of a spent (発動済み) item, whose fires left are 0.
 */
export function slotState(r: Raster, frame: Frame, k: number): "badge" | "none" | "spent" {
  const { area } = filledGrey(r, frame, k);
  if (area >= SPENT_MIN) return "spent";
  return area >= BADGE_MIN ? "badge" : "none";
}

/**
 * The white digits on slot k's badge as a mask. A row's digit pixels are the light ones between
 * the badge grey at its two ends, within the badge's filled grey, so white art beside the badge
 * never counts.
 */
export function badgeMask(r: Raster, frame: Frame, k: number): Mask {
  const box = badgeBox(frame, k);
  const ink = new Uint8Array(box.w * box.h);
  for (let y = 0; y < box.h; y++) {
    const xs = Array.from({ length: box.w }, (_, x) => badgeGrey(r, box.x + x, box.y + y));
    const left = xs.indexOf(true);
    const right = xs.lastIndexOf(true);
    for (let x = left + 1; x < right; x++) {
      const [red, green, blue] = pixel(r, box.x + x, box.y + y);
      if (Math.min(red, green, blue) > 200) ink[y * box.w + x] = 1;
    }
  }
  return { w: box.w, h: box.h, ink };
}

/** The mask of a dark-text field. */
export function fieldMask(r: Raster, frame: Frame, rect: Rect): Mask {
  return inkMask(r, boxOf(frame, rect), "dark");
}

