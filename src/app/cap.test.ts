import { describe, expect, test } from "bun:test";
import { capLevelOf, capOf } from "./cap.ts";

describe("capLevelOf and capOf", () => {
  test("Lv0 to Lv6 cap each stat at 3000 to 3200", () => {
    expect([0, 1, 2, 3, 4, 5, 6].map(capOf)).toEqual([3000, 3050, 3080, 3110, 3140, 3170, 3200]);
  });

  test("a stored level is read back; anything else is Lv6", () => {
    expect([capLevelOf("2"), capLevelOf(null), capLevelOf("7"), capLevelOf("x"), capLevelOf("10")]).toEqual([2, 6, 6, 6, 6]);
  });
});
