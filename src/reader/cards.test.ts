import { describe, expect, test } from "bun:test";
import { loadThumbnails } from "../test-support/images.ts";
import { loadFixture } from "../test-support/png.ts";
import { HENSEI, SAMPLES } from "../test-support/samples.ts";
import { integral, rankCards } from "./cards.ts";
import { TILES } from "./hensei.ts";
import { locate } from "./layout.ts";

const thumbs = await loadThumbnails();

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
