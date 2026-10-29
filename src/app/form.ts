/**
 * The page's form, which is what gets computed (decision G6), and its round trip through the URL
 * query, so a result can be shared. Pure. A value the query cannot hold is left out when reading,
 * never guessed.
 */

import type { PanelState } from "../engine/total.ts";
import { type DeckSlot, type Memory, STATS, type Stat } from "../engine/types.ts";

export const DECK_SIZE = 6;
export const DEFAULT_AFFECTION = 37;
export const DEFAULT_REFRESHES = 1;

export interface FormState {
  params: Record<Stat, number | null>;
  /** パラメータボーナス in tenths of a percent. */
  bonusPermil: Record<Stat, number | null>;
  star: number | null;
  affection: number;
  refreshesLeft: number;
  medalMoja: boolean;
  /** Six slots; null is an empty one. */
  deck: readonly (DeckSlot | null)[];
  /** Held P-items: item id → fires left, or null when held without a digit read. */
  items: Readonly<Record<string, number | null>>;
  panel: PanelState;
}

export function emptyForm(): FormState {
  return {
    params: { vocal: null, dance: null, visual: null },
    bonusPermil: { vocal: null, dance: null, visual: null },
    star: null,
    affection: DEFAULT_AFFECTION,
    refreshesLeft: DEFAULT_REFRESHES,
    medalMoja: false,
    deck: Array.from({ length: DECK_SIZE }, () => null),
    items: {},
    panel: {},
  };
}

/** The memory the engine computes with, or null while a number it needs is still empty. */
export function memoryOf(form: FormState): Memory | null {
  const { params, bonusPermil, star } = form;
  if (star === null || STATS.some((s) => params[s] === null || bonusPermil[s] === null)) return null;
  return {
    params: { vocal: params.vocal ?? 0, dance: params.dance ?? 0, visual: params.visual ?? 0 },
    bonusPermil: { vocal: bonusPermil.vocal ?? 0, dance: bonusPermil.dance ?? 0, visual: bonusPermil.visual ?? 0 },
    star,
    affection: form.affection,
    refreshesLeft: form.refreshesLeft,
    medalMoja: form.medalMoja,
  };
}

function wholeNumber(text: string | undefined): number | null {
  return text !== undefined && /^\d{1,7}$/.test(text) ? Number(text) : null;
}

/** A key inside a `key:value,…` list, with the three characters the list uses escaped. */
export function escapeKey(key: string): string {
  return key.replace(/%/g, "%25").replace(/,/g, "%2C").replace(/:/g, "%3A");
}

export function unescapeKey(key: string): string {
  return key.replace(/%2C/g, ",").replace(/%3A/g, ":").replace(/%25/g, "%");
}

/** `key:value,key:value`, keys escaped by `escapeKey`. */
function pairs(text: string | null): [string, string | undefined][] {
  if (text === null || text === "") return [];
  return text.split(",").map((entry) => {
    const at = entry.lastIndexOf(":");
    return at === -1 ? [unescapeKey(entry), undefined] : [unescapeKey(entry.slice(0, at)), entry.slice(at + 1)];
  });
}

function numbers(text: string | null): Record<string, number> {
  const out: Record<string, number> = {};
  for (const [key, value] of pairs(text)) {
    const n = wholeNumber(value);
    if (key !== "" && n !== null) out[key] = n;
  }
  return out;
}

function triple(text: string | null): Record<Stat, number | null> {
  const [vocal, dance, visual] = (text ?? "").split(",");
  return { vocal: wholeNumber(vocal), dance: wholeNumber(dance), visual: wholeNumber(visual) };
}

function deckOf(text: string | null): (DeckSlot | null)[] {
  const slots = (text ?? "").split(",").slice(0, DECK_SIZE);
  return Array.from({ length: DECK_SIZE }, (_, i) => {
    const [cardId, level] = pairs(slots[i] ?? "")[0] ?? ["", undefined];
    const n = wholeNumber(level);
    return cardId === "" || n === null ? null : { cardId, level: n };
  });
}

