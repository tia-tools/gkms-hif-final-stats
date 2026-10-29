/**
 * Reads a memory screenshot into values, each with a confidence (decision G6: the values only fill
 * the form, which the player can correct). A value the screenshot hides, or that does not read as
 * the field's format, is null. Pure.
 */

import type { Stat } from "../engine/types.ts";
import { CARD_FIT_MAX, type Candidate, type Integral, integral, rankCards } from "./cards.ts";
import { type CustomRead, readCustom } from "./custom.ts";
import { type Reading, type Templates, classify, readMask, shapes } from "./digits.ts";
import type { Mask } from "./glyphs.ts";
import { TILES, countLines, lineMask, litMarks, lvMask, tile } from "./hensei.ts";
import { AFFECTION, BONUSES, ITEM_SLOTS, PARAMS, STAR, badgeMask, fieldMask, itemIcon, slotState } from "./kihon.ts";
import { type Frame, type Rect, boxOf, locate, shows } from "./layout.ts";
import { type IconTemplate, type SlotRole, matchItem, slotRole } from "./items.ts";
import { type Raster, rgbAt } from "./raster.ts";
import { TEMPLATES } from "./templates.ts";

/** A value read, and how sure: 0 a guess, 1 no other reading comes close. */
export interface Read<T> {
  value: T;
  confidence: number;
}

/** Below this the form highlights the value for the player to check. */
export const UNSURE = 0.35;

/** The images the reader compares pictures with: they come from the sibling at runtime (ADR 0001). */
export interface References {
  /** Every card's thumbnail by card id, as an integral image. */
  thumbs: ReadonlyMap<string, Integral>;
  /** Every card-granted item's icon by its asset id. */
  icons: ReadonlyMap<string, IconTemplate>;
}

/** `hidden`: the slot lies beyond the image's edge; `absent`: the row has no item there. */
export type Slot = { role: SlotRole; item: Read<string> | null } & ({ state: "hidden" | "absent" | "none" | "spent" } | { state: "badge"; left: Read<number> | null });

export interface KihonRead {
  tab: "kihon";
  star: Read<number> | null;
  params: Record<Stat, Read<number> | null>;
  bonusPermil: Record<Stat, Read<number> | null>;
  affection: Read<number> | null;
  /** The 「Pアイテム」 row, left to right; slot 0 is the カスタム item. */
  slots: Slot[];
  /** The カスタム item's character and accessory (G33). */
  custom: CustomRead | null;
}

export interface TileRead {
  /** The three cards whose thumbnails fit the tile best, best first; empty without references. */
  cards: Candidate[];
  /** How sure the best card is: how much nearer than the runner-up, as a share of the runner-up's difference. */
  cardConfidence: number;
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
  const b = boxOf(frame, { x: rect.x + 0.5, y: rect.y + 20, w: 4, h: 40 });
  let coloured = 0;
  let n = 0;
  for (let y = Math.round(b.y); y < b.y + b.h; y++) {
    for (let x = Math.round(b.x); x < b.x + b.w; x++) {
      const [red, green, blue] = rgbAt(r, x, y);
      if (Math.max(red, green, blue) - Math.min(red, green, blue) > 50) coloured++;
      n++;
    }
  }
  return coloured >= 0.2 * n;
}

function slot(r: Raster, frame: Frame, k: number, screen: Integral, refs: References | null): Slot {
  if (!shows(frame, itemIcon(k), r)) return { state: "hidden", role: "support", item: null };
  if (!present(r, frame, k)) return { state: "absent", role: "support", item: null };
  const role = slotRole(r, frame, k);
  const state = slotState(r, frame, k);
  const match = role === "support" && state !== "spent" && refs !== null ? matchItem(screen, frame, k, refs.icons) : null;
  const item = match === null ? null : { value: match.id, confidence: match.confidence };
  if (state !== "badge") return { state, role, item };
  return { state, role, item, left: parsed(readMask(badgeMask(r, frame, k), TEMPLATES.badge), /^\d{1,2}$/, Number) };
}

