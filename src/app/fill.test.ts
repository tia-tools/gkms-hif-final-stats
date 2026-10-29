import { describe, expect, test } from "bun:test";
import type { Card } from "../data/contract.ts";
import { WAPPEN } from "../engine/types.ts";
import type { CustomRead } from "../reader/custom.ts";
import type { HenseiRead, KihonRead, Read, TileRead } from "../reader/read.ts";
import { CARD_DATA } from "../test-support/dmm.ts";
import { fromHensei, fromKihon } from "./fill.ts";
import { emptyForm } from "./form.ts";

const sure = <T>(value: T): Read<T> => ({ value, confidence: 0.9 });
const unsure = <T>(value: T): Read<T> => ({ value, confidence: 0.1 });

const custom = (character: CustomRead["character"]["value"], accessory: CustomRead["accessory"]["value"]): CustomRead => ({
  character: sure(character),
  accessory: sure(accessory),
});

function kihon(over: Partial<KihonRead> = {}): KihonRead {
  return {
    tab: "kihon",
    star: sure(810),
    params: { vocal: sure(1982), dance: sure(2468), visual: sure(1050) },
    bonusPermil: { vocal: sure(371), dance: sure(598), visual: sure(288) },
    affection: sure(37),
    slots: [
      { role: "custom", item: null, state: "badge", left: sure(1) },
      { role: "pidol", item: null, state: "none" },
      { role: "scenario", item: null, state: "badge", left: sure(4) },
      { role: "support", item: sure("img_general_pitem_3-352"), state: "badge", left: sure(1) },
      { role: "support", item: null, state: "none" },
      { role: "support", item: sure("img_general_pitem_3-263"), state: "spent" },
      { role: "support", item: sure("img_general_pitem_2-004"), state: "none" },
    ],
    custom: custom("もじゃ", "花"),
    ...over,
  };
}

const ITEM_IDS = new Map([
  ["img_general_pitem_3-352", "pitem_00-3-352-0"],
  ["img_general_pitem_3-263", "pitem_03-3-263-0"],
  ["img_general_pitem_2-004", "pitem_00-2-004-0"],
]);

describe("fromKihon", () => {
  test("every value read surely goes into the form, nothing to check", () => {
    const { patch, unsure: check } = fromKihon(emptyForm(), kihon(), ITEM_IDS);
    expect(patch).toEqual({
      params: { vocal: 1982, dance: 2468, visual: 1050 },
      bonusPermil: { vocal: 371, dance: 598, visual: 288 },
      star: 810,
      affection: 37,
      medalMoja: false,
      // ワッペン from the scenario slot; a spent item and an unknown one are not held.
      items: { [WAPPEN]: 4, "pitem_00-3-352-0": 1, "pitem_00-2-004-0": null },
    });
    expect(check).toEqual([]);
  });

  test("an unsure value is still filled in, and marked", () => {
    const read = kihon({ params: { vocal: unsure(1882), dance: sure(2468), visual: sure(1050) } });
    const { patch, unsure: check } = fromKihon(emptyForm(), read, ITEM_IDS);
    expect(patch.params?.vocal).toBe(1882);
    expect(check).toEqual(["params.vocal"]);
  });

  test("a hidden value keeps the form's and is marked", () => {
    const form = { ...emptyForm(), affection: 36 };
    const { patch, unsure: check } = fromKihon(form, kihon({ affection: null }), ITEM_IDS);
    expect("affection" in patch).toBe(false);
    expect(check).toEqual(["affection"]);
  });

  test("もじゃ with the メダル sets メダルもじゃ; an unread カスタム item is marked", () => {
    expect(fromKihon(emptyForm(), kihon({ custom: custom("もじゃ", "メダル") }), ITEM_IDS).patch.medalMoja).toBe(true);
    expect(fromKihon(emptyForm(), kihon({ custom: null }), ITEM_IDS).unsure).toEqual(["medalMoja"]);
  });

  test("an item matched unsurely, or its fires left read unsurely, is marked", () => {
    const slots = kihon().slots.map((s, k) => (k === 3 ? { role: "support" as const, item: unsure("img_general_pitem_3-352"), state: "badge" as const, left: sure(1) } : s));
    expect(fromKihon(emptyForm(), kihon({ slots }), ITEM_IDS).unsure).toEqual(["items.pitem_00-3-352-0"]);
  });
});

const CARDS = new Map(CARD_DATA.cards.map((c): [string, Card] => [c.id, c]));

function tile(id: string, over: Partial<TileRead> = {}): TileRead {
  return { cards: [{ id, score: 10 }, { id: "s_card-3-0001", score: 200 }, { id: "s_card-3-0042", score: 300 }], cardConfidence: 0.95, level: sure(60), marks: 4, ...over };
}

function hensei(tiles: TileRead[]): HenseiRead {
  return { tab: "hensei", tiles, refreshes: sure(1) };
}

describe("fromHensei", () => {
  const six = (t: (i: number) => TileRead) => Array.from({ length: 6 }, (_, i) => t(i));

  test("each tile's best card at its level, the next two offered", () => {
    const { patch, unsure: check, alternatives } = fromHensei(emptyForm(), hensei(six(() => tile("s_card-3-0099"))), CARDS, CARD_DATA.levelLimits);
    expect(patch.deck?.[0]).toEqual({ cardId: "s_card-3-0099", level: 60 });
    expect(patch.refreshesLeft).toBe(1);
    expect(check).toEqual([]);
    expect(alternatives?.[0]).toEqual(["s_card-3-0001", "s_card-3-0042"]);
  });

  test("an unread Lv takes the card's level at its lit 凸, and is marked", () => {
    // An SSR at 2凸 is Lv50.
    const tiles = six((i) => (i === 0 ? tile("s_card-3-0099", { level: null, marks: 2 }) : tile("s_card-3-0099")));
    const { patch, unsure: check } = fromHensei(emptyForm(), hensei(tiles), CARDS, CARD_DATA.levelLimits);
    expect(patch.deck?.[0]).toEqual({ cardId: "s_card-3-0099", level: 50 });
    expect(check).toEqual(["level.0"]);
  });

  test("a Lv above what its lit 凸 allows, or an unsure card, is marked", () => {
    const tiles = six((i) => (i === 1 ? tile("s_card-3-0099", { marks: 2 }) : i === 2 ? tile("s_card-3-0099", { cardConfidence: 0.2 }) : tile("s_card-3-0099")));
    expect(fromHensei(emptyForm(), hensei(tiles), CARDS, CARD_DATA.levelLimits).unsure).toEqual(["level.1", "deck.2"]);
  });

  test("without card candidates a slot keeps the form's card", () => {
    const form = { ...emptyForm(), deck: [{ cardId: "s_card-3-0062", level: 60 }, null, null, null, null, null] };
    const { patch } = fromHensei(form, hensei(six(() => tile("x", { cards: [] }))), CARDS, CARD_DATA.levelLimits);
    expect(patch.deck?.[0]).toEqual({ cardId: "s_card-3-0062", level: 60 });
  });
});
