/** Which cards the picker shows. Pure. */

import type { Card, CardType, Rarity } from "../data/contract.ts";

export interface PickerFilter {
  query: string;
  type: CardType | null;
  rarity: Rarity | null;
}

const RARITY_ORDER: Readonly<Record<Rarity, number>> = { ssr: 0, sr: 1, r: 2 };

/** Cards matching the filter: SSR first, then the newest first (a higher id was released later). */
export function pickable(cards: readonly Card[], filter: PickerFilter): Card[] {
  const query = filter.query.trim();
  return cards
    .filter((c) => (filter.type === null || c.type === filter.type) && (filter.rarity === null || c.rarity === filter.rarity) && c.name.includes(query))
    .toSorted((a, b) => RARITY_ORDER[a.rarity] - RARITY_ORDER[b.rarity] || b.id.localeCompare(a.id));
}
