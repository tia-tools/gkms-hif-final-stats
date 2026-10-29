import { describe, expect, test } from "bun:test";
import { CARD_DATA, DMM_DECK, DMM_ITEMS, DMM_MEMORY } from "../test-support/dmm.ts";
import { compute } from "./compute.ts";
import { type FormState, emptyForm } from "./form.ts";
import { panelRows, withCount } from "./panel.ts";

const DMM_FORM: FormState = {
  ...emptyForm(),
  params: DMM_MEMORY.params,
  bonusPermil: DMM_MEMORY.bonusPermil,
  star: DMM_MEMORY.star,
  deck: DMM_DECK,
  items: Object.fromEntries(DMM_ITEMS.map((i) => [i.itemId, i.remaining ?? null])),
};
const NAMES = new Map(CARD_DATA.cards.map((c) => [c.id, c.name]));

describe("compute", () => {
  test("the DMM form comes to 6971, short of S5 by 73, as Milestone 3 computed", () => {
    const { result } = compute(DMM_FORM, CARD_DATA, 3200);
    expect(result?.total).toBe(6971);
    expect(result?.ranks[0]).toMatchObject({ rank: "S5", margin: -73 });
  });

  test("waits for every stat, bonus and スター性", () => {
    expect(compute({ ...DMM_FORM, star: null }, CARD_DATA, 3200).result).toBeNull();
  });

  test("refuses a deck card the data lacks, naming it, rather than computing without it", () => {
    const deck = [...DMM_DECK.slice(0, 5), { cardId: "s_card-9-9999", level: 60 }];
    expect(compute({ ...DMM_FORM, deck }, CARD_DATA, 3200)).toEqual({ result: null, problem: { unknownCards: ["s_card-9-9999"] } });
  });

  test("refuses a deck while there is no card data, and computes the memory alone with an empty deck", () => {
    expect(compute(DMM_FORM, null, 3200)).toEqual({ result: null, problem: { noCardData: true } });
    const alone = compute({ ...DMM_FORM, deck: emptyForm().deck }, null, 3200);
    expect([alone.result?.total, alone.result?.lines]).toEqual([6410, []]);
  });

  test("shows an engine error instead of stopping the page", () => {
    const { result, problem } = compute({ ...DMM_FORM, affection: 99 }, CARD_DATA, 3200);
    expect(result).toBeNull();
    expect(problem).toMatchObject({ error: expect.stringContaining("親愛度") });
  });
});

describe("panelRows", () => {
  const result = compute(DMM_FORM, CARD_DATA, 3200).result;
  if (result === null) throw new Error("the DMM form did not compute");

  test("lists card acquisitions and P-drinks first, each occasion with its filters, conditions and fires left", () => {
    const rows = panelRows(result, {}, NAMES);
    expect(rows.slice(0, 5).map((r) => [r.kind, r.label, r.value, r.depth])).toEqual([
      ["occasions", "スキルカード獲得", 4, 0],
      ["filters", "全力", 4, 1],
      ["conditions", "ダンス700以上", 4, 1],
      ["left", "なぜこんなところにッ！？「完全制覇でポン」", 1, 1],
      ["filters", "SSR", 4, 1],
    ]);
    expect(rows.find((r) => r.key === "GetProduceDrink")?.value).toBe(12);
  });

  test("lists a drink-only P-item's fires left under its occasion, where an ability line would not", () => {
    // 基礎＞応用 (SR) grants うるおいのどケア: one P-drink per SP lesson end, 2 fires per run, no stat effect
    const deck = [...DMM_DECK.slice(0, 5), { cardId: "s_card-2-0040", level: 50 }];
    const form = { ...DMM_FORM, deck, items: { ...DMM_FORM.items, "pitem_00-2-082-0": 1 } };
    const withItem = compute(form, CARD_DATA, 3200).result;
    if (withItem === null) throw new Error("the form did not compute");
    const rows = panelRows(withItem, {}, NAMES);
    const at = rows.findIndex((r) => r.label === "基礎＞応用「うるおいのどケア」");
    expect(rows[at]).toMatchObject({ kind: "left", key: "s_card-2-0040/pitem_00-2-082-0", value: 1 });
    expect(rows.slice(0, at).findLast((r) => r.depth === 0)?.key).toBe("EndLesson");
  });

  test("marks a count the player changed", () => {
    const panel = withCount({}, "occasions", "GetProduceDrink", 5);
    const rows = panelRows(compute({ ...DMM_FORM, panel }, CARD_DATA, 3200).result ?? result, panel, NAMES);
    expect(rows.find((r) => r.key === "GetProduceDrink")).toMatchObject({ value: 5, changed: true });
  });
});

describe("withCount", () => {
  test("sets a count, and removes it again with null", () => {
    const set = withCount({ occasions: { EndAudition: 1 } }, "occasions", "GetProduceDrink", 5);
    expect(set.occasions).toEqual({ EndAudition: 1, GetProduceDrink: 5 });
    expect(withCount(set, "occasions", "GetProduceDrink", null).occasions).toEqual({ EndAudition: 1 });
  });
});
