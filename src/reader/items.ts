/**
 * Which P-item each slot of the 「Pアイテム」 row holds. The label pill over a slot says what kind
 * it is: green 「カスタム」 (the カスタム item, slot 0), blue 「Pアイドル」 (the P-idol's own, slot
 * 1), none (the scenario's ワッペン) and blue 「サポート」 (items the deck's cards grant). A サポート
 * icon is compared with the sibling's 48 × 48 icons of card-granted items (decision G13), over the
 * icon's opaque cells only, since the game draws it on a pink ground. Pure.
 */

import { type Integral, boxMeanOf } from "./cards.ts";
import { ITEM_PITCH } from "./kihon.ts";
import { type Frame, boxOf } from "./layout.ts";
import { type Raster, rgbAt } from "./raster.ts";

export type SlotRole = "custom" | "pidol" | "scenario" | "support";

/** The label pill over slot k, relative to the slot (units). */
const LABEL = { x: 10, y: 6, w: 64, h: 10 };

function share(r: Raster, frame: Frame, k: number, colour: (red: number, green: number, blue: number) => boolean): number {
  const b = boxOf(frame, { ...LABEL, x: LABEL.x + k * ITEM_PITCH });
  let on = 0;
  let n = 0;
  for (let y = Math.round(b.y); y < b.y + b.h; y++) {
    for (let x = Math.round(b.x); x < b.x + b.w; x++) {
      if (colour(...rgbAt(r, x, y))) on++;
      n++;
    }
  }
  return on / n;
}

const GREEN = (red: number, green: number, blue: number) => green > 160 && red < 90 && blue > 60 && blue < 130;
const BLUE = (red: number, green: number, blue: number) => blue > 200 && red < 90 && green > 140;

/** Slot k's kind, by its label pill; a label is half covered by its colour, the rest is its text. */
export function slotRole(r: Raster, frame: Frame, k: number): SlotRole {
  if (share(r, frame, k, GREEN) > 0.4) return "custom";
  if (share(r, frame, k, BLUE) > 0.4) return k === 1 ? "pidol" : "support";
  return "scenario";
}

/** An icon as compared: per cell of a square grid, its mean colour over its opaque pixels and how much is opaque. */
export interface IconTemplate {
  cells: number;
  rgb: Float32Array;
  cover: Float32Array;
}

/** The icon's template on a `cells` × `cells` grid, reading every `stride`-th pixel across and down. */
export function iconTemplate(icon: Raster, cells = 12, stride = 1): IconTemplate {
  const rgb = new Float32Array(cells * cells * 3);
  const cover = new Float32Array(cells * cells);
  const count = new Float32Array(cells * cells);
  const cw = icon.width / cells;
  const ch = icon.height / cells;
  for (let y = 0; y < icon.height; y += stride) {
    for (let x = 0; x < icon.width; x += stride) {
      const i = (y * icon.width + x) * 4;
      const a = (icon.data[i + 3] ?? 0) / 255;
      const cell = Math.floor(y / ch) * cells + Math.floor(x / cw);
      for (let c = 0; c < 3; c++) rgb[cell * 3 + c] = (rgb[cell * 3 + c] ?? 0) + (icon.data[i + c] ?? 0) * a;
      cover[cell] = (cover[cell] ?? 0) + a;
      count[cell] = (count[cell] ?? 0) + 1;
    }
  }
  return normalized({ cells, rgb, cover }, count);
}

/** Sums into means: colour over the opaque weight, and the opaque weight over the pixels read. */
function normalized(t: IconTemplate, count: Float32Array): IconTemplate {
  for (let cell = 0; cell < t.cells * t.cells; cell++) {
    const a = t.cover[cell] ?? 0;
    for (let c = 0; c < 3; c++) t.rgb[cell * 3 + c] = a > 0 ? (t.rgb[cell * 3 + c] ?? 0) / a : 0;
    t.cover[cell] = a / (count[cell] || 1);
  }
  return t;
}

/** Where an icon is laid on the screenshot: `size` units square from (x, y), relative to the anchor. */
export interface Pose {
  size: number;
  x: number;
  y: number;
}

/** A cell counts when the icon covers most of it. */
const COVER_MIN = 0.9;

/**
 * The mean squared colour difference between the screenshot and the icon laid by the pose, over
 * the cells the icon covers and `skip` does not exclude. Too few cells is no fit.
 */
export function poseScore(screen: Integral, frame: Frame, t: IconTemplate, pose: Pose, skip?: (cell: number) => boolean): number {
  const cs = pose.size / t.cells;
  const mean = new Float32Array(3);
  let sum = 0;
  let n = 0;
  for (let cell = 0; cell < t.cells * t.cells; cell++) {
    if ((t.cover[cell] ?? 0) < COVER_MIN || skip?.(cell) === true) continue;
    const b = boxOf(frame, { x: pose.x + (cell % t.cells) * cs, y: pose.y + Math.floor(cell / t.cells) * cs, w: cs, h: cs });
    boxMeanOf(screen, b, mean);
    for (let c = 0; c < 3; c++) sum += ((mean[c] ?? 0) - (t.rgb[cell * 3 + c] ?? 0)) ** 2;
    n += 3;
  }
  return n >= 30 ? sum / n : Number.POSITIVE_INFINITY;
}

/**
 * Where a card-granted item's icon may sit in its slot (units from the slot's origin): the art
 * spans `size` units from (x, y), below the label row. Measured on the samples at about 70 units
 * from (7, 29).
 */
const POSES: readonly Pose[] = [64, 66, 68, 70, 72, 74].flatMap((size) => [4, 5, 6, 7, 8, 9, 10].flatMap((x) => [26, 27, 28, 29, 30, 31, 32].map((y) => ({ size, x, y }))));

/** How well the icon fits slot k at its best pose: lower is better. */
export function iconFit(screen: Integral, frame: Frame, k: number, t: IconTemplate): number {
  return Math.min(...POSES.map((pose) => poseScore(screen, frame, t, { ...pose, x: pose.x + k * ITEM_PITCH })));
}

/**
 * Above this the icon is another item: the samples' matches fit at 64 or better, and the closest
 * icon of an item the data does not hold, or of an empty slot, at 181 or worse.
 */
export const ICON_FIT_MAX = 110;

/** The item in slot k and how sure, or null when no icon fits: an item no card grants. */
export function matchItem(screen: Integral, frame: Frame, k: number, icons: ReadonlyMap<string, IconTemplate>): { id: string; confidence: number } | null {
  const ranked = [...icons].map(([id, t]) => ({ id, score: iconFit(screen, frame, k, t) })).sort((a, b) => a.score - b.score);
  const [best, next] = ranked;
  if (best === undefined || best.score > ICON_FIT_MAX) return null;
  // With no runner-up to compare, the match is not sure.
  const second = next?.score ?? Number.POSITIVE_INFINITY;
  return { id: best.id, confidence: Number.isFinite(second) ? (second - best.score) / second : 0 };
}
