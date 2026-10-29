import type { Counts } from "./count.ts";
import type { Memory, Stat } from "./types.ts";

/** Day 3 of 本戦: 差し入れ or おでかけ (decision G4). */
export type Day3 = "present" | "activity";

/**
 * 選抜's counts for G3's "fires used in 選抜", a stopgap until the user gives them (decision G27):
 * the sibling's whole-run 汎用コンテ育成 profile less the 本戦 part its own choices imply. Every
 * lesson counts on any stat, since G3 assumes 選抜 used every fire it could.
 */
export const SENBATSU: Counts = {
  occasions: {
    EndLesson: 6,
    EndStepEventSchool: 4,
    EndAudition: 3,
    EndBeforeAuditionRefresh: 3,
    StartPresent: 3,
    EndStepEventActivity: 1,
    StartShop: 3,
    GetProduceCard: 19,
    DeleteProduceCard: 9,
    ChangeProduceCard: 2,
    CustomizeProduceCard: 2,
    GetProduceDrink: 4,
    GetProduceItem: 5,
  },
  filters: {
    "EndLesson.lessonKind.normal": 0,
    "GetProduceCard.rarity.ssr": 7,
    "GetProduceCard.cardType.mental": 13,
    "GetProduceCard.cardType.active": 7,
    "GetProduceCard.effectGroup": 10,
    "GetProduceCard.effectGroup.review": 14,
    "GetProduceCard.effectGroup.block": 12,
  },
  conditions: {},
  lessons: { vocal: 6, dance: 6, visual: 6 },
};

/** P-drinks in one 相談 lineup; a refresh brings 4 more (decision G24). */
const DRINKS_PER_LINEUP = 4;
/** P-drinks the user buys at the インターバル (decision G24). */
const INTERVAL_DRINKS = 2;
/** Deletions at the 相談 when the first P-item is メダルもじゃ (decision G24). */
const MEDAL_MOJA_DELETIONS = 2;

/**
 * Occasions the player plays toward the deck's remaining capped triggers, and the count each has
 * when nothing calls for more (decision G24): the day-3 card, the two 授業 changes, and the
 * インターバル's and 相談's other actions.
 */
const PLAYED_FOR: Readonly<Record<string, number>> = {
  GetProduceCard: 1,
  ChangeProduceCard: 2,
  UpgradeProduceCard: 0,
  CustomizeProduceCard: 0,
  StartCustomize: 0,
  BuyShopItemProduceCard: 0,
};

export interface HonsenInput extends Pick<Memory, "refreshesLeft" | "medalMoja"> {
  day3: Day3;
  /** Lessons whose main stat is each stat, from the placement. */
  lessons: Readonly<Record<Stat, number>>;
  /** Occasion → the most fires any capped trigger on it has left, ワッペン included. */
  needs: Readonly<Record<string, number>>;
  /** P-drinks the held P-items' fires grant. */
  itemDrinks: number;
}

/** 本戦's default counts: fixed by the schedule, or the user's play (decision G24). */
export function honsenCounts(input: HonsenInput): Counts {
  const bought = DRINKS_PER_LINEUP * (1 + input.refreshesLeft);
  const played = Object.fromEntries(
    Object.entries(PLAYED_FOR).map(([occasion, least]) => [occasion, Math.max(least, input.needs[occasion] ?? 0)]),
  );
  return {
    occasions: {
      EndLesson: 2,
      EndStepEventSchool: 2,
      EndAudition: 2,
      EndBeforeAuditionRefresh: 1,
      StartShop: 1,
      GetProduceItem: 1,
      StartPresent: input.day3 === "present" ? 1 : 0,
      EndStepEventActivity: input.day3 === "activity" ? 1 : 0,
      BuyShopItemProduceDrink: bought,
      GetProduceDrink: 1 + bought + INTERVAL_DRINKS + input.itemDrinks,
      DeleteProduceCard: input.medalMoja ? MEDAL_MOJA_DELETIONS : 0,
      ...played,
    },
    filters: { "EndLesson.lessonKind.normal": 0 },
    conditions: {},
    lessons: input.lessons,
  };
}
