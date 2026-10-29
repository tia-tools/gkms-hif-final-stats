/**
 * The form to the engine: the bound once the form holds every number it needs (decision G6). Deck
 * slots naming a card the data lacks are left out and reported, and with no card data at all the
 * deck is empty, so the page never computes with part of the card list.
 */

import type { CardDataFile } from "../data/contract.ts";
import { type BestResult, bestTotal } from "../engine/total.ts";
import type { DeckSlot, HeldItem } from "../engine/types.ts";
import { type FormState, memoryOf } from "./form.ts";

export interface Computed {
  result: BestResult | null;
  /** Deck slots whose card the data does not have. */
  unknownCards: string[];
}

const NO_CARDS: CardDataFile = { formatVersion: 1, levelLimits: { r: [20, 25, 30, 35, 40], sr: [30, 35, 40, 45, 50], ssr: [40, 45, 50, 55, 60] }, cards: [], held: [] };

export function compute(form: FormState, data: CardDataFile | null, cap: number): Computed {
  const known = new Set((data ?? NO_CARDS).cards.map((c) => c.id));
  const slots = form.deck.filter((s): s is DeckSlot => s !== null);
  const deck = slots.filter((s) => known.has(s.cardId));
  const unknownCards = data === null ? [] : slots.filter((s) => !known.has(s.cardId)).map((s) => s.cardId);
  const memory = memoryOf(form);
  if (memory === null) return { result: null, unknownCards };
  const items: HeldItem[] = Object.entries(form.items).map(([itemId, remaining]) => (remaining === null ? { itemId } : { itemId, remaining }));
  return { result: bestTotal(memory, deck, items, data ?? NO_CARDS, form.panel, cap), unknownCards };
}
