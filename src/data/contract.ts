/**
 * The shape of the card data gakumas-supportcards publishes at /data/cards.v1.json
 * (docs/adr/0001 here; docs/adr/0010 and data/card-data-file.ts there). The types are copied from
 * that repository's src/engine/types.ts as of its merge d08f3de, with their comments. A change
 * to any of them there bumps the file's format version and name (cards.v2.json); copy the new
 * shapes here then, never edit these on their own.
 */

import type { Stat } from "../engine/types.ts";

export type CardType = Stat | "assist";
export type Rarity = "r" | "sr" | "ssr";
export type Plan = "common" | "sense" | "logic" | "anomaly";
export type EffectKind = "skill" | "event" | "item";

/** Which occurrences of an occasion qualify: a Vocal lesson, an SP lesson, a mental skill card, an SSR card, a card named 「基本」, a 好印象 card. */
export const FILTER_FAMILIES = ["lessonStat", "lessonKind", "cardType", "rarity", "cardName", "effectGroup"] as const;
export type FilterFamily = (typeof FILTER_FAMILIES)[number];
export interface FilterRef {
  family: FilterFamily;
  member: string;
}

/** A state of the run that must hold when the occasion happens: a stat, stamina, or a number of held cards within a range. */
export interface ConditionRef {
  /** The game's own word: `vocal`, `stamina_ratio`, `produce_card_count`, `produce_card_search_count`, … */
  kind: string;
  /** `produce_card_search_count` only: which held cards are counted; absent = all of them. */
  subject?: FilterRef[];
  /** Inclusive bounds as written in the trigger id (`0500` for 50% stamina); 0 = unbounded on that side. */
  min: number;
  max: number;
}

/** A trigger id read as occasion, filters and conditions. */
export interface ParsedTrigger {
  /** `ProduceTrigger.phaseType` without its `ProducePhaseType_` prefix, e.g. `EndLesson`. */
  occasion: string;
  filters?: FilterRef[];
  conditions?: ConditionRef[];
  /** Set when the trigger fires in one scenario only: that scenario's id here, or the game's token for one this site does not ship. */
  scenario?: string;
}

export interface ClassifiedEffect {
  stat: Stat;
  /** Flat points, or tenths of a percent for パラメータボーナス+ (85 = 8.5%). */
  value: number;
  kind: EffectKind;
  /**
   * Per-run cap on occurrences: `ProduceSkill.activationCount` for skills,
   * `ProduceItem.fireLimit` for items. Absent or 0 = unlimited.
   */
  cap?: number;
  /** Items only: the granting P-item, for the breakdown label. */
  itemId?: string;
  itemName?: string;
  /**
   * The effect's trigger as occasion, filters and conditions; absent for
   * `kind: "event"`, a card's own サポートイベント reward, which has no trigger.
   */
  trigger?: ParsedTrigger;
  /** True for パラメータボーナス+: `value` is tenths of a percent of the profile's bonus base, not points per occurrence. */
  bonus?: true;
}

/** A card the sibling's table does not show because one of its effects cannot be counted. */
export interface HeldCard {
  id: string;
  name: string;
  /** One line per distinct cause, naming the trigger piece or effect type a person has to decide about. */
  reasons: string[];
}

export interface Breakpoint {
  minLevel: number;
  effects: ClassifiedEffect[];
  /** Own-event parameter multiplier at this level in permil, 0 when none. */
  eventBonusPermil: number;
}

/**
 * A P-item one of the card's events grants, listed when the item has a countable
 * stat effect (those effects sit in the breakpoints with `itemId`) or grants P-drinks.
 */
export interface ItemGrant {
  itemId: string;
  itemName: string;
  /** The game's icon asset, e.g. `img_general_pitem_2-004`. */
  assetId: string;
  /** `ProduceItem.fireLimit`; absent = unlimited. */
  cap?: number;
  /** Set when a fire grants P-drinks: how many, and on which trigger; the drinks raise the run's Pドリンク獲得 count for every card when the item is in the deck. */
  drinks?: { perFire: number; trigger: ParsedTrigger };
}

export interface Card {
  id: string;
  name: string;
  assetId: string;
  type: CardType;
  rarity: Rarity;
  plan: Plan;
  /** Sorted by minLevel ascending; the first entry is the card at level 1. */
  breakpoints: Breakpoint[];
  /** P-items the card grants that count for something, sorted by item id; absent when none. */
  items?: readonly ItemGrant[];
  /** The card has an SP発生率+ skill from level 1. It gives no parameters and is not among the effects. */
  spRate?: true;
}

/** Card level at 凸0..凸4, per rarity. */
export type LevelLimits = Record<Rarity, readonly [number, number, number, number, number]>;

/** The format version this page reads. */
export const CARD_DATA_FORMAT_VERSION = 1;

/** The whole file: every card as generated, held cards included, and the held cards with their reasons. */
export interface CardDataFile {
  formatVersion: typeof CARD_DATA_FORMAT_VERSION;
  levelLimits: LevelLimits;
  cards: readonly Card[];
  held: readonly HeldCard[];
}
