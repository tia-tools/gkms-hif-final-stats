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

  test("leaves out and reports a card the data lacks, never stopping on it", () => {
    const deck = [...DMM_DECK.slice(0, 5), { cardId: "s_card-9-9999", level: 60 }];
    const { result, unknownCards } = compute({ ...DMM_FORM, deck }, CARD_DATA, 3200);
    expect(unknownCards).toEqual(["s_card-9-9999"]);
    expect(result?.lines.some((l) => l.cardId === "s_card-3-0069")).toBe(false);
  });

  test("without card data, computes the memory alone and reports nothing missing", () => {
    const { result, unknownCards } = compute(DMM_FORM, null, 3200);
    expect([result?.lines, unknownCards]).toEqual([[], []]);
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
