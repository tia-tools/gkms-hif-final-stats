import { describe, expect, test } from "bun:test";
import { CARD_DATA } from "../test-support/dmm.ts";
import { pickable } from "./picker.ts";

const all = { query: "", type: null, rarity: null } as const;

describe("pickable", () => {
  test("finds a card by part of its name", () => {
    expect(pickable(CARD_DATA.cards, { ...all, query: "もうすぐ本番" }).map((c) => c.id)).toEqual(["s_card-3-0099"]);
  });

  test("narrows by type and rarity", () => {
    const sr = pickable(CARD_DATA.cards, { ...all, type: "dance", rarity: "sr" });
    expect(sr.length).toBeGreaterThan(0);
    expect(sr.every((c) => c.type === "dance" && c.rarity === "sr")).toBe(true);
    expect(sr.some((c) => c.id === "s_card-2-0007")).toBe(true);
  });

  test("puts SSR first and the newest first within a rarity", () => {
    const cards = pickable(CARD_DATA.cards, all);
    expect(cards.length).toBe(210);
    expect(cards[0]?.rarity).toBe("ssr");
    expect(cards.at(-1)?.rarity).toBe("r");
    const ssr = cards.filter((c) => c.rarity === "ssr").map((c) => c.id);
    expect(ssr).toEqual(ssr.toSorted((a, b) => b.localeCompare(a)));
  });

  test("an empty result is an empty list", () => {
    expect(pickable(CARD_DATA.cards, { ...all, query: "存在しないカード" })).toEqual([]);
  });
});
