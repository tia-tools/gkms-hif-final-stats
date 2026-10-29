import { describe, expect, test } from "bun:test";
import type { Card } from "../data/contract.ts";
import { CARD_DATA, DMM_DECK, DMM_ITEMS } from "../test-support/dmm.ts";
import { type Ability, abilityLines, deckSources, effectsAt, itemDrinks, needs } from "./abilities.ts";
import type { Counts } from "./count.ts";
import { WAPPEN } from "./types.ts";

const CARDS = new Map(CARD_DATA.cards.map((c) => [c.id, c]));
const summary = (a: Ability) => [a.cardId.slice(7), a.effect.kind, a.effect.stat, a.effect.value, a.trigger.occasion, a.left ?? "-"];

describe("deckSources, the DMM deck", () => {
  test("lists what can still fire in 本戦, with the fires left (G3 for skills, the icon's digit for items)", () => {
    const { abilities } = deckSources(DMM_DECK, CARDS, DMM_ITEMS, {});
    expect(abilities.map(summary)).toEqual([
      ["3-0099", "item", "visual", 25, "ChangeProduceCard", 1], // 素敵なお仕事
      ["3-0099", "skill", "visual", 39, "ChangeProduceCard", 1], // 「基本」 change, cap 3, 2 used in 選抜
      ["3-0099", "skill", "visual", 37, "EndAudition", 2], // cap 5, 3 used in 選抜
      ["3-0062", "skill", "dance", 17, "EndLesson", "-"],
      ["3-0062", "skill", "dance", 5, "GetProduceDrink", "-"],
      ["2-0007", "skill", "dance", 17, "EndAudition", 0], // cap 2, spent in 選抜
      ["2-0007", "skill", "dance", 13, "EndLesson", "-"],
      ["3-0082", "item", "dance", 30, "GetProduceCard", 1], // 完全制覇でポン
      ["3-0082", "skill", "dance", 17, "EndLesson", "-"],
      ["3-0082", "skill", "dance", 6, "GetProduceCard", "-"],
      ["3-0066", "skill", "vocal", 11, "BuyShopItemProduceDrink", "-"],
      ["3-0066", "skill", "vocal", 11, "DeleteProduceCard", "-"],
      ["3-0066", "skill", "vocal", 17, "StartPresent", "-"],
      ["3-0069", "skill", "dance", 17, "EndLesson", "-"],
      ["3-0069", "skill", "dance", 6, "GetProduceCard", "-"],
      ["3-0069", "skill", "dance", 5, "GetProduceDrink", "-"],
    ]);
  });

  test("leaves out サポートイベント rewards, パラメータボーナス+ and プロデュース開始 abilities (G15)", () => {
    const { abilities } = deckSources(DMM_DECK, CARDS, DMM_ITEMS, {});
    expect(abilities.some((a) => a.effect.kind === "event" || a.effect.bonus === true || a.trigger.occasion === "ProduceStart")).toBe(false);
  });

  test("leaves out パラメータボーナス+ on any trigger, which no card in today's data has", () => {
    const card: Card = {
      id: "s_card-x",
      name: "x",
      assetId: "x",
      type: "dance",
      rarity: "ssr",
      plan: "common",
      breakpoints: [
        {
          minLevel: 1,
          eventBonusPermil: 0,
          effects: [
            { stat: "dance", value: 50, kind: "skill", bonus: true, trigger: { occasion: "EndLesson" } },
            { stat: "dance", value: 10, kind: "skill", trigger: { occasion: "EndLesson" } },
          ],
        },
      ],
    };
    const { abilities } = deckSources([{ cardId: "s_card-x", level: 1 }], new Map([[card.id, card]]), [], {});
    expect(abilities.map((a) => a.effect.value)).toEqual([10]);
  });

  test("a P-item counts only when the memory holds it, ふわふわでもこもこ's drinks included", () => {
    const { drinks } = deckSources(DMM_DECK, CARDS, DMM_ITEMS, {});
    expect(drinks.map((d) => [d.itemId, d.perFire, d.left])).toEqual([["pitem_03-3-263-0", 1, 1]]);
    const without = deckSources(DMM_DECK, CARDS, [{ itemId: WAPPEN, remaining: 4 }], {});
    expect(without.abilities.filter((a) => a.effect.kind === "item")).toEqual([]);
    expect(without.drinks).toEqual([]);
  });

  test("a held uncapped item fires without a limit", () => {
    const { drinks } = deckSources(DMM_DECK, CARDS, [{ itemId: "pitem_00-2-004-0" }], {});
    expect(drinks.map((d) => [d.itemId, d.perFire, d.left])).toEqual([["pitem_00-2-004-0", 2, undefined]]);
  });

  test("the panel's fires left replace the default, for a skill and for an item and its drinks together", () => {
    const { abilities: before } = deckSources(DMM_DECK, CARDS, DMM_ITEMS, {});
    const skill = before[2]?.key ?? "";
    const item = before[7]?.key ?? "";
    const { abilities, drinks } = deckSources(DMM_DECK, CARDS, DMM_ITEMS, { [skill]: 5, [item]: 0 });
    expect([abilities[2]?.left, abilities[7]?.left, drinks[0]?.left]).toEqual([5, 0, 0]);
  });

  test("refuses a card id the data does not have", () => {
    expect(() => deckSources([{ cardId: "s_card-9-9999", level: 60 }], CARDS, [], {})).toThrow("s_card-9-9999");
  });
});

