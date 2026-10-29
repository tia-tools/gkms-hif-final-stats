import { describe, expect, test } from "bun:test";
import { percentText, permilOf, wholeOf } from "./fields.ts";

describe("wholeOf", () => {
  test("reads the digits typed, and nothing as null", () => {
    expect([wholeOf("1982"), wholeOf("1,982"), wholeOf(" 60 "), wholeOf(""), wholeOf("abc")]).toEqual([1982, 1982, 60, null, null]);
  });
});

describe("permilOf and percentText", () => {
  test("reads a percentage with at most one decimal as tenths, in integers", () => {
    expect([permilOf("59.8"), permilOf("37.1"), permilOf("28.8%"), permilOf("60"), permilOf("0.3")]).toEqual([598, 371, 288, 600, 3]);
  });

  test("refuses two decimals, a sign or a stray character", () => {
    expect([permilOf("59.85"), permilOf("-5"), permilOf("5x"), permilOf(""), permilOf("1000")]).toEqual([null, null, null, null, null]);
  });

  test("writes tenths back as the screen shows them", () => {
    expect([percentText(598), percentText(600), percentText(3), percentText(null)]).toEqual(["59.8", "60.0", "0.3", ""]);
  });
});
