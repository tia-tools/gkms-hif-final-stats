/**
 * The DMM sample in temp/dmm/01/ as engine input, for tests: the memory read off its 基本情報 tab,
 * the deck off its 編成 tab (cards matched by art, levels by eye), and the P-items it holds
 * (docs/plans/EXECPLAN_HIF_FINAL_STATS.md § Surprises & Discoveries). Card data is the fixture,
 * gakumas-supportcards' real cards.v1.json.
 */

import type { CardDataFile } from "../data/contract.ts";
import { parseCardData } from "../data/load.ts";
import { type DeckSlot, type HeldItem, type Memory, WAPPEN } from "../engine/types.ts";

export const CARD_DATA: CardDataFile = parseCardData(
  JSON.parse(await Bun.file(new URL("../data/fixtures/cards.v1.json", import.meta.url)).text()),
);

export const DMM_MEMORY: Memory = {
  params: { vocal: 1982, dance: 2468, visual: 1050 },
  bonusPermil: { vocal: 371, dance: 598, visual: 288 },
  star: 810,
  affection: 37,
  refreshesLeft: 1,
  medalMoja: false,
};

export const DMM_DECK: readonly DeckSlot[] = [
  { cardId: "s_card-3-0099", level: 60 }, // もうすぐ本番ですね
  { cardId: "s_card-3-0062", level: 60 }, // よくやったな、倉本。
  { cardId: "s_card-2-0007", level: 50 }, // ふわふわでワクワク (SR)
  { cardId: "s_card-3-0082", level: 60 }, // なぜこんなところにッ！？
  { cardId: "s_card-3-0066", level: 60 }, // 放っておけない気になる子
  { cardId: "s_card-3-0069", level: 60 }, // いつまでも続けばいいのに
];

export const DMM_ITEMS: readonly HeldItem[] = [
  { itemId: WAPPEN, remaining: 4 },
  { itemId: "pitem_03-3-263-0", remaining: 1 }, // 完全制覇でポン
  { itemId: "pitem_00-3-352-0", remaining: 1 }, // 素敵なお仕事
];
