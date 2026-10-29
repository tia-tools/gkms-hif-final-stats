/**
 * The P-items the form offers (decision G13): ワッペン, and the items the deck's cards can grant.
 * Pure.
 */

import type { Card } from "../data/contract.ts";
import { WAPPEN } from "../engine/types.ts";

export interface ItemChoice {
  itemId: string;
  name: string;
  /** The w48 icon's asset id; ワッペン has none in the image library. */
  assetId?: string;
  /** Its fire limit, when it has one: the icon then shows the fires left. */
  cap?: number;
}

/** H.I.Fワッペン fires at most 20 times per run. */
const WAPPEN_CHOICE: ItemChoice = { itemId: WAPPEN, name: "H.I.Fワッペン", cap: 20 };

export function itemChoices(deck: readonly (Card | undefined)[]): ItemChoice[] {
  const seen = new Set<string>();
  const out: ItemChoice[] = [WAPPEN_CHOICE];
  for (const card of deck) {
    for (const grant of card?.items ?? []) {
      if (seen.has(grant.itemId)) continue;
      seen.add(grant.itemId);
      out.push({ itemId: grant.itemId, name: grant.itemName, assetId: grant.assetId, ...(grant.cap ? { cap: grant.cap } : {}) });
    }
  }
  return out;
}
