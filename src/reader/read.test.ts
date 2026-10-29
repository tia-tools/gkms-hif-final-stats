import { describe, expect, test } from "bun:test";
import { loadIcons, loadThumbnails } from "../test-support/images.ts";
import { loadFixture } from "../test-support/png.ts";
import { HENSEI, KIHON, SAMPLES, type SlotDigit } from "../test-support/samples.ts";
import { type Read, type References, type Slot, UNSURE, bounded, readScreenshot } from "./read.ts";

const refs: References = { thumbs: await loadThumbnails(), icons: await loadIcons() };

const value = (r: Read<number> | null) => r?.value ?? null;

function slotDigit(s: Slot): SlotDigit | "absent" | null {
  if (s.state === "badge") return s.left?.value ?? null;
  return s.state;
}

function confidences(reads: (Read<number> | null)[]): number[] {
  return reads.flatMap((r) => (r === null ? [] : [r.confidence]));
}

// Every sample, both tabs, against what the screenshots show (src/test-support/samples.ts).
describe("readScreenshot over the samples", () => {
  for (const sample of SAMPLES) {
    test(`${sample}, 基本情報`, async () => {
      const read = readScreenshot(await loadFixture(`${sample}-kihon`), refs);
      if (read?.tab !== "kihon") throw new Error("not read as 基本情報");
      const e = KIHON[sample];
      expect(value(read.star)).toBe(e.star);
      expect([read.params.vocal, read.params.dance, read.params.visual].map(value)).toEqual(e.params);
      expect([read.bonusPermil.vocal, read.bonusPermil.dance, read.bonusPermil.visual].map(value)).toEqual(e.bonusPermil);
      expect(value(read.affection)).toBe(e.affection);
      expect(read.slots.map(slotDigit)).toEqual(e.slots);
      expect(read.slots.map((s) => s.item?.value ?? null)).toEqual(e.icons);
      expect([read.custom?.character.value, read.custom?.accessory.value]).toEqual(e.custom);
      const all = [read.star, read.affection, ...Object.values(read.params), ...Object.values(read.bonusPermil)];
      const left = read.slots.flatMap((s) => (s.state === "badge" ? [s.left] : []));
      expect(Math.min(...confidences([...all, ...left]))).toBeGreaterThanOrEqual(UNSURE);
    });

    test(`${sample}, 編成`, async () => {
      const read = readScreenshot(await loadFixture(`${sample}-hensei`), refs);
      if (read?.tab !== "hensei") throw new Error("not read as 編成");
      const e = HENSEI[sample];
      expect(read.tiles.map((t) => t.cards[0]?.id)).toEqual(e.cards);
      expect(read.tiles.map((t) => t.cards.length)).toEqual([3, 3, 3, 3, 3, 3]);
      expect(Math.min(...read.tiles.map((t) => t.cardConfidence))).toBeGreaterThanOrEqual(UNSURE);
      expect(read.tiles.map((t) => value(t.level))).toEqual(e.levels);
      expect(read.tiles.map((t) => t.marks)).toEqual(e.marks);
      expect(value(read.refreshes)).toBe(e.counts[2]);
      expect(Math.min(...confidences([...read.tiles.map((t) => t.level), read.refreshes]))).toBeGreaterThanOrEqual(UNSURE);
    });
  }

  test("without references the pictures stay unread", async () => {
    const read = readScreenshot(await loadFixture("dmm-01-hensei"));
    expect(read?.tab === "hensei" ? read.tiles.map((t) => t.cards.length) : null).toEqual([0, 0, 0, 0, 0, 0]);
  });

  test("an image that is neither tab reads as null", () => {
    const data = new Uint8ClampedArray(720 * 1280 * 4).fill(250);
    expect(readScreenshot({ width: 720, height: 1280, data })).toBeNull();
  });
});

describe("bounded", () => {
  test("a value the game cannot show keeps its digits but loses its confidence", () => {
    expect(bounded({ value: 47, confidence: 0.9 }, 28, 37)).toEqual({ value: 47, confidence: 0 });
    expect(bounded({ value: 37, confidence: 0.9 }, 28, 37)).toEqual({ value: 37, confidence: 0.9 });
    expect(bounded(null, 28, 37)).toBeNull();
  });
});
