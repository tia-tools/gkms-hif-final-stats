import { describe, expect, test } from "bun:test";
import { loadFixture } from "../test-support/png.ts";
import { withFallback } from "./fonts.ts";
import { AFFECTION, PARAMS } from "./kihon.ts";
import { locate, shows } from "./layout.ts";

describe("locate", () => {
  test("finds the 「カスタム」 label on 基本情報, at the DMM sample's measured place", async () => {
    expect(locate(await loadFixture("dmm-01-kihon"))).toEqual({ tab: "kihon", unit: 1, x: 20, y: 713, top: 405 });
  });

  test("finds the 「SP」 badge on 編成, its unit the width over 720", async () => {
    const frame = locate(await loadFixture("iphone-15promax-01-hensei"));
    expect(frame).toEqual({ tab: "hensei", unit: 1290 / 720, x: 104, y: 1202, top: 0 });
  });

  test("on a scrolled 基本情報 tab the idol image hides 親愛度 but not the stats", async () => {
    const r = await loadFixture("iphone-se3-01-kihon");
    const frame = locate(r);
    if (frame === null) throw new Error("not located");
    expect(shows(frame, AFFECTION, r)).toBe(false);
    expect(shows(frame, PARAMS.vocal, r)).toBe(true);
  });

  test("a green bar of the wrong width is not the label", () => {
    // Long enough for a row to qualify (60 units), but 120 wide where the label is 84.5.
    const w = 720;
    const h = 1280;
    const data = new Uint8ClampedArray(w * h * 4).fill(250);
    for (let y = 700; y < 720; y++) for (let x = 10; x < 130; x++) data.set([28, 193, 91, 255], (y * w + x) * 4);
    expect(locate({ width: w, height: h, data })).toBeNull();
  });

  test("a pink square without the blue and yellow badges below it is not 発動中効果", () => {
    const w = 720;
    const h = 1280;
    const data = new Uint8ClampedArray(w * h * 4).fill(250);
    for (let y = 572; y < 611; y++) for (let x = 51; x < 90; x++) data.set([240, 80, 150, 255], (y * w + x) * 4);
    expect(locate({ width: w, height: h, data })).toBeNull();
  });
});

describe("withFallback", () => {
  test("adds only the characters the font lacks", () => {
    const out = withFallback(new Map([["1", "own"]]), new Map([
      ["1", "borrowed"],
      ["7", "borrowed"],
    ]));
    expect([...out]).toEqual([
      ["1", "own"],
      ["7", "borrowed"],
    ]);
  });
});
