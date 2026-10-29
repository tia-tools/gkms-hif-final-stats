import { describe, expect, test } from "bun:test";
import { CardDataError, parseCardData } from "./load.ts";

/** gakumas-supportcards' real output at its merge d08f3de: 210 cards, none held. */
const FIXTURE: unknown = JSON.parse(await Bun.file(new URL("./fixtures/cards.v1.json", import.meta.url)).text());

/** The parts of the file the tests below break, typed loosely enough to break them. */
interface LooseCard {
  [key: string]: unknown;
  breakpoints: { effects: Record<string, unknown>[] }[];
}
interface LooseFile {
  [key: string]: unknown;
  cards: LooseCard[];
}

/** A fresh, mutable copy of the fixture for one test to break. */
function fixture(): LooseFile {
  return JSON.parse(JSON.stringify(FIXTURE));
}

/** `list[i]`, or a failed test if it is missing. */
function at<T>(list: readonly T[], i: number): T {
  const item = list[i];
  if (item === undefined) throw new Error(`the fixture has no item ${i}`);
  return item;
}

const firstEffect = (file: LooseFile, i: number) => at(at(at(file.cards, i).breakpoints, 0).effects, 0);

describe("parseCardData, the real file", () => {
  test("keeps every field of every card: the parsed data equals the file", () => {
    expect(FIXTURE).toStrictEqual(parseCardData(FIXTURE));
  });

  test("holds 210 cards, none held, and the level limits per rarity", () => {
    const data = parseCardData(FIXTURE);
    expect(data.formatVersion).toBe(1);
    expect(data.cards.length).toBe(210);
    expect(data.held).toEqual([]);
    expect(data.levelLimits).toEqual({ r: [20, 25, 30, 35, 40], sr: [30, 35, 40, 45, 50], ssr: [40, 45, 50, 55, 60] });
  });

  test("has the DMM sample's six deck cards", () => {
    const byAsset = new Map(parseCardData(FIXTURE).cards.map((c) => [c.assetId, c]));
    expect(["csprt-3-0099", "csprt-3-0062", "csprt-2-0007", "csprt-3-0082", "csprt-3-0066", "csprt-3-0069"].map((a) => byAsset.get(a)?.name)).toEqual([
      "もうすぐ本番ですね",
      "よくやったな、倉本。",
      "ふわふわでワクワク",
      "なぜこんなところにッ！？",
      "放っておけない気になる子",
      "いつまでも続けばいいのに",
    ]);
  });
});

describe("parseCardData, the format version", () => {
  test("refuses another format version, naming it", () => {
    const file = fixture();
    file["formatVersion"] = 2;
    expect(() => parseCardData(file)).toThrow("format version 2");
  });

  test("refuses a file with no format version", () => {
    const file = fixture();
    delete file["formatVersion"];
    expect(() => parseCardData(file)).toThrow(CardDataError);
  });

  test("refuses what is not a card file at all", () => {
    for (const value of [null, undefined, "cards", 1, []]) {
      expect(() => parseCardData(value)).toThrow(CardDataError);
    }
  });
});

describe("parseCardData, a broken card", () => {
  test("names the path of a bad value", () => {
    const file = fixture();
    firstEffect(file, 0)["stat"] = "power";
    expect(() => parseCardData(file)).toThrow("cards[0].breakpoints[0].effects[0].stat: expected vocal | dance | visual");
  });

  test("names a value that should be an object", () => {
    const file = fixture();
    at(file.cards, 0)["items"] = ["素敵なお仕事"];
    expect(() => parseCardData(file)).toThrow("cards[0].items[0]: expected an object");
  });

  test("refuses a missing required field", () => {
    const file = fixture();
    delete at(file.cards, 3)["rarity"];
    expect(() => parseCardData(file)).toThrow("cards[3].rarity");
  });

  test("refuses a filter family the contract does not know", () => {
    const file = fixture();
    const i = file.cards.findIndex((c) => JSON.stringify(c).includes('"family":"'));
    file.cards[i] = JSON.parse(JSON.stringify(at(file.cards, i)).replace('"family":"', '"family":"x'));
    expect(() => parseCardData(file)).toThrow(".family: expected lessonStat");
  });

  test("refuses a level-limit row that is not five levels", () => {
    const file = fixture();
    file["levelLimits"] = { r: [20, 25, 30, 35], sr: [30, 35, 40, 45, 50], ssr: [40, 45, 50, 55, 60] };
    expect(() => parseCardData(file)).toThrow("levelLimits.r");
  });

  test("refuses an empty card list, so the page never computes with no cards", () => {
    const file = fixture();
    file.cards = [];
    expect(() => parseCardData(file)).toThrow("cards: expected at least one card");
  });

  test("refuses a fractional or non-finite number", () => {
    const file = fixture();
    firstEffect(file, 0)["value"] = Number.NaN;
    expect(() => parseCardData(file)).toThrow("cards[0].breakpoints[0].effects[0].value");
  });
});

describe("parseCardData, what may vary", () => {
  test("reads a held card with its reasons", () => {
    const file = fixture();
    file["held"] = [{ id: "s_card-3-0099", name: "もうすぐ本番ですね", reasons: ["an uncountable trigger"] }];
    expect(parseCardData(file).held).toEqual([{ id: "s_card-3-0099", name: "もうすぐ本番ですね", reasons: ["an uncountable trigger"] }]);
  });

  test("drops a field the contract does not name, without refusing the file", () => {
    const file = fixture();
    at(file.cards, 0)["comingSoon"] = true;
    const parsed = parseCardData(file).cards[0];
    expect(parsed === undefined ? [] : Object.keys(parsed)).not.toContain("comingSoon");
  });
});
