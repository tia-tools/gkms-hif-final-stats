import { describe, expect, test } from "bun:test";
import { loadThumbnails } from "../test-support/images.ts";
import { loadFixture } from "../test-support/png.ts";
import { HENSEI, SAMPLES } from "../test-support/samples.ts";
import { boxMeanOf, integral, rankCards } from "./cards.ts";
import { TILES } from "./hensei.ts";
import { locate } from "./layout.ts";

const thumbs = await loadThumbnails();

describe("boxMeanOf", () => {
  test("a box past the image's right or bottom edge reads the edge's pixels, never beyond them", () => {
    // 2 × 2: red, green / blue, white.
    const data = new Uint8ClampedArray([255, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255, 255, 255, 255, 255]);
    const t = integral({ width: 2, height: 2, data });
    const out = new Float32Array(3);
    boxMeanOf(t, { x: 5, y: 5, w: 1, h: 1 }, out);
    expect(Array.from(out)).toEqual([255, 255, 255]);
    boxMeanOf(t, { x: 0, y: 0, w: 2, h: 2 }, out);
    expect(Array.from(out)).toEqual([127.5, 127.5, 127.5]);
  });
});

// Every tile of every sample against all 210 cards (the snapshot of G36).
describe("rankCards", () => {
  for (const sample of SAMPLES) {
    test(`${sample}: each tile's best fit is its own card, far ahead of the next`, async () => {
      const r = await loadFixture(`${sample}-hensei`);
      const frame = locate(r);
      if (frame === null) throw new Error("not located");
      const screen = integral(r);
      const ranked = Array.from({ length: TILES }, (_, k) => rankCards(screen, frame, k, thumbs));
      expect(ranked.map((c) => c[0]?.id)).toEqual(HENSEI[sample].cards);
      // On 2026-10-29 the runner-up was at least 8.4 times further off than the winner.
      for (const [best, next] of ranked) expect((next?.score ?? 0) / (best?.score ?? 1)).toBeGreaterThan(4);
    });
  }
});
