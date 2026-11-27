import { describe, expect, test } from "bun:test";
import { parseCardData } from "./cards.ts";

/** A real release of gkms-library's support-cards v1 (refresh: docs/plans/EXECPLAN_LIBRARY_DATA.md § Concrete Steps). */
const FIXTURE: unknown = JSON.parse(await Bun.file(new URL("./fixtures/support-cards.v1.json", import.meta.url)).text());

/** The parts of the file the tests below break, typed loosely enough to break them. */
interface LooseFile {
  [key: string]: unknown;
  cards: Record<string, unknown>[];
}

/** A fresh, mutable copy of the fixture for one test to break. */
function fixture(): LooseFile {
  return JSON.parse(JSON.stringify(FIXTURE));
}

describe("parseCardData, the real release", () => {
  test("keeps every field of every card: the parsed data equals the file", () => {
    expect(FIXTURE).toStrictEqual(parseCardData(FIXTURE));
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

  test("carries the plan filter family, which cards.v1.json left out (s_card-3-0114)", () => {
    const card = parseCardData(FIXTURE).cards.find((c) => c.id === "s_card-3-0114");
    const filters = (card?.breakpoints ?? []).flatMap((b) => b.effects).flatMap((e) => e.trigger?.filters ?? []);
    expect(filters).toContainEqual({ family: "plan", member: "logic" });
  });

  test("lists the effects it could not read, one entry per card and reason", () => {
    expect(parseCardData(FIXTURE).unread.map((u) => u.cardId)).toEqual(["s_card-3-0117"]);
  });
});

describe("parseCardData, a broken file", () => {
  test("refuses another format version", () => {
    const file = fixture();
    file["formatVersion"] = 2;
    expect(() => parseCardData(file)).toThrow("support-cards v1: formatVersion");
  });

  test("refuses what is not a card file at all", () => {
    for (const value of [null, undefined, "cards", 1, []]) expect(() => parseCardData(value)).toThrow("support-cards v1");
  });

  test("names the path of a bad value", () => {
    const file = fixture();
    delete file.cards[3]?.["rarity"];
    expect(() => parseCardData(file)).toThrow("support-cards v1: cards.3.rarity");
  });

  test("refuses an empty card list, so the page never computes with no cards", () => {
    const file = fixture();
    file.cards = [];
    expect(() => parseCardData(file)).toThrow("the list is empty");
  });

  test("refuses a field the format does not name, since its objects are strict", () => {
    const file = fixture();
    const first = file.cards[0];
    if (first !== undefined) first["comingSoon"] = true;
    expect(() => parseCardData(file)).toThrow("cards.0");
  });
});
