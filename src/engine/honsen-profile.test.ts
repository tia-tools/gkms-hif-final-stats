import { describe, expect, test } from "bun:test";
import { occurrences } from "./count.ts";
import { SENBATSU, honsenCounts } from "./honsen-profile.ts";

const DANCE_LESSONS = { vocal: 0, dance: 2, visual: 0 };
const base = { refreshesLeft: 1, medalMoja: false, day3: "present", lessons: DANCE_LESSONS, needs: {}, itemDrinks: 0 } as const;

describe("honsenCounts, fixed by the schedule", () => {
  test("two SP lessons, two 授業, two exams, one rest before an exam, one 相談, one P-item", () => {
    const { occasions } = honsenCounts(base);
    expect([
      occasions["EndLesson"],
      occasions["EndStepEventSchool"],
      occasions["EndAudition"],
      occasions["EndBeforeAuditionRefresh"],
      occasions["StartShop"],
      occasions["GetProduceItem"],
      occasions["ProduceStart"] ?? 0,
    ]).toEqual([2, 2, 2, 1, 1, 1, 0]);
    expect(honsenCounts(base).filters["EndLesson.lessonKind.normal"]).toBe(0);
  });

  test("day 3 is 差し入れ or おでかけ", () => {
    const present = honsenCounts(base).occasions;
    const activity = honsenCounts({ ...base, day3: "activity" }).occasions;
    expect([present["StartPresent"], present["EndStepEventActivity"]]).toEqual([1, 0]);
    expect([activity["StartPresent"], activity["EndStepEventActivity"]]).toEqual([0, 1]);
  });

  test("the lessons per stat come from the placement", () => {
    expect(honsenCounts(base).lessons).toEqual(DANCE_LESSONS);
  });
});

describe("honsenCounts, from the user's play (decision G24)", () => {
  test("P-drinks: 4 per 相談 lineup plus 4 per refresh left, then 1 on day 3 and 2 at the インターバル", () => {
    const one = honsenCounts(base).occasions;
    const none = honsenCounts({ ...base, refreshesLeft: 0 }).occasions;
    expect([one["BuyShopItemProduceDrink"], one["GetProduceDrink"]]).toEqual([8, 11]);
    expect([none["BuyShopItemProduceDrink"], none["GetProduceDrink"]]).toEqual([4, 7]);
  });

  test("P-item drinks add to the drinks acquired, not to those bought", () => {
    const o = honsenCounts({ ...base, itemDrinks: 3 }).occasions;
    expect([o["BuyShopItemProduceDrink"], o["GetProduceDrink"]]).toEqual([8, 14]);
  });

  test("no deletions, or 2 with メダルもじゃ", () => {
    expect(honsenCounts(base).occasions["DeleteProduceCard"]).toBe(0);
    expect(honsenCounts({ ...base, medalMoja: true }).occasions["DeleteProduceCard"]).toBe(2);
  });

  test("one card acquired and two changes, or as many as the capped triggers left can use", () => {
    expect([honsenCounts(base).occasions["GetProduceCard"], honsenCounts(base).occasions["ChangeProduceCard"]]).toEqual([1, 2]);
    const o = honsenCounts({ ...base, needs: { GetProduceCard: 4, ChangeProduceCard: 1, UpgradeProduceCard: 2 } }).occasions;
    expect([o["GetProduceCard"], o["ChangeProduceCard"], o["UpgradeProduceCard"]]).toEqual([4, 2, 2]);
  });

  test("インターバル actions and 相談 card purchases happen only when a capped trigger calls for them", () => {
    const quiet = honsenCounts(base).occasions;
    const called = honsenCounts({ ...base, needs: { CustomizeProduceCard: 1, StartCustomize: 1, BuyShopItemProduceCard: 2 } }).occasions;
    const names = ["UpgradeProduceCard", "CustomizeProduceCard", "StartCustomize", "BuyShopItemProduceCard"];
    expect(names.map((n) => quiet[n] ?? 0)).toEqual([0, 0, 0, 0]);
    expect(names.map((n) => called[n] ?? 0)).toEqual([0, 1, 1, 2]);
  });

  test("a need on an occasion the schedule fixes changes nothing", () => {
    expect(honsenCounts({ ...base, needs: { EndAudition: 5, GetProduceDrink: 20 } }).occasions["EndAudition"]).toBe(2);
    expect(honsenCounts({ ...base, needs: { EndAudition: 5, GetProduceDrink: 20 } }).occasions["GetProduceDrink"]).toBe(11);
  });
});

describe("SENBATSU, the stopgap of decision G27", () => {
  test("leaves the DMM deck's 「基本」-change ability (cap 3) one fire, as the user reported", () => {
    const starter = { occasion: "ChangeProduceCard", filters: [{ family: "cardName" as const, member: "starter" }] };
    expect(3 - Math.min(3, occurrences(starter, SENBATSU))).toBe(1);
  });

  test("spends ふわふわでワクワク's exam-end ability (cap 2), and leaves もうすぐ本番ですね's (cap 5) two", () => {
    const audition = { occasion: "EndAudition" };
    expect(2 - Math.min(2, occurrences(audition, SENBATSU))).toBe(0);
    expect(5 - Math.min(5, occurrences(audition, SENBATSU))).toBe(2);
  });

  test("counts every 選抜 lesson on any stat, as G3 assumes every fire was used", () => {
    const dance = { occasion: "EndLesson", filters: [{ family: "lessonStat" as const, member: "dance" }] };
    expect(occurrences(dance, SENBATSU)).toBe(6);
  });

  test("an unnamed effect group counts 10, named ones their own number", () => {
    const group = (member: string) => occurrences({ occasion: "GetProduceCard", filters: [{ family: "effectGroup", member }] }, SENBATSU);
    expect([group("full_power"), group("review"), group("block")]).toEqual([10, 14, 12]);
  });
});
