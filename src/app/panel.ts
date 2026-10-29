/**
 * The panel's rows (decision G25): each count the bound used, as it stands, with whether the
 * player changed it. Grouped by occasion: the occasion, then its filters and conditions, then the
 * fires left of the abilities on it. Pure.
 */

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

function occasionsOf(result: BestResult): string[] {
  const seen = new Set<string>(["GetProduceCard", "GetProduceDrink"]);
  for (const line of result.lines) if (line.effect.trigger) seen.add(line.effect.trigger.occasion);
  return [...seen];
}

type Line = BestResult["lines"][number];

function filterRows(occasion: string, line: Line, result: BestResult, panel: PanelState): CountRow[] {
  const total = result.counts.occasions[occasion] ?? 0;
  return (line.effect.trigger?.filters ?? [])
    .filter((f) => f.family !== "lessonStat")
    .map((f) => {
      const key = filterKey(occasion, f);
      const value = result.counts.filters[key] ?? result.counts.filters[`${occasion}.${f.family}`] ?? total;
      return { kind: "filters", key, label: memberLabel(f.family, f.member), value, changed: panel.filters?.[key] !== undefined, depth: 1 };
    });
}

function conditionRows(occasion: string, line: Line, result: BestResult, panel: PanelState): CountRow[] {
  const total = result.counts.occasions[occasion] ?? 0;
  return (line.effect.trigger?.conditions ?? []).map((c) => {
    const key = conditionKey(occasion, c);
    return { kind: "conditions", key, label: conditionLabel(c), value: result.counts.conditions[key] ?? total, changed: panel.conditions?.[key] !== undefined, depth: 1 };
  });
}

function leftRows(line: Line, panel: PanelState, names: CardNames): CountRow[] {
  if (line.left === undefined) return [];
  const label = `${names.get(line.cardId) ?? line.cardId}${line.effect.itemName ? `「${line.effect.itemName}」` : ""}`;
  return [{ kind: "left", key: line.key, label, value: line.left, changed: panel.left?.[line.key] !== undefined, depth: 1 }];
}

function rowsFor(occasion: string, result: BestResult, panel: PanelState, names: CardNames): CountRow[] {
  const head: CountRow = {
    kind: "occasions",
    key: occasion,
    label: occasionLabel(occasion),
    value: result.counts.occasions[occasion] ?? 0,
    changed: panel.occasions?.[occasion] !== undefined,
    depth: 0,
  };
  const lines = result.lines.filter((line) => line.effect.trigger?.occasion === occasion);
  const rows = lines.flatMap((line) => [...filterRows(occasion, line, result, panel), ...conditionRows(occasion, line, result, panel), ...leftRows(line, panel, names)]);
  const seen = new Set<string>();
  return [head, ...rows.filter((row) => !seen.has(`${row.kind} ${row.key}`) && seen.add(`${row.kind} ${row.key}`))];
}

export function panelRows(result: BestResult, panel: PanelState, names: CardNames): CountRow[] {
  return occasionsOf(result).flatMap((occasion) => rowsFor(occasion, result, panel, names));
}

/** The panel with one count set, or removed when `value` is null. */
export function withCount(panel: PanelState, kind: CountKind, key: string, value: number | null): PanelState {
  const next: Record<string, number> = { ...panel[kind] };
  if (value === null) delete next[key];
  else next[key] = value;
  return { ...panel, [kind]: next };
}