describe("effectsAt", () => {
  test("takes the last breakpoint at or below the level", () => {
    const card = CARDS.get("s_card-3-0069");
    if (card === undefined) throw new Error("the fixture has no s_card-3-0069");
    const [first, second] = card.breakpoints;
    expect(card.breakpoints.length).toBeGreaterThan(2);
    expect(effectsAt(card, 1)).toBe(first?.effects ?? []);
    expect(effectsAt(card, (second?.minLevel ?? 0) - 1)).toBe(first?.effects ?? []);
    expect(effectsAt(card, second?.minLevel ?? 0)).toBe(second?.effects ?? []);
    expect(effectsAt(card, 60)).toBe(card.breakpoints.at(-1)?.effects ?? []);
  });
});

describe("needs", () => {
  test("is, per occasion, the most fires a capped trigger has left, with ワッペン on card acquisition", () => {
    const sources = deckSources(DMM_DECK, CARDS, DMM_ITEMS, {});
    expect(needs([...sources.abilities, ...sources.drinks], 4)).toEqual({ GetProduceCard: 4, ChangeProduceCard: 1, EndAudition: 2 });
    expect(needs([], 0)).toEqual({ GetProduceCard: 0 });
  });
});

describe("abilityLines and itemDrinks", () => {
  const counts: Counts = {
    occasions: { GetProduceCard: 4, ChangeProduceCard: 2, EndAudition: 2, EndLesson: 2 },
    filters: {},
    conditions: {},
    lessons: { vocal: 0, dance: 1, visual: 1 },
  };

  test("each line fires as often as the counts and its fires left allow, for value × fires", () => {
    const { abilities } = deckSources(DMM_DECK, CARDS, DMM_ITEMS, {});
    const lines = abilityLines(abilities, counts);
    expect(lines.slice(0, 4).map((l) => [l.fires, l.points])).toEqual([
      [1, 25],
      [1, 39],
      [2, 74],
      [1, 17],
    ]);
  });

  test("P-item drinks are fires × drinks per fire", () => {
    const { drinks } = deckSources(DMM_DECK, CARDS, [{ itemId: "pitem_00-2-004-0" }, { itemId: "pitem_03-3-263-0", remaining: 1 }], {});
    expect(itemDrinks(drinks, counts)).toBe(2 * 1 + 1 * 1);
  });
});
