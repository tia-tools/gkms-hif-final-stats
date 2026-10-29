import { describe, expect, test } from "bun:test";
import { loadIcons, loadThumbnails } from "../test-support/images.ts";
import { loadFixture } from "../test-support/png.ts";
import { HENSEI, KIHON, SAMPLES, type SlotDigit } from "../test-support/samples.ts";
import { type Read, type References, type Slot, UNSURE, bounded, readScreenshot } from "./read.ts";

const refs: References = { thumbs: await loadThumbnails(), icons: await loadIcons() };

const value = (r: Read<number> | null) => r?.value ?? null;

function slotDigit(s: Slot): SlotDigit | "absent" | "hidden" | null {
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

  test("a tile beyond the image's edge is not read, and the others still are", async () => {
    // The DMM 編成 sample moved up 200 rows, its foot padded with the page's grey: still 720 × 1280,
    // but the first row of tiles now starts above the image.
    const full = await loadFixture("dmm-01-hensei");
    const data = new Uint8ClampedArray(full.data.length).fill(250);
    data.set(full.data.subarray(200 * full.width * 4));
    const read = readScreenshot({ ...full, data }, refs);
    if (read?.tab !== "hensei") throw new Error("not read as 編成");
    expect(read.tiles.map((t) => t.cards[0]?.id ?? null)).toEqual([null, null, ...HENSEI["dmm-01"].cards.slice(2)]);
    expect(read.tiles.map((t) => value(t.level))).toEqual([null, null, 50, 60, 60, 60]);
  });

  test("a card with no runner-up, or whose own thumbnail is missing, is not sure", async () => {
    const r = await loadFixture("dmm-01-hensei");
    const only = new Map([...refs.thumbs].filter(([id]) => id === "s_card-3-0099"));
    const alone = readScreenshot(r, { ...refs, thumbs: only });
    expect(alone?.tab === "hensei" ? alone.tiles[0]?.cardConfidence : null).toBe(0);
    // Without csprt-3-0099's thumbnail, another card leads the first tile, at a fit no own card has.
    const without = new Map([...refs.thumbs].filter(([id]) => id !== "s_card-3-0099"));
    const lost = readScreenshot(r, { ...refs, thumbs: without });
    expect(lost?.tab === "hensei" ? lost.tiles[0]?.cardConfidence : null).toBe(0);
  });

  test("a stat past the highest cap keeps its digits but loses its confidence", async () => {
    // On the DMM sample (one unit a pixel), copy Vo's "9" (x 255–268) over its "1" (x 238–251): 9982.
    const r = await loadFixture("dmm-01-kihon");
    const data = new Uint8ClampedArray(r.data);
    for (let y = 585; y < 615; y++) data.copyWithin((y * r.width + 238) * 4, (y * r.width + 255) * 4, (y * r.width + 269) * 4);
    const read = readScreenshot({ ...r, data });
    expect(read?.tab === "kihon" ? read.params.vocal : null).toEqual({ value: 9982, confidence: 0 });
  });

  test("a スター性 past its cap of 1110 keeps its digits but loses its confidence", async () => {
    // On the DMM sample, copy スター性's last "0" (x 146–158) into the space after it: 8100.
    const r = await loadFixture("dmm-01-kihon");
    const data = new Uint8ClampedArray(r.data);
    for (let y = 605; y < 631; y++) data.copyWithin((y * r.width + 161) * 4, (y * r.width + 146) * 4, (y * r.width + 159) * 4);
    const read = readScreenshot({ ...r, data });
    expect(read?.tab === "kihon" ? read.star : null).toEqual({ value: 8100, confidence: 0 });
  });

  test("a shape outside 9:16 to 9:20 is refused, anchor or not (G7)", async () => {
    // The DMM 基本情報 sample cut to 720 × 960, 4:3, with its 「カスタム」 label still in it.
    const full = await loadFixture("dmm-01-kihon");
    expect(readScreenshot({ width: full.width, height: 960, data: full.data.slice(0, full.width * 960 * 4) }, refs)).toBeNull();
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
