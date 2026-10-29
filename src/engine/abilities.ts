/**
 * What the deck can still fire in 本戦: each support card's skills at its level, and the effects and
 * P-drinks of the P-items the memory holds, with the fires each has left (decision G3), and what
 * those fires add under a set of counts.
 */

import type { Card, ClassifiedEffect, ParsedTrigger } from "../data/contract.ts";
import { type Counts, conditionKey, occurrences } from "./count.ts";
import { SENBATSU } from "./honsen-profile.ts";
import type { DeckSlot, HeldItem } from "./types.ts";

/** Something that fires on a trigger, with the fires it has left; `left` absent when nothing limits it. */
export interface Source {
  /** The panel's name for it, stable across card levels; an item's effects and drinks share one. */
  key: string;
  cardId: string;
  trigger: ParsedTrigger;
  left?: number;
}

/** A support card's skill, or a held P-item's effect. */
export interface Ability extends Source {
  effect: ClassifiedEffect;
}

/** A held P-item that grants P-drinks when it fires (decision G13). */
export interface DrinkSource extends Source {
  itemId: string;
  perFire: number;
}

export interface AbilityLine {
  key: string;
  cardId: string;
  effect: ClassifiedEffect;
  fires: number;
  points: number;
}

/** The card's effects at `level`: the last breakpoint at or below it. */
export function effectsAt(card: Card, level: number): readonly ClassifiedEffect[] {
  let effects = card.breakpoints[0]?.effects ?? [];
  for (const breakpoint of card.breakpoints) if (breakpoint.minLevel <= level) effects = breakpoint.effects;
  return effects;
}

function triggerKey(t: ParsedTrigger): string {
  const filters = (t.filters ?? []).map((f) => `${f.family}.${f.member}`);
  const conditions = (t.conditions ?? []).map((c) => conditionKey(t.occasion, c));
  return [t.occasion, ...filters, ...conditions].join("+");
}

/** A skill's fires left: its cap less what 選抜 used of it (G3, G27); absent when uncapped. */
function skillLeft(effect: ClassifiedEffect, trigger: ParsedTrigger): number | undefined {
  if (!effect.cap) return undefined;
  return effect.cap - Math.min(effect.cap, occurrences(trigger, SENBATSU));
}

/** Leaves out what cannot fire again or is already in the memory's numbers (decision G15). */
function firesInHonsen(effect: ClassifiedEffect): ParsedTrigger | undefined {
  if (effect.kind === "event" || effect.bonus === true || effect.trigger?.occasion === "ProduceStart") return undefined;
  return effect.trigger;
}

function cardAbilities(slot: DeckSlot, card: Card, held: ReadonlyMap<string, HeldItem>, overrides: Readonly<Record<string, number>>): Ability[] {
  return effectsAt(card, slot.level).flatMap((effect): Ability[] => {
    const trigger = firesInHonsen(effect);
    if (trigger === undefined) return [];
    if (effect.kind === "item") {
      const item = effect.itemId === undefined ? undefined : held.get(effect.itemId);
      if (item === undefined) return [];
      const key = `${card.id}/${item.itemId}`;
      return [{ key, cardId: card.id, effect, trigger, left: overrides[key] ?? item.remaining ?? (effect.cap || undefined) }];
    }
    const key = `${card.id}/skill/${effect.stat}/${triggerKey(trigger)}`;
    return [{ key, cardId: card.id, effect, trigger, left: overrides[key] ?? skillLeft(effect, trigger) }];
  });
}

function cardDrinks(card: Card, held: ReadonlyMap<string, HeldItem>, overrides: Readonly<Record<string, number>>): DrinkSource[] {
  return (card.items ?? []).flatMap((grant): DrinkSource[] => {
    const item = held.get(grant.itemId);
    if (item === undefined || grant.drinks === undefined) return [];
    const key = `${card.id}/${grant.itemId}`;
    const left = overrides[key] ?? item.remaining ?? grant.cap;
    return [{ key, cardId: card.id, itemId: grant.itemId, perFire: grant.drinks.perFire, trigger: grant.drinks.trigger, left }];
  });
}

/** Every ability and drink-granting P-item of the deck, in deck order; `overrides` are the panel's fires left by key. */
export function deckSources(
  deck: readonly DeckSlot[],
  cards: ReadonlyMap<string, Card>,
  items: readonly HeldItem[],
  overrides: Readonly<Record<string, number>>,
): { abilities: Ability[]; drinks: DrinkSource[] } {
  const held = new Map(items.map((item) => [item.itemId, item]));
  const resolved = deck.map((slot) => {
    const card = cards.get(slot.cardId);
    if (card === undefined) throw new RangeError(`no support card ${slot.cardId} in the card data`);
    return { slot, card };
  });
  return {
    abilities: resolved.flatMap(({ slot, card }) => cardAbilities(slot, card, held, overrides)),
    drinks: resolved.flatMap(({ card }) => cardDrinks(card, held, overrides)),
  };
}

/**
 * Per occasion, the most fires any capped trigger on it has left; ワッペン's on card acquisition.
 * The player plays toward these (decision G24).
 */
export function needs(sources: readonly Source[], wappenLeft: number): Record<string, number> {
  const out: Record<string, number> = { GetProduceCard: wappenLeft };
  for (const source of sources) {
    if (source.left !== undefined) out[source.trigger.occasion] = Math.max(out[source.trigger.occasion] ?? 0, source.left);
  }
  return out;
}

export function abilityLines(abilities: readonly Ability[], counts: Counts): AbilityLine[] {
  return abilities.map((a) => {
    const fires = occurrences(a.trigger, counts, a.left);
    return { key: a.key, cardId: a.cardId, effect: a.effect, fires, points: fires * a.effect.value };
  });
}

/** The P-drinks the held P-items grant under `counts`. */
export function itemDrinks(drinks: readonly DrinkSource[], counts: Counts): number {
  return drinks.reduce((sum, d) => sum + occurrences(d.trigger, counts, d.left) * d.perFire, 0);
}
