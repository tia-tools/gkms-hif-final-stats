import { describe, expect, test } from "bun:test";
import { CARD_DATA, DMM_DECK, DMM_ITEMS, DMM_MEMORY } from "../test-support/dmm.ts";
import { type HeldItem, WAPPEN } from "./types.ts";
import { bestTotal, uncountedKey } from "./total.ts";

const dmm = (panel = {}, cap = 3200, data = CARD_DATA) => bestTotal(DMM_MEMORY, DMM_DECK, DMM_ITEMS, data, panel, cap);
const rank = (result: ReturnType<typeof dmm>, name: string) => result.ranks.find((r) => r.rank === name);

describe("bestTotal, the DMM sample (worked by hand in the plan's Artifacts and Notes)", () => {
  const result = dmm();

  test("reaches 6971: both lessons on Da, which the cap holds at 3200", () => {
    expect(result.total).toBe(6971);
    expect(result.params).toEqual({ vocal: 2583, dance: 3200, visual: 1188 });
    expect(result.placement.lessons).toEqual([
      { main: "dance", sub: "vocal" },
      { main: "dance", sub: "vocal" },
    ]);
    expect(result.day3).toBe("present");
  });

  test("misses S5 by 73 at スター性 1335, and clears S4+ by 2427", () => {
    expect(result.finalStar).toBe(1335);
    expect(rank(result, "S5")).toEqual({ rank: "S5", rating: 35000, required: 7044, margin: -73, provisional: false });
    expect(rank(result, "S4+")).toEqual({ rank: "S4+", rating: 30000, required: 4544, margin: 2427, provisional: false });
  });

  test("counts 4 cards, 2 changes, 12 P-drinks acquired and 8 bought", () => {
    const o = result.counts.occasions;
    expect([o["GetProduceCard"], o["ChangeProduceCard"], o["GetProduceDrink"], o["BuyShopItemProduceDrink"]]).toEqual([4, 2, 12, 8]);
  });

  test("fires each ability as the hand count says", () => {
    expect(result.lines.map((l) => [l.cardId.slice(7), l.effect.value, l.fires, l.points])).toEqual([
      ["3-0099", 25, 1, 25], // 素敵なお仕事: 1 left
      ["3-0099", 39, 1, 39], // 「基本」 change: 1 left
      ["3-0099", 37, 2, 74], // exam end: 2 left, 2 exams
      ["3-0062", 17, 2, 34], // Dance SP lesson end
      ["3-0062", 5, 12, 60], // P-drink acquired
      ["2-0007", 17, 0, 0], // exam end: spent in 選抜
      ["2-0007", 13, 2, 26],
      ["3-0082", 30, 1, 30], // 完全制覇でポン: 1 left
      ["3-0082", 17, 2, 34],
      ["3-0082", 6, 4, 24], // SSR acquired
      ["3-0066", 11, 8, 88], // P-drink bought at 相談
      ["3-0066", 11, 0, 0], // deletion: none without メダルもじゃ
      ["3-0066", 17, 1, 17], // 差し入れ
      ["3-0069", 17, 2, 34],
      ["3-0069", 6, 4, 24],
      ["3-0069", 5, 12, 60],
    ]);
  });
});

