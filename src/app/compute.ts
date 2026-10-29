/**
 * The form to the engine: the bound once the form holds every number it needs (decision G6). The
 * page never computes for a deck other than the one it shows: a deck card the data lacks, or a deck
 * while there is no card data, stops the computation and says why (decision G28). With no card data
 * and an empty deck, the memory alone is computed, as the manual form.
 */

import type { CardDataFile } from "../data/contract.ts";
import { type BestResult, bestTotal } from "../engine/total.ts";
import type { DeckSlot, HeldItem } from "../engine/types.ts";
import { type FormState, memoryOf } from "./form.ts";

export type Computed =
  | { result: BestResult; problem: null }
  | { result: null; problem: null }
  | { result: null; problem: { unknownCards: string[] } | { noCardData: true } | { error: string } };

const NO_CARDS: CardDataFile = { formatVersion: 1, levelLimits: { r: [20, 25, 30, 35, 40], sr: [30, 35, 40, 45, 50], ssr: [40, 45, 50, 55, 60] }, cards: [], held: [] };

export function compute(form: FormState, data: CardDataFile | null, cap: number): Computed {
  const deck = form.deck.filter((s): s is DeckSlot => s !== null);
  if (data === null && deck.length > 0) return { result: null, problem: { noCardData: true } };
  const known = new Set((data ?? NO_CARDS).cards.map((c) => c.id));
  const unknownCards = deck.filter((s) => !known.has(s.cardId)).map((s) => s.cardId);
  if (unknownCards.length > 0) return { result: null, problem: { unknownCards } };
  const memory = memoryOf(form);
  if (memory === null) return { result: null, problem: null };
  const items: HeldItem[] = Object.entries(form.items).map(([itemId, remaining]) => (remaining === null ? { itemId } : { itemId, remaining }));
  try {
    return { result: bestTotal(memory, deck, items, data ?? NO_CARDS, form.panel, cap), problem: null };
  } catch (e) {
    return { result: null, problem: { error: e instanceof Error ? e.message : "unknown error" } };
  }
}
