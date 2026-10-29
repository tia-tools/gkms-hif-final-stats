import { describe, expect, test } from "bun:test";
import { requiredTotal } from "./rating.ts";
import { affectionBonusPercent, bestFinalStar, boostedStar } from "./star.ts";

describe("affectionBonusPercent", () => {
  test("follows the 親愛度 table from Lv28 +5% to Lv36 and Lv37 +50%", () => {
    expect([28, 29, 30, 31, 32, 33, 34, 35, 36, 37].map(affectionBonusPercent)).toEqual([
      5, 10, 15, 20, 25, 30, 35, 40, 50, 50,
    ]);
  });

  test("refuses a level outside 28–37 or between levels", () => {
    for (const level of [27, 38, 30.5, Number.NaN]) {
      expect(() => affectionBonusPercent(level)).toThrow(RangeError);
    }
  });
});

describe("boostedStar", () => {
  test("floors each gain after multiplying", () => {
    expect(boostedStar(30, 30)).toBe(34); // 34.5
    expect(boostedStar(10, 37)).toBe(15);
  });

  test("multiplies in integers: 100 at +15% is 115, where 100 × 1.15 floors to 114", () => {
    expect(boostedStar(100, 30)).toBe(115);
  });
});

describe("bestFinalStar", () => {
  test("the DMM sample reaches 1335: 1110 before round 2, then + 225", () => {
    // 810 + 45 + 15 + 4 × 15 + 180 = 1110
    expect(bestFinalStar({ star: 810, affection: 37, wappenLeft: 4 })).toBe(1335);
  });

  test("caps at 1110 before round 2, not after", () => {
    expect(bestFinalStar({ star: 811, affection: 37, wappenLeft: 4 })).toBe(1335);
    expect(bestFinalStar({ star: 809, affection: 37, wappenLeft: 4 })).toBe(1334);
  });

  test("a memory at 760 tops out at 1285 and then needs 7232 for S5", () => {
    const star = bestFinalStar({ star: 760, affection: 37, wappenLeft: 4 });
    expect(star).toBe(1285);
    expect(requiredTotal(35000, star)).toBe(7232);
  });

  test("counts each remaining ワッペン fire, and none when it has none left", () => {
    expect(bestFinalStar({ star: 810, affection: 37, wappenLeft: 0 })).toBe(1275);
  });

  test("below Lv37, lessons use the memory's level and later gains the highest level (O5)", () => {
    // lessons at Lv30: floor(34.5) + floor(11.5); ワッペン and both rounds at Lv36, +50%
    // 700 + 34 + 11 + 4 × 15 + 180 = 985, then + 225
    expect(bestFinalStar({ star: 700, affection: 30, wappenLeft: 4 })).toBe(1210);
  });

  test("refuses a ワッペン count outside its 20 fires per run", () => {
    for (const wappenLeft of [-1, 21, 1.5]) {
      expect(() => bestFinalStar({ star: 810, affection: 37, wappenLeft })).toThrow(RangeError);
    }
  });
});
