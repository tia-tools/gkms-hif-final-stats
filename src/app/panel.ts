/**
 * The panel's rows (decision G25): each count the bound used, as it stands, with whether the
 * player changed it. Grouped by occasion: the occasion, then its filters and conditions, then the
 * fires left of the abilities on it. Pure.
 */

import type { ParsedTrigger } from "../data/contract.ts";
import { conditionKey, filterKey } from "../engine/count.ts";
import type { BestResult, PanelState } from "../engine/total.ts";
import { conditionLabel, memberLabel, occasionLabel } from "./labels.ts";

export type CountKind = "occasions" | "filters" | "conditions" | "left";

export interface CountRow {
  kind: CountKind;
  key: string;
  label: string;
  value: number;
  changed: boolean;
  /** 1 for a row under its occasion. */
  depth: 0 | 1;
}

/** Card id → name, for the fires-left rows. */
export type CardNames = ReadonlyMap<string, string>;

/** Anything that fires on a trigger in the result: an ability line, or a drink-granting P-item. */
interface Fired {
  key: string;
  cardId: string;
  trigger: ParsedTrigger;
  itemName?: string;
  left?: number;
}

function firedOf(result: BestResult): Fired[] {
  const lines = result.lines.flatMap((l): Fired[] => {
    if (l.effect.trigger === undefined) return [];
    const base = { key: l.key, cardId: l.cardId, trigger: l.effect.trigger, ...(l.effect.itemName ? { itemName: l.effect.itemName } : {}) };
    return [l.left === undefined ? base : { ...base, left: l.left }];
  });
  return [...lines, ...result.drinks];
}

function filterRows(occasion: string, f: Fired, result: BestResult, panel: PanelState): CountRow[] {
  const total = result.counts.occasions[occasion] ?? 0;
  return (f.trigger.filters ?? [])
    .filter((filter) => filter.family !== "lessonStat")
    .map((filter) => {
      const key = filterKey(occasion, filter);
      const value = result.counts.filters[key] ?? result.counts.filters[`${occasion}.${filter.family}`] ?? total;
      return { kind: "filters", key, label: memberLabel(filter.family, filter.member), value, changed: panel.filters?.[key] !== undefined, depth: 1 };
    });
}

function conditionRows(occasion: string, f: Fired, result: BestResult, panel: PanelState): CountRow[] {
  const total = result.counts.occasions[occasion] ?? 0;
  return (f.trigger.conditions ?? []).map((c) => {
    const key = conditionKey(occasion, c);
    return { kind: "conditions", key, label: conditionLabel(c), value: result.counts.conditions[key] ?? total, changed: panel.conditions?.[key] !== undefined, depth: 1 };
  });
}

function leftRows(f: Fired, panel: PanelState, names: CardNames): CountRow[] {
  if (f.left === undefined) return [];
  const label = `${names.get(f.cardId) ?? f.cardId}${f.itemName ? `「${f.itemName}」` : ""}`;
  return [{ kind: "left", key: f.key, label, value: f.left, changed: panel.left?.[f.key] !== undefined, depth: 1 }];
}

function rowsFor(occasion: string, fired: readonly Fired[], result: BestResult, panel: PanelState, names: CardNames): CountRow[] {
  const head: CountRow = {
    kind: "occasions",
    key: occasion,
    label: occasionLabel(occasion),
    value: result.counts.occasions[occasion] ?? 0,
    changed: panel.occasions?.[occasion] !== undefined,
    depth: 0,
  };
  const on = fired.filter((f) => f.trigger.occasion === occasion);
  const rows = on.flatMap((f) => [...filterRows(occasion, f, result, panel), ...conditionRows(occasion, f, result, panel), ...leftRows(f, panel, names)]);
  const seen = new Set<string>();
  return [head, ...rows.filter((row) => !seen.has(`${row.kind} ${row.key}`) && seen.add(`${row.kind} ${row.key}`))];
}

export function panelRows(result: BestResult, panel: PanelState, names: CardNames): CountRow[] {
  const fired = firedOf(result);
  const occasions = [...new Set(["GetProduceCard", "GetProduceDrink", ...fired.map((f) => f.trigger.occasion)])];
  return occasions.flatMap((occasion) => rowsFor(occasion, fired, result, panel, names));
}

/** The panel with one count set, or removed when `value` is null. */
export function withCount(panel: PanelState, kind: CountKind, key: string, value: number | null): PanelState {
  const next: Record<string, number> = { ...panel[kind] };
  if (value === null) delete next[key];
  else next[key] = value;
  return { ...panel, [kind]: next };
}
