/**
 * The snapshot of the sibling's images in `src/reader/fixtures/` (decision G36), decoded for the
 * tests: every card's thumbnail by card id, ready for `rankCards`, as the page builds it from the
 * images it fetches.
 */

import { type Integral, integral } from "../reader/cards.ts";
import { CARD_DATA } from "./dmm.ts";
import { decodePng } from "./png.ts";

/** A webp fixture decoded: `Bun.Image` turns it into a PNG, which `decodePng` reads. */
export async function loadWebp(path: string) {
  const bytes = await Bun.file(new URL(`../reader/fixtures/${path}`, import.meta.url)).arrayBuffer();
  return decodePng(await new Bun.Image(bytes).png().bytes());
}

export async function loadThumbnails(): Promise<Map<string, Integral>> {
  const out = new Map<string, Integral>();
  for (const card of CARD_DATA.cards) out.set(card.id, integral(await loadWebp(`w192/img_general_${card.assetId}_full.webp`)));
  return out;
}
