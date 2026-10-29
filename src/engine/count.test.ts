import { describe, expect, test } from "bun:test";
import type { ParsedTrigger } from "../data/contract.ts";
import { type Counts, conditionKey, occurrences } from "./count.ts";

const COUNTS: Counts = {
  occasions: { EndLesson: 2, GetProduceCard: 4, EndAudition: 2 },
  filters: { "GetProduceCard.rarity.ssr": 3, "GetProduceCard.effectGroup": 1, "EndLesson.lessonKind.normal": 0 },
  conditions: { "EndAudition.produce_card_search_count.ge15": 1 },
  lessons: { vocal: 0, dance: 2, visual: 0 },
};

const trigger = (t: ParsedTrigger) => t;

describe("occurrences", () => {
  test("is the occasion's count when nothing narrows it", () => {
    expect(occurrences(trigger({ occasion: "GetProduceCard" }), COUNTS)).toBe(4);
  });

  test("is 0 for an occasion 本戦 does not have", () => {
    expect(occurrences(trigger({ occasion: "ProduceStart" }), COUNTS)).toBe(0);
  });

  test("a lesson-stat filter counts the lessons on that stat", () => {
    const dance = trigger({ occasion: "EndLesson", filters: [{ family: "lessonStat", member: "dance" }] });
    const vocal = trigger({ occasion: "EndLesson", filters: [{ family: "lessonStat", member: "vocal" }] });
    expect([occurrences(dance, COUNTS), occurrences(vocal, COUNTS)]).toEqual([2, 0]);
  });

  test("a filter takes its member's count, then its family's, then the occasion's (decision G25)", () => {
    const by = (family: "rarity" | "effectGroup" | "cardType", member: string) =>
      occurrences(trigger({ occasion: "GetProduceCard", filters: [{ family, member }] }), COUNTS);
    expect([by("rarity", "ssr"), by("effectGroup", "full_power"), by("cardType", "mental")]).toEqual([3, 1, 4]);
  });

  test("an SP-only lesson ability fires on both lessons, a normal-lesson one on none", () => {
    const kind = (member: string) =>
      occurrences(trigger({ occasion: "EndLesson", filters: [{ family: "lessonKind", member }] }), COUNTS);
    expect([kind("sp"), kind("normal")]).toEqual([2, 0]);
  });

  test("a condition is met every time unless its count is stated", () => {
    const cards15 = { kind: "produce_card_search_count", min: 15, max: 0 };
    const vi400 = { kind: "visual", min: 400, max: 0 };
    expect(occurrences(trigger({ occasion: "EndAudition", conditions: [cards15] }), COUNTS)).toBe(1);
    expect(occurrences(trigger({ occasion: "EndAudition", conditions: [vi400] }), COUNTS)).toBe(2);
  });

  test("never fires more than the fires left", () => {
    expect(occurrences(trigger({ occasion: "GetProduceCard" }), COUNTS, 1)).toBe(1);
    expect(occurrences(trigger({ occasion: "GetProduceCard" }), COUNTS, 0)).toBe(0);
    expect(occurrences(trigger({ occasion: "GetProduceCard" }), COUNTS, 9)).toBe(4);
  });

  test("a trigger restricted to another scenario never fires; one for H.I.F. does", () => {
    expect(occurrences(trigger({ occasion: "GetProduceCard", scenario: "produce-001" }), COUNTS)).toBe(0);
    expect(occurrences(trigger({ occasion: "GetProduceCard", scenario: "hif" }), COUNTS)).toBe(4);
  });

  test("takes the smallest of every narrowing at once", () => {
    const t = trigger({
      occasion: "GetProduceCard",
      filters: [
        { family: "rarity", member: "ssr" },
        { family: "effectGroup", member: "full_power" },
      ],
    });
    expect(occurrences(t, COUNTS, 5)).toBe(1);
  });
});

describe("conditionKey", () => {
  test("names occasion, kind, counted cards and bound as the sibling does", () => {
    expect(conditionKey("EndLesson", { kind: "produce_card_count", min: 20, max: 0 })).toBe("EndLesson.produce_card_count.ge20");
    expect(conditionKey("StartCustomize", { kind: "dance", min: 0, max: 900 })).toBe("StartCustomize.dance.le900");
    expect(
      conditionKey("GetProduceCard", {
        kind: "produce_card_search_count",
        subject: [{ family: "effectGroup", member: "review" }],
        min: 8,
        max: 12,
      }),
    ).toBe("GetProduceCard.produce_card_search_count-effectGroup.review.8to12");
  });
});