describe("bestTotal, the panel (decision G25)", () => {
  test("a count the player lowers lowers the total, and frees what the cap held", () => {
    // no P-drinks acquired: −120 Da, and Da drops under the cap, so the 8 it held come back
    expect(dmm({ occasions: { GetProduceDrink: 0 } }).total).toBe(6971 - 120 + 8);
  });

  test("day 3 can be forced to おでかけ", () => {
    const result = dmm({ day3: "activity" });
    expect([result.day3, result.total]).toEqual(["activity", 6971 - 17]);
  });

  test("fewer cards acquired leave ワッペン fires unused, which lowers スター性 and raises what S5 needs", () => {
    const result = dmm({ occasions: { GetProduceCard: 2 } });
    expect(result.finalStar).toBe(1305); // 810 + 45 + 15 + 2 × 15 + 180 = 1080, then + 225
    expect(rank(result, "S5")?.required).toBe(7157);
    expect(result.total).toBe(6971 - 2 * 2 * 6 + 8); // two fewer SSR fires on two cards; Da drops under the cap
  });

  test("fires left can be raised for an ability, and what the cap holds stays held", () => {
    const lines = dmm().lines;
    const starter = lines[1]?.key ?? ""; // 「基本」 change, Vi +39
    const spent = lines[5]?.key ?? ""; // ふわふわでワクワク's exam end, Da +17
    expect(dmm({ left: { [starter]: 2 } }).total).toBe(6971 + 39);
    const raised = dmm({ left: { [spent]: 2 } });
    expect(raised.lines[5]?.points).toBe(34);
    expect(raised.total).toBe(6971); // Da was already at the cap
  });

  test("ワッペン without a digit read counts its 20 fires; one not held counts none", () => {
    const run = (items: readonly HeldItem[]) => bestTotal(DMM_MEMORY, DMM_DECK, items, CARD_DATA, {}, 3200);
    expect(run([{ itemId: WAPPEN }]).counts.occasions["GetProduceCard"]).toBe(20);
    expect(run([]).counts.occasions["GetProduceCard"]).toBe(1);
    expect(run([]).finalStar).toBe(1275); // 810 + 45 + 15 + 180, then + 225
  });

  test("a lower parameter cap moves a lesson off the capped stat", () => {
    // worked by hand: day 2 on Vo with its サブ on Da, day 5 on Da; both on Da would waste 208
    const result = dmm({}, 3000);
    expect(result.total).toBe(6892);
    expect(result.params).toEqual({ vocal: 2360 + 360, dance: 2984, visual: 1188 });
  });
});

describe("bestTotal, a held deck card (decision G12)", () => {
  const held = {
    ...CARD_DATA,
    held: [{ id: "s_card-3-0066", name: "放っておけない気になる子", reasons: ["an uncounted trigger", "an uncounted effect type"] }],
  };
  const first = uncountedKey("s_card-3-0066", 0);
  const second = uncountedKey("s_card-3-0066", 1);

  test("marks a not-reachable rank provisional until every reason has a value", () => {
    const none = dmm({}, 3200, held);
    expect(none.held.map((h) => h.id)).toEqual(["s_card-3-0066"]);
    expect(rank(none, "S5")?.provisional).toBe(true);
    expect(rank(none, "S4+")?.provisional).toBe(false);
    const one = dmm({ uncounted: { [first]: { stat: "vocal", points: 10 } } }, 3200, held);
    expect(rank(one, "S5")?.provisional).toBe(true);
  });

  test("adds each reason's points on its own stat, under that stat's cap", () => {
    const result = dmm({ uncounted: { [first]: { stat: "dance", points: 50 }, [second]: { stat: "visual", points: 100 } } }, 3200, held);
    expect(result.total).toBe(6971 + 100); // Da is at the cap, so its 50 add nothing
    expect(rank(result, "S5")).toMatchObject({ margin: 27, provisional: false });
  });

  test("a held card with no reasons listed still has one entry to fill", () => {
    const silent = { ...CARD_DATA, held: [{ id: "s_card-3-0066", name: "放っておけない気になる子", reasons: [] }] };
    expect(rank(dmm({}, 3200, silent), "S5")?.provisional).toBe(true);
    expect(rank(dmm({ uncounted: { [first]: { stat: "vocal", points: 0 } } }, 3200, silent), "S5")?.provisional).toBe(false);
  });

  test("a value of 0 also ends the provisional mark", () => {
    const zero = { stat: "vocal" as const, points: 0 };
    expect(rank(dmm({ uncounted: { [first]: zero, [second]: zero } }, 3200, held), "S5")).toMatchObject({ margin: -73, provisional: false });
  });
});
