/**
 * Reads a memory screenshot into values, each with a confidence (decision G6: the values only fill
 * the form, which the player can correct). A value the screenshot hides, or that does not read as
 * the field's format, is null. Pure.
 */

import type { Stat } from "../engine/types.ts";
import { type Reading, type Templates, classify, readMask, shapes } from "./digits.ts";
import type { Mask } from "./glyphs.ts";
import { TILES, countLines, lineMask, litMarks, lvMask } from "./hensei.ts";
import { AFFECTION, BONUSES, ITEM_SLOTS, PARAMS, STAR, badgeMask, fieldMask, itemIcon, slotState } from "./kihon.ts";
import { type Frame, type Rect, boxOf, locate, shows } from "./layout.ts";
import type { Raster } from "./raster.ts";
import { TEMPLATES } from "./templates.ts";

/** A value read, and how sure: 0 a guess, 1 no other reading comes close. */
export interface Read<T> {
  value: T;
  confidence: number;
}

/** Below this the form highlights the value for the player to check. */
export const UNSURE = 0.35;

export type Slot =
  | { state: "absent" | "none" | "spent" }
  | { state: "badge"; left: Read<number> | null };

export interface KihonRead {
  tab: "kihon";
  star: Read<number> | null;
  params: Record<Stat, Read<number> | null>;
  bonusPermil: Record<Stat, Read<number> | null>;
  affection: Read<number> | null;
  /** The 「Pアイテム」 row, left to right; slot 0 is the カスタム item. */
  slots: Slot[];
}

export interface TileRead {
  level: Read<number> | null;
  /** Lit × marks, the card's 凸. */
  marks: number;
}

export interface HenseiRead {
  tab: "hensei";
  tiles: TileRead[];
  refreshes: Read<number> | null;
}

function parsed(reading: Reading | null, pattern: RegExp, toValue: (text: string) => number): Read<number> | null {
  if (reading === null || !pattern.test(reading.text)) return null;
  return { value: toValue(reading.text), confidence: reading.confidence };
}

function field(r: Raster, frame: Frame, rect: Rect, templates: Templates, pattern: RegExp, dots = false): Read<number> | null {
  if (!shows(frame, rect, r)) return null;
  return parsed(readMask(fieldMask(r, frame, rect), templates, dots), pattern, Number);
}

const WHOLE = /^\d{1,4}$/;
const PERCENT = /^\d{1,3}\.\d%$/;

function bonus(r: Raster, frame: Frame, rect: Rect): Read<number> | null {
  if (!shows(frame, rect, r)) return null;
  return parsed(readMask(fieldMask(r, frame, rect), TEMPLATES.bonus, true), PERCENT, (t) => Number(t.replace(/[.%]/g, "")));
}

/** A value outside what the game allows reads with no confidence. */
export function bounded(read: Read<number> | null, min: number, max: number): Read<number> | null {
  if (read === null) return null;
  return read.value >= min && read.value <= max ? read : { ...read, confidence: 0 };
}

/** Whether slot k holds an icon: its frame is coloured, where an empty slot is the page's grey. */
function present(r: Raster, frame: Frame, k: number): boolean {
  const rect = itemIcon(k);
  if (!shows(frame, rect, r)) return false;
  const b = boxOf(frame, { x: rect.x + 0.5, y: rect.y + 20, w: 4, h: 40 });
  let coloured = 0;
  let n = 0;
  for (let y = Math.round(b.y); y < b.y + b.h; y++) {
    for (let x = Math.round(b.x); x < b.x + b.w; x++) {
      const i = (y * r.width + x) * 4;
      const red = r.data[i] ?? 0;
      const green = r.data[i + 1] ?? 0;
      const blue = r.data[i + 2] ?? 0;
      if (Math.max(red, green, blue) - Math.min(red, green, blue) > 50) coloured++;
      n++;
    }
  }
  return coloured >= 0.2 * n;
}

function slot(r: Raster, frame: Frame, k: number): Slot {
  if (!present(r, frame, k)) return { state: "absent" };
  const state = slotState(r, frame, k);
  if (state !== "badge") return { state };
  return { state, left: parsed(readMask(badgeMask(r, frame, k), TEMPLATES.badge), /^\d{1,2}$/, Number) };
}

function readKihon(r: Raster, frame: Frame): KihonRead {
  const byStat = (read: (stat: Stat) => Read<number> | null): Record<Stat, Read<number> | null> => ({
    vocal: read("vocal"),
    dance: read("dance"),
    visual: read("visual"),
  });
  return {
    tab: "kihon",
    star: field(r, frame, STAR, TEMPLATES.bold, WHOLE),
    params: byStat((s) => field(r, frame, PARAMS[s], TEMPLATES.bold, WHOLE)),
    bonusPermil: byStat((s) => bonus(r, frame, BONUSES[s])),
    affection: bounded(field(r, frame, AFFECTION, TEMPLATES.bold, /^\d{2}$/), 28, 37),
    slots: Array.from({ length: ITEM_SLOTS }, (_, k) => slot(r, frame, k)).filter((s, k, all) => s.state !== "absent" || all.slice(k).some((o) => o.state !== "absent")),
  };
}

/** The last glyph of a mask, read alone. */
function lastGlyph(mask: Mask, templates: Templates): Read<number> | null {
  const last = shapes(mask).at(-1);
  if (last === undefined) return null;
  const { char, confidence } = classify(last, templates);
  return /^\d$/.test(char) ? { value: Number(char), confidence } : null;
}

function readHensei(r: Raster, frame: Frame): HenseiRead {
  const lines = countLines(r, frame);
  return {
    tab: "hensei",
    tiles: Array.from({ length: TILES }, (_, k) => ({
      level: bounded(parsed(readMask(lvMask(r, frame, k), TEMPLATES.lv), /^\d{1,2}$/, Number), 1, 60),
      marks: litMarks(r, frame, k),
    })),
    refreshes: lines === null ? null : lastGlyph(lineMask(r, lines[2]), TEMPLATES.count),
  };
}

/** Everything a 基本情報 or 編成 screenshot shows, or null when it is neither. */
export function readScreenshot(r: Raster): KihonRead | HenseiRead | null {
  const frame = locate(r);
  if (frame === null) return null;
  return frame.tab === "kihon" ? readKihon(r, frame) : readHensei(r, frame);
}
