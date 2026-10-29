/**
 * What a read screenshot puts into the form (decision G6: it only fills the form, which the player
 * corrects), which of those values the player should check, and each deck slot's next-best cards.
 * A value the screenshot hides or the reader cannot read keeps the form's value and is marked to
 * check, never guessed. Pure.
 */

import type { Card, LevelLimits } from "../data/contract.ts";
import { type DeckSlot, STATS, type Stat, WAPPEN } from "../engine/types.ts";
import { isMedalMoja } from "../reader/custom.ts";
import { type HenseiRead, type KihonRead, type Read, UNSURE } from "../reader/read.ts";
import type { FormState } from "./form.ts";

export interface Filled {
  patch: Partial<FormState>;
  /**
   * The fields to check, by key: `star`, `affection`, `params.<stat>`, `bonus.<stat>`,
   * `medalMoja`, `items.<itemId>`, `deck.<i>`, `level.<i>` and `refreshes`.
   */
  unsure: string[];
  /** Per deck slot, the cards that fit the tile next best, best first. */
  alternatives?: string[][];
}

const sure = (r: { confidence: number } | null | undefined) => r != null && r.confidence >= UNSURE;

function stats(read: Record<Stat, Read<number> | null>, old: Record<Stat, number | null>, key: string, unsure: string[]): Record<Stat, number | null> {
  const out = { ...old };
  for (const s of STATS) {
    const r = read[s];
    if (r !== null) out[s] = r.value;
    if (!sure(r)) unsure.push(`${key}.${s}`);
  }
  return out;
}

/** The P-items the row holds: ワッペン and every matched サポート item, with fires left where shown. */
function heldItems(read: KihonRead, itemIds: ReadonlyMap<string, string>, unsure: string[]): Record<string, number | null> {
  const items: Record<string, number | null> = {};
  for (const slot of read.slots) {
    const left = slot.state === "badge" ? slot.left : null;
    const id = slot.role === "scenario" ? WAPPEN : slot.item === null ? undefined : itemIds.get(slot.item.value);
    if (id === undefined || slot.state === "absent" || slot.state === "spent") continue;
    items[id] = left?.value ?? null;
    const sureItem = slot.role === "scenario" || sure(slot.item);
    if (!sureItem || (slot.state === "badge" && !sure(left))) unsure.push(`items.${id}`);
  }
  return items;
}

/**
 * From a 基本情報 screenshot. `itemIds` maps an item icon's asset id to its item id, for every item
 * a card grants.
 */
export function fromKihon(form: FormState, read: KihonRead, itemIds: ReadonlyMap<string, string>): Filled {
  const unsure: string[] = [];
  const patch: Partial<FormState> = {
    params: stats(read.params, form.params, "params", unsure),
    bonusPermil: stats(read.bonusPermil, form.bonusPermil, "bonus", unsure),
    items: heldItems(read, itemIds, unsure),
  };
  if (read.star !== null) patch.star = read.star.value;
  if (!sure(read.star)) unsure.push("star");
  if (read.affection !== null) patch.affection = read.affection.value;
  if (!sure(read.affection)) unsure.push("affection");
  if (read.custom !== null) patch.medalMoja = isMedalMoja(read.custom);
  if (!sure(read.custom?.character) || !sure(read.custom?.accessory)) unsure.push("medalMoja");
  return { patch, unsure };
}

/** The level a card of this rarity reaches at its 凸, when the Lv cannot be read. */
function limitOf(card: Card | undefined, marks: number, limits: LevelLimits | null): number | undefined {
  return card === undefined ? undefined : limits?.[card.rarity][Math.min(4, Math.max(0, marks))];
}

/** From a 編成 screenshot. A tile whose Lv cannot be read takes its card's level at the lit 凸. */
export function fromHensei(form: FormState, read: HenseiRead, cards: ReadonlyMap<string, Card>, limits: LevelLimits | null): Filled {
  const unsure: string[] = [];
  const deck: (DeckSlot | null)[] = read.tiles.map((tile, i) => {
    const best = tile.cards[0];
    if (best === undefined) return form.deck[i] ?? null;
    const limit = limitOf(cards.get(best.id), tile.marks, limits);
    const level = tile.level?.value ?? limit ?? 1;
    if (tile.cardConfidence < UNSURE) unsure.push(`deck.${i}`);
    if (!sure(tile.level) || (limit !== undefined && level > limit)) unsure.push(`level.${i}`);
    return { cardId: best.id, level };
  });
  const patch: Partial<FormState> = { deck };
  if (read.refreshes !== null) patch.refreshesLeft = read.refreshes.value;
  if (!sure(read.refreshes)) unsure.push("refreshes");
  return { patch, unsure, alternatives: read.tiles.map((t) => t.cards.slice(1).map((c) => c.id)) };
}

/** The keys a form edit settles: each field the patch changes, so its mark to check goes. */
export function touchedKeys(form: FormState, patch: Partial<FormState>): string[] {
  const out: string[] = [];
  for (const s of STATS) {
    if (patch.params !== undefined && patch.params[s] !== form.params[s]) out.push(`params.${s}`);
    if (patch.bonusPermil !== undefined && patch.bonusPermil[s] !== form.bonusPermil[s]) out.push(`bonus.${s}`);
  }
  const plain = { star: "star", affection: "affection", medalMoja: "medalMoja", refreshesLeft: "refreshes" } as const;
  for (const [field, key] of Object.entries(plain)) if (field in patch) out.push(key);
  for (const id of Object.keys(patch.items ?? {})) if (patch.items?.[id] !== form.items[id]) out.push(`items.${id}`);
  patch.deck?.forEach((slot, i) => {
    const old = form.deck[i];
    if (slot?.cardId !== old?.cardId) out.push(`deck.${i}`);
    if (slot?.level !== old?.level) out.push(`level.${i}`);
  });
  return out;
}