function itemsOf(text: string | null): Record<string, number | null> {
  const out: Record<string, number | null> = {};
  for (const [itemId, value] of pairs(text)) if (itemId !== "") out[itemId] = wholeNumber(value);
  return out;
}

const STAT_SET: readonly Stat[] = STATS;

function uncountedOf(text: string | null): Record<string, { stat: Stat; points: number }> {
  const out: Record<string, { stat: Stat; points: number }> = {};
  for (const entry of (text ?? "").split(",")) {
    const [key, stat, points] = entry.split(":");
    const found = STAT_SET.find((s) => s === stat);
    const n = wholeNumber(points);
    if (key !== undefined && key !== "" && found !== undefined && n !== null) out[unescapeKey(key)] = { stat: found, points: n };
  }
  return out;
}

function panelOf(q: URLSearchParams): PanelState {
  const day3 = q.get("t");
  const panel: PanelState = {
    occasions: numbers(q.get("o")),
    filters: numbers(q.get("f")),
    conditions: numbers(q.get("c")),
    left: numbers(q.get("l")),
    uncounted: uncountedOf(q.get("u")),
  };
  return day3 === "present" || day3 === "activity" ? { ...panel, day3 } : panel;
}

export function readForm(q: URLSearchParams): FormState {
  const affection = wholeNumber(q.get("a") ?? undefined);
  const refreshes = wholeNumber(q.get("r") ?? undefined);
  return {
    params: triple(q.get("p")),
    bonusPermil: triple(q.get("b")),
    star: wholeNumber(q.get("s") ?? undefined),
    affection: affection !== null && affection >= 28 && affection <= 37 ? affection : DEFAULT_AFFECTION,
    refreshesLeft: refreshes ?? DEFAULT_REFRESHES,
    medalMoja: q.get("m") === "1",
    deck: deckOf(q.get("d")),
    items: itemsOf(q.get("i")),
    panel: panelOf(q),
  };
}

function join(entries: [string, string | number | null][]): string {
  return entries.map(([key, value]) => (value === null ? escapeKey(key) : `${escapeKey(key)}:${value}`)).join(",");
}

function setIf(q: URLSearchParams, name: string, value: string): void {
  if (value !== "") q.set(name, value);
}

export function writeForm(form: FormState): URLSearchParams {
  const q = new URLSearchParams();
  const three = (r: Record<Stat, number | null>) => (STATS.every((s) => r[s] === null) ? "" : STATS.map((s) => r[s] ?? "").join(","));
  setIf(q, "p", three(form.params));
  setIf(q, "b", three(form.bonusPermil));
  setIf(q, "s", form.star === null ? "" : String(form.star));
  if (form.affection !== DEFAULT_AFFECTION) q.set("a", String(form.affection));
  if (form.refreshesLeft !== DEFAULT_REFRESHES) q.set("r", String(form.refreshesLeft));
  if (form.medalMoja) q.set("m", "1");
  setIf(q, "d", form.deck.some((s) => s !== null) ? form.deck.map((s) => (s === null ? "" : `${escapeKey(s.cardId)}:${s.level}`)).join(",") : "");
  setIf(q, "i", join(Object.entries(form.items)));
  const { panel } = form;
  setIf(q, "o", join(Object.entries(panel.occasions ?? {})));
  setIf(q, "f", join(Object.entries(panel.filters ?? {})));
  setIf(q, "c", join(Object.entries(panel.conditions ?? {})));
  setIf(q, "l", join(Object.entries(panel.left ?? {})));
  if (panel.day3 !== undefined) q.set("t", panel.day3);
  setIf(q, "u", Object.entries(panel.uncounted ?? {}).map(([key, v]) => `${escapeKey(key)}:${v.stat}:${v.points}`).join(","));
  return q;
}
