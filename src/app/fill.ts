/**
 * What a read screenshot puts into the form (decision G6: it only fills the form, which the player
 * corrects), which of those values the player should check, and each deck slot's next-best cards.
 * A value the screenshot hides or the reader cannot read keeps the form's value and is marked to
 * check, never guessed. Pure.
 */

import type { Card, LevelLimits } from "../data/contract.ts";
import { WAPPEN_FIRES_PER_RUN } from "../engine/star.ts";
import { type DeckSlot, STATS, type Stat, WAPPEN } from "../engine/types.ts";
import { isMedalMoja } from "../reader/custom.ts";
import { type HenseiRead, type KihonRead, type Read, type Slot, UNSURE } from "../reader/read.ts";
import type { FormState } from "./form.ts";

/** A card-granted item as the reader knows it: its id, and its fire limit when it has one. */
export interface KnownItem {
  id: string;
  cap?: number;
}

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

/** ワッペン, which the card data does not hold: at most 20 fires a run. */
const WAPPEN_ITEM: KnownItem = { id: WAPPEN, cap: WAPPEN_FIRES_PER_RUN };

/** The item a slot holds: ワッペン in the scenario slot, a known card item where its icon matched. */
function itemOf(slot: Slot, known: ReadonlyMap<string, KnownItem>): KnownItem | undefined {
  if (slot.state === "absent" || slot.state === "hidden" || slot.state === "spent") return undefined;
  if (slot.role === "scenario") return WAPPEN_ITEM;
  return slot.item === null ? undefined : known.get(slot.item.value);
}

/** Whether a held slot's item or fires left need checking; fires left above the limit cannot be. */
function doubtful(slot: Slot, item: KnownItem, left: Read<number> | null): boolean {
  if (slot.role !== "scenario" && !sure(slot.item)) return true;
  if (slot.state === "badge" && !sure(left)) return true;
  return left !== null && item.cap !== undefined && left.value > item.cap;
}

/**
 * The P-items the row shows: ワッペン and every matched サポート item, with fires left where shown.
 * Fires left above the item's limit keep their digits and are marked: the game cannot show them.
 */
function seenItems(read: KihonRead, known: ReadonlyMap<string, KnownItem>, unsure: string[]): Record<string, number | null> {
  const items: Record<string, number | null> = {};
  for (const slot of read.slots) {
    const item = itemOf(slot, known);
    if (item === undefined) continue;
    const left = slot.state === "badge" ? slot.left : null;
    items[item.id] = left?.value ?? null;
    if (doubtful(slot, item, left)) unsure.push(`items.${item.id}`);
  }
  return items;
}

/**
 * The held P-items after the read: what the row shows, and the form's own items the read could not
 * rule out, kept and marked. An item is ruled out only when its icon was compared with every slot,
 * the row is whole and every サポート slot it shows matched an item; ワッペン, when the row shows its
 * slot. A slot that matched nothing may hold an item no card grants, or one the matcher missed.
 */
function heldItems(form: FormState, read: KihonRead, known: ReadonlyMap<string, KnownItem>, unsure: string[]): Record<string, number | null> {
  const items = seenItems(read, known, unsure);
  const compared = new Set([...known.values()].map((k) => k.id));
  const rowCut = read.slots.some((s) => s.state === "hidden");
  const unmatched = read.slots.some((s) => s.role === "support" && s.item === null && (s.state === "none" || s.state === "badge"));
  const wappenSeen = read.slots.some((s) => s.role === "scenario" && s.state !== "absent" && s.state !== "hidden");
  for (const [id, left] of Object.entries(form.items)) {
    if (id in items) continue;
    const ruledOut = id === WAPPEN ? wappenSeen : !rowCut && !unmatched && compared.has(id);
    if (ruledOut) continue;
    items[id] = left;
    unsure.push(`items.${id}`);
  }
  return items;
}

/**
 * From a 基本情報 screenshot. `known` maps an item icon's asset id to its item, for every item whose
 * icon the reader compared.
 */
export function fromKihon(form: FormState, read: KihonRead, known: ReadonlyMap<string, KnownItem>): Filled {
  const unsure: string[] = [];
  const patch: Partial<FormState> = {
    params: stats(read.params, form.params, "params", unsure),
    bonusPermil: stats(read.bonusPermil, form.bonusPermil, "bonus", unsure),
    items: heldItems(form, read, known, unsure),
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
    if (best === undefined) {
      unsure.push(`deck.${i}`, `level.${i}`);
      return form.deck[i] ?? null;
    }
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
  if (patch.items !== undefined) {
    const items = patch.items;
    for (const id of new Set([...Object.keys(items), ...Object.keys(form.items)])) if (items[id] !== form.items[id] || id in items !== id in form.items) out.push(`items.${id}`);
  }
  patch.deck?.forEach((slot, i) => {
    const old = form.deck[i];
    if (slot?.cardId !== old?.cardId) out.push(`deck.${i}`);
    if (slot?.level !== old?.level) out.push(`level.${i}`);
  });
  return out;
}
