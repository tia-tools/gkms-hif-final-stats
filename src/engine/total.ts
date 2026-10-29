/**
 * The best-case bound (decision G1): every placement of the 本戦 schedule on each day-3 choice,
 * scored with the deck's abilities and P-items under 本戦's counts and the panel's changes, capped
 * per stat; the best one, and every rank's required total and margin against it.
 */

import type { CardDataFile, HeldCard } from "../data/contract.ts";
import { type Ability, type AbilityLine, type DrinkSource, abilityLines, deckSources, itemDrinks, needs } from "./abilities.ts";
import type { Counts } from "./count.ts";
import { type Day3, honsenCounts } from "./honsen-profile.ts";
import { RANKS, requiredTotal } from "./rating.ts";
import { PLACEMENTS, type Placement, capped, scheduleGains } from "./schedule.ts";
import { bestFinalStar } from "./star.ts";
import { type DeckSlot, type HeldItem, type Memory, type RankLine, type Stat, WAPPEN, sumStats } from "./types.ts";

/** What the player changed in the panel (decisions G3, G4, G12, G25); each replaces a derived default. */
export interface PanelState {
  occasions?: Readonly<Record<string, number>>;
  filters?: Readonly<Record<string, number>>;
  conditions?: Readonly<Record<string, number>>;
  /** Source key → fires left. */
  left?: Readonly<Record<string, number>>;
  day3?: Day3;
  /**
   * `uncountedKey` → the points the player gives what that reason leaves uncounted, on its stat. A
   * reason can also concern an effect the card data kept and this page counts; its value is then 0.
   */
  uncounted?: Readonly<Record<string, { stat: Stat; points: number }>>;
}

/** The panel's name for a held deck card's reason: the card id and the reason's place in its list. */
export function uncountedKey(cardId: string, reason: number): string {
  return `${cardId}#${reason}`;
}

export interface BestResult {
  placement: Placement;
  day3: Day3;
  counts: Counts;
  lines: AbilityLine[];
  /** Each stat at the end of 本戦, capped. */
  params: Record<Stat, number>;
  total: number;
  finalStar: number;
  ranks: RankLine[];
  /** The deck's cards the card data holds back, with the reasons (decision G12). */
  held: HeldCard[];
}

interface Context {
  memory: Memory;
  abilities: readonly Ability[];
  drinks: readonly DrinkSource[];
  needs: Readonly<Record<string, number>>;
  manual: readonly { stat: Stat; points: number }[];
  panel: PanelState;
  cap: number;
}

type Candidate = Omit<BestResult, "finalStar" | "ranks" | "held">;

function withPanel(counts: Counts, panel: PanelState): Counts {
  return {
    occasions: { ...counts.occasions, ...panel.occasions },
    filters: { ...counts.filters, ...panel.filters },
    conditions: { ...counts.conditions, ...panel.conditions },
    lessons: counts.lessons,
  };
}

function lessonsOn(placement: Placement): Record<Stat, number> {
  const lessons = { vocal: 0, dance: 0, visual: 0 };
  for (const lesson of placement.lessons) lessons[lesson.main] += 1;
  return lessons;
}

/** 本戦's counts for one placement and day 3; the P-items' drinks follow from the counts without them. */
function countsFor(ctx: Context, placement: Placement, day3: Day3): Counts {
  const input = { ...ctx.memory, day3, lessons: lessonsOn(placement), needs: ctx.needs, itemDrinks: 0 };
  const before = withPanel(honsenCounts(input), ctx.panel);
  return withPanel(honsenCounts({ ...input, itemDrinks: itemDrinks(ctx.drinks, before) }), ctx.panel);
}

function evaluate(ctx: Context, placement: Placement, day3: Day3): Candidate {
  const counts = countsFor(ctx, placement, day3);
  const lines = abilityLines(ctx.abilities, counts);
  const gains = scheduleGains(ctx.memory, placement);
  for (const line of lines) gains[line.effect.stat] += line.points;
  for (const extra of ctx.manual) gains[extra.stat] += extra.points;
  const params = capped(ctx.memory.params, gains, ctx.cap);
  return { placement, day3, counts, lines, params, total: sumStats(params) };
}

function rankLines(total: number, finalStar: number, provisional: boolean): RankLine[] {
  return RANKS.map(({ rank, rating }) => {
    const required = requiredTotal(rating, finalStar);
    const margin = total - required;
    return { rank, rating, required, margin, provisional: margin < 0 && provisional };
  });
}

/** The highest total the memory can reach in 本戦; on a tie, the first placement, 差し入れ before おでかけ. */
export function bestTotal(
  memory: Memory,
  deck: readonly DeckSlot[],
  items: readonly HeldItem[],
  data: CardDataFile,
  panel: PanelState,
  cap: number,
): BestResult {
  const { abilities, drinks } = deckSources(deck, new Map(data.cards.map((c) => [c.id, c])), items, panel.left ?? {});
  const wappenLeft = items.find((item) => item.itemId === WAPPEN)?.remaining ?? 0;
  const held = data.held.filter((h) => deck.some((slot) => slot.cardId === h.id));
  const reasons = held.flatMap((h) => h.reasons.map((_, i) => uncountedKey(h.id, i)));
  const manual = reasons.flatMap((key) => panel.uncounted?.[key] ?? []);
  const ctx: Context = { memory, abilities, drinks, needs: needs([...abilities, ...drinks], wappenLeft), manual, panel, cap };
  const days: readonly Day3[] = panel.day3 === undefined ? ["present", "activity"] : [panel.day3];
  const best = days
    .flatMap((day3) => PLACEMENTS.map((placement) => evaluate(ctx, placement, day3)))
    .reduce((a, b) => (b.total > a.total ? b : a));
  const acquired = best.counts.occasions["GetProduceCard"] ?? 0;
  const finalStar = bestFinalStar({ star: memory.star, affection: memory.affection, wappenLeft: Math.min(wappenLeft, acquired) });
  const provisional = reasons.some((key) => panel.uncounted?.[key] === undefined);
  return { ...best, finalStar, ranks: rankLines(best.total, finalStar, provisional), held };
}
