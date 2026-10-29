import { describe, expect, test } from "bun:test";
import { CARD_DATA, DMM_DECK } from "../test-support/dmm.ts";
import { itemChoices } from "./items.ts";

const CARDS = new Map(CARD_DATA.cards.map((c) => [c.id, c]));

describe("itemChoices", () => {
  test("offers ワッペン first, then the DMM deck's three items, each once", () => {
    const deck = DMM_DECK.map((s) => CARDS.get(s.cardId));
    expect(itemChoices([...deck, ...deck]).map((i) => [i.name, i.cap ?? "-"])).toEqual([
      ["H.I.Fワッペン", 20],
      ["素敵なお仕事", 3],
      ["ふわふわでもこもこ", "-"],
      ["完全制覇でポン", 2],
    ]);
  });

  test("offers only ワッペン for an empty deck", () => {
    expect(itemChoices([undefined, undefined]).map((i) => i.itemId)).toEqual(["wappen"]);
  });
});
