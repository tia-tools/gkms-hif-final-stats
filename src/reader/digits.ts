/**
 * Reading a run of glyphs as text by comparing each with templates of the same font, cut from the
 * sample screenshots (decision G32). A templates set maps a character to its shape on the glyph
 * grid. Pure.
 */

import { GRID_H, GRID_W, type Mask, normalize, segment } from "./glyphs.ts";

export type Templates = ReadonlyMap<string, Float32Array>;

/** The text and how sure the reading is, from 0 (a guess) to 1 (no other character comes close). */
export interface Reading {
  text: string;
  confidence: number;
}

/** Mean squared difference between two glyph shapes, 0 when identical. */
export function distance(a: Float32Array, b: Float32Array): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += ((a[i] ?? 0) - (b[i] ?? 0)) ** 2;
  return sum / a.length;
}

/**
 * The nearest template's character, and the confidence: how much nearer it is than the runner-up,
 * as a share of the runner-up's distance.
 */
export function classify(cells: Float32Array, templates: Templates): { char: string; confidence: number } {
  let best = { char: "", d: Number.POSITIVE_INFINITY };
  let second = Number.POSITIVE_INFINITY;
  for (const [char, template] of templates) {
    const d = distance(cells, template);
    if (d < best.d) {
      second = best.d;
      best = { char, d };
    } else if (d < second) second = d;
  }
  const confidence = Number.isFinite(second) && second > 0 ? (second - best.d) / second : 0;
  return { char: best.char, confidence };
}

/**
 * A glyph too short to be a digit: a decimal point when it sits on the baseline and is at least an
 * eighth of the line tall and wide (a speck of a pixel or two is not), else noise.
 */
function small(glyph: { y: number; w: number; h: number }, lineTop: number, lineHeight: number): "dot" | "noise" | null {
  if (glyph.h >= 0.45 * lineHeight) return null;
  const onBaseline = glyph.y + glyph.h >= lineTop + 0.8 * lineHeight;
  const sized = Math.min(glyph.w, glyph.h) >= lineHeight / 8;
  return onBaseline && sized ? "dot" : "noise";
}

/**
 * The glyphs in the mask, left to right, as text: full-height glyphs by template, a short glyph on
 * the baseline as "." when `dots` is set, other short marks dropped. Null when there is no glyph.
 */
export function readMask(mask: Mask, templates: Templates, dots = false): Reading | null {
  const glyphs = segment(mask);
  const lineHeight = Math.max(0, ...glyphs.map((g) => g.h));
  if (lineHeight === 0) return null;
  const tall = glyphs.filter((g) => g.h >= 0.45 * lineHeight);
  const lineTop = Math.min(...tall.map((g) => g.y));
  let text = "";
  let confidence = 1;
  for (const g of glyphs) {
    const kind = small(g, lineTop, lineHeight);
    if (kind === "dot" && dots) text += ".";
    if (kind !== null) continue;
    const c = classify(normalize(mask, g), templates);
    text += c.char;
    confidence = Math.min(confidence, c.confidence);
  }
  return text === "" ? null : { text, confidence };
}

/** The glyph shapes in the mask that `readMask` would compare, for cutting templates. */
export function shapes(mask: Mask): Float32Array[] {
  const glyphs = segment(mask);
  const lineHeight = Math.max(0, ...glyphs.map((g) => g.h));
  return glyphs.filter((g) => g.h >= 0.45 * lineHeight).map((g) => normalize(mask, g));
}

/** Templates as stored: one hex digit (0–15, ink sixteenths) per grid cell, row by row. */
export function decodeTemplates(stored: Readonly<Record<string, string>>): Templates {
  const out = new Map<string, Float32Array>();
  for (const [char, hex] of Object.entries(stored)) {
    if (hex.length !== GRID_W * GRID_H) throw new Error(`template ${char}: ${hex.length} cells, not ${GRID_W * GRID_H}`);
    out.set(char, Float32Array.from(hex, (h) => Number.parseInt(h, 16) / 15));
  }
  return out;
}

export function encodeTemplate(cells: Float32Array): string {
  return Array.from(cells, (v) => Math.round(Math.min(1, Math.max(0, v)) * 15).toString(16)).join("");
}
