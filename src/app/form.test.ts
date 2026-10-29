import { describe, expect, test } from "bun:test";
import { DMM_DECK, DMM_ITEMS, DMM_MEMORY } from "../test-support/dmm.ts";
import { type FormState, emptyForm, memoryOf, readForm, writeForm } from "./form.ts";

const DMM_FORM: FormState = {
  ...emptyForm(),
  params: DMM_MEMORY.params,
  bonusPermil: DMM_MEMORY.bonusPermil,
  star: DMM_MEMORY.star,
  deck: DMM_DECK,
  items: Object.fromEntries(DMM_ITEMS.map((i) => [i.itemId, i.remaining ?? null])),
};

const roundTrip = (form: FormState) => readForm(new URLSearchParams(writeForm(form).toString()));

describe("readForm and writeForm", () => {
  test("the DMM sample survives the URL", () => {
    expect(roundTrip(DMM_FORM)).toEqual({ ...DMM_FORM, panel: { occasions: {}, filters: {}, conditions: {}, left: {}, uncounted: {} } });
  });

  test("an empty form writes nothing, and defaults stay out of the URL", () => {
    expect(writeForm(emptyForm()).toString()).toBe("");
    expect(writeForm(DMM_FORM).has("a")).toBe(false);
    expect(writeForm(DMM_FORM).has("r")).toBe(false);
  });

  test("keeps empty deck slots in their places", () => {
    const form = { ...emptyForm(), deck: [null, { cardId: "s_card-3-0099", level: 60 }, null, null, null, null] };
    expect(roundTrip(form).deck).toEqual(form.deck);
  });

  test("keeps a held P-item with no digit read apart from one with fires left", () => {
    const form = { ...emptyForm(), items: { "pitem_00-2-004-0": null, wappen: 0 } };
    expect(roundTrip(form).items).toEqual({ "pitem_00-2-004-0": null, wappen: 0 });
  });

  test("keeps every panel change, keys with dots, slashes and #", () => {
    const panel = {
      occasions: { GetProduceDrink: 0 },
      filters: { "GetProduceCard.rarity.ssr": 3 },
      conditions: { "EndAudition.produce_card_search_count.ge15": 1 },
      left: { "s_card-3-0099/skill/visual/ChangeProduceCard+cardName.starter": 2 },
      day3: "activity" as const,
      uncounted: { "s_card-3-0066#0": { stat: "vocal" as const, points: 12 } },
    };
    expect(roundTrip({ ...emptyForm(), panel }).panel).toEqual(panel);
  });

  test("keeps 親愛度, refreshes and メダルもじゃ when they differ from the defaults", () => {
    const form = { ...emptyForm(), affection: 30, refreshesLeft: 0, medalMoja: true };
    expect(roundTrip(form)).toMatchObject({ affection: 30, refreshesLeft: 0, medalMoja: true });
  });

  test("leaves out what it cannot read instead of guessing", () => {
    const form = readForm(new URLSearchParams("p=1982,x,1050&s=-5&a=40&d=s_card-3-0099:abc,s_card-3-0062:60&o=GetProduceDrink:many&u=k:power:3"));
    expect(form.params).toEqual({ vocal: 1982, dance: null, visual: 1050 });
    expect([form.star, form.affection]).toEqual([null, 37]);
    expect(form.deck.slice(0, 2)).toEqual([null, { cardId: "s_card-3-0062", level: 60 }]);
    expect([form.panel.occasions, form.panel.uncounted]).toEqual([{}, {}]);
  });
});

describe("memoryOf", () => {
  test("is the engine's memory once every number is in", () => {
    expect(memoryOf(DMM_FORM)).toEqual(DMM_MEMORY);
  });

  test("is null while any stat, bonus or スター性 is empty", () => {
    expect(memoryOf({ ...DMM_FORM, star: null })).toBeNull();
    expect(memoryOf({ ...DMM_FORM, bonusPermil: { ...DMM_FORM.bonusPermil, visual: null } })).toBeNull();
  });
});