function readKihon(r: Raster, frame: Frame, refs: References | null): KihonRead {
  const screen = integral(r);
  const byStat = (read: (stat: Stat) => Read<number> | null): Record<Stat, Read<number> | null> => ({
    vocal: read("vocal"),
    dance: read("dance"),
    visual: read("visual"),
  });
  return {
    tab: "kihon",
    star: field(r, frame, STAR, TEMPLATES.bold, WHOLE),
    // No stat passes the highest cap, 3200 (decision G8).
    params: byStat((s) => bounded(field(r, frame, PARAMS[s], TEMPLATES.bold, WHOLE), 0, 3200)),
    bonusPermil: byStat((s) => bonus(r, frame, BONUSES[s])),
    affection: bounded(field(r, frame, AFFECTION, TEMPLATES.bold, /^\d{2}$/), 28, 37),
    slots: Array.from({ length: ITEM_SLOTS }, (_, k) => slot(r, frame, k, screen, refs)).filter((s, k, all) => s.state !== "absent" || all.slice(k).some((o) => o.state !== "absent")),
    custom: shows(frame, itemIcon(0), r) && present(r, frame, 0) ? readCustom(screen, frame) : null,
  };
}

/** The last glyph of a mask, read alone. */
function lastGlyph(mask: Mask, templates: Templates): Read<number> | null {
  const last = shapes(mask).at(-1);
  if (last === undefined) return null;
  const { char, confidence } = classify(last, templates);
  return /^\d$/.test(char) ? { value: Number(char), confidence } : null;
}

/**
 * Tile k's best cards. Sure only with a runner-up to compare and a fit a tile's own card makes: a
 * card whose thumbnail did not load can leave another far ahead, and wrong.
 */
function tileCards(screen: Integral, frame: Frame, k: number, refs: References | null): Pick<TileRead, "cards" | "cardConfidence"> {
  if (refs === null) return { cards: [], cardConfidence: 0 };
  const ranked = rankCards(screen, frame, k, refs.thumbs);
  const [best, next] = ranked;
  const fits = best !== undefined && next !== undefined && best.score <= CARD_FIT_MAX;
  return { cards: ranked.slice(0, 3), cardConfidence: fits ? (next.score - best.score) / next.score : 0 };
}

/** A tile reaching beyond the image's edge is not read: its pixels would be another row's. */
const UNREAD_TILE: TileRead = { cards: [], cardConfidence: 0, level: null, marks: 0 };

function readTile(r: Raster, frame: Frame, k: number, screen: Integral, refs: References | null): TileRead {
  if (!shows(frame, tile(k), r)) return UNREAD_TILE;
  return {
    ...tileCards(screen, frame, k, refs),
    level: bounded(parsed(readMask(lvMask(r, frame, k), TEMPLATES.lv), /^\d{1,2}$/, Number), 1, 60),
    marks: litMarks(r, frame, k),
  };
}

function readHensei(r: Raster, frame: Frame, refs: References | null): HenseiRead {
  const lines = countLines(r, frame);
  const screen = integral(r);
  return {
    tab: "hensei",
    tiles: Array.from({ length: TILES }, (_, k) => readTile(r, frame, k, screen, refs)),
    refreshes: lines === null ? null : lastGlyph(lineMask(r, lines[2]), TEMPLATES.count),
  };
}

/**
 * Everything a 基本情報 or 編成 screenshot shows, or null when it is neither. Without references
 * the pictures stay unread: no card candidates and no サポート items.
 */
export function readScreenshot(r: Raster, refs: References | null = null): KihonRead | HenseiRead | null {
  const frame = locate(r);
  if (frame === null) return null;
  return frame.tab === "kihon" ? readKihon(r, frame, refs) : readHensei(r, frame, refs);
}
