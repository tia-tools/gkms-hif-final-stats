import { describe, expect, test } from "bun:test";
import { R1_RATING_CAP, R2_RATING_CAP, RANKS, rating, requiredTotal } from "./rating.ts";

const NONE = { vocal: 0, dance: 0, visual: 0 };

describe("rating", () => {
  test("is floor(Σparams × 2 + スター性 × 7.5) + R1 + R2 − 2000", () => {
    // 2 × 7044 + floor(10012.5) + 5500 + 7400 − 2000
    expect(rating({ vocal: 2348, dance: 2348, visual: 2348 }, 1335, 5500, 7400)).toBe(35000);
  });

  test("floors the half point an odd スター性 gives", () => {
    expect(rating(NONE, 1, 0, 0)).toBe(7 - 2000);
    expect(rating(NONE, 2, 0, 0)).toBe(15 - 2000);
  });

  test("adds the round ratings as they are", () => {
    expect(rating(NONE, 0, 4000, 1200)).toBe(4000 + 1200 - 2000);
  });
});

describe("requiredTotal", () => {
  test("S5 with スター性 1335 needs 7044, the figure the design started from", () => {
    expect(requiredTotal(35000, 1335)).toBe(7044);
  });

  test("S4+ with スター性 1335 needs 4544", () => {
    expect(requiredTotal(30000, 1335)).toBe(4544);
  });

  test("S5 with スター性 1285 needs 7232: each missing point of スター性 costs 3.75", () => {
    expect(requiredTotal(35000, 1285)).toBe(7232);
  });

  test("an even スター性 loses the half point: 1334 needs 7048", () => {
    expect(requiredTotal(35000, 1334)).toBe(7048);
  });

  test("is the smallest total that reaches the rank, for every rank", () => {
    for (const { rating: target } of RANKS) {
      for (const star of [0, 760, 1285, 1334, 1335]) {
        const required = requiredTotal(target, star);
        const at = (total: number) => rating({ vocal: total, dance: 0, visual: 0 }, star, R1_RATING_CAP, R2_RATING_CAP);
        expect(at(required)).toBeGreaterThanOrEqual(target);
        if (required > 0) expect(at(required - 1)).toBeLessThan(target);
      }
    }
  });

  test("is 0, never negative, when the capped rounds and スター性 already reach the rank", () => {
    // A: 10000 ≤ floor(7.5 × 1335) + 5500 + 7400 − 2000 = 20912
    expect(requiredTotal(10000, 1335)).toBe(0);
  });
});

describe("RANKS", () => {
  test("lists the eleven ranks from S5 down, each needing less than the one before", () => {
    expect(RANKS.map((r) => r.rank)).toEqual(["S5", "S4+", "S4", "SSS+", "SSS", "SS+", "SS", "S+", "S", "A+", "A"]);
    expect(RANKS[0]?.rating).toBe(35000);
    RANKS.forEach((r, i) => {
      if (i > 0) expect(r.rating).toBeLessThan(RANKS[i - 1]?.rating ?? Infinity);
    });
  });
});
