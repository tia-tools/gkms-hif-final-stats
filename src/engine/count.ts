/**
 * How often an effect's trigger happens, ported from gakumas-supportcards' src/engine/count.ts
 * (its docs/adr/0004) as of d08f3de:
 *
 *   occurrences = min( the occasion's count,
 *                      each filter's count   (lesson stat: the lessons on that stat; else the member's
 *                                             count, else the family's, else the occasion's: decision G25),
 *                      each condition's count where one is stated (unstated = met every time),
 *                      the fires left )
 * and 0 when the trigger is restricted to a scenario other than H.I.F.
 */

import type { ConditionRef, FilterRef, ParsedTrigger } from "../data/contract.ts";
import { STATS, type Stat } from "./types.ts";

/** The sibling's id for H.I.F., the scenario a trigger may be restricted to and still fire here. */
export const HIF_SCENARIO = "hif";

/** How many times each thing happens: what `occurrences` narrows. */
export interface Counts {
  occasions: Readonly<Record<string, number>>;
  /** `occasion.family.member`, or `occasion.family` for every member the family does not name. */
  filters: Readonly<Record<string, number>>;
  /** `conditionKey` → how many occurrences meet it. */
  conditions: Readonly<Record<string, number>>;
  /** Lessons whose main stat is each stat, for the lesson-stat filter. */
  lessons: Readonly<Record<Stat, number>>;
}

function boundOf(c: ConditionRef): string {
  if (c.min > 0 && c.max > 0) return `${c.min}to${c.max}`;
  return c.max > 0 ? `le${c.max}` : `ge${c.min}`;
}

/**
 * A condition's name, as the sibling writes it: occasion, the game's word, the counted cards if
 * any, and the bound: `EndLesson.produce_card_count.ge20`, `StartCustomize.dance.le900`.
 */
export function conditionKey(occasion: string, c: ConditionRef): string {
  const subject = (c.subject ?? []).map((f) => `-${f.family}.${f.member}`).join("");
  return `${occasion}.${c.kind}${subject}.${boundOf(c)}`;
}

export function filterKey(occasion: string, f: FilterRef): string {
  return `${occasion}.${f.family}.${f.member}`;
}

function isStat(member: string): member is Stat {
  return STATS.some((stat) => stat === member);
}

function filterCount(occasion: string, f: FilterRef, counts: Counts, n: number): number {
  if (f.family === "lessonStat") return isStat(f.member) ? counts.lessons[f.member] : 0;
  return counts.filters[filterKey(occasion, f)] ?? counts.filters[`${occasion}.${f.family}`] ?? n;
}

/** How many times `trigger` fires under `counts`, and never more than `left` when one is given. */
export function occurrences(trigger: ParsedTrigger, counts: Counts, left?: number): number {
  if (trigger.scenario !== undefined && trigger.scenario !== HIF_SCENARIO) return 0;
  let n = counts.occasions[trigger.occasion] ?? 0;
  for (const f of trigger.filters ?? []) n = Math.min(n, filterCount(trigger.occasion, f, counts, n));
  for (const c of trigger.conditions ?? []) n = Math.min(n, counts.conditions[conditionKey(trigger.occasion, c)] ?? n);
  return left === undefined ? n : Math.min(n, left);
}
