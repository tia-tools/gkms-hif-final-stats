/**
 * The browser's side of reading screenshots: decoding an image file and the sibling's images into
 * the reader's `Raster`, through `createImageBitmap` and a canvas. I/O only; the reading itself is
 * `src/reader/`, and what it puts into the form is `fill.ts`.
 */

import type { CardDataFile } from "../data/contract.ts";
import { integral } from "../reader/cards.ts";
import { iconTemplate } from "../reader/items.ts";
import type { Raster } from "../reader/raster.ts";
import type { References } from "../reader/read.ts";
import { itemIconUrl, thumbnailUrl } from "./images.ts";

export async function rasterOf(image: Blob): Promise<Raster> {
  const bitmap = await createImageBitmap(image);
  const canvas = new OffscreenCanvas(bitmap.width, bitmap.height);
  const context = canvas.getContext("2d");
  if (context === null) throw new Error("no 2D canvas");
  context.drawImage(bitmap, 0, 0);
  bitmap.close();
  const { width, height, data } = context.getImageData(0, 0, canvas.width, canvas.height);
  return { width, height, data };
}

/**
 * An image at this origin as a `Raster`, or null when it cannot be had: the library lacks it, it
 * is not an image, or it does not decode. One missing image must not stop the others.
 */
async function fetched(url: string): Promise<Raster | null> {
  try {
    const res = await fetch(url);
    if (!res.ok || !(res.headers.get("content-type") ?? "").startsWith("image/")) return null;
    return await rasterOf(await res.blob());
  } catch {
    return null;
  }
}

/**
 * Every card's thumbnail and every card-granted item's icon, from the Worker's `/img/*` (ADR
 * 0001). A card or item whose image the library lacks is left out, and so is never a candidate.
 */
export async function loadReferences(data: CardDataFile): Promise<References> {
  const thumbs = new Map<string, ReturnType<typeof integral>>();
  const icons = new Map<string, ReturnType<typeof iconTemplate>>();
  await Promise.all([
    ...data.cards.map(async (card) => {
      const r = await fetched(thumbnailUrl(card.assetId));
      if (r !== null) thumbs.set(card.id, integral(r));
    }),
    ...[...new Set(data.cards.flatMap((c) => (c.items ?? []).map((i) => i.assetId)))].map(async (assetId) => {
      const r = await fetched(itemIconUrl(assetId));
      if (r !== null) icons.set(assetId, iconTemplate(r));
    }),
  ]);
  return { thumbs, icons };
}

/** Each card-granted item's id by its icon's asset id. */
export function itemIdsOf(data: CardDataFile): Map<string, string> {
  return new Map(data.cards.flatMap((c) => (c.items ?? []).map((i): [string, string] => [i.assetId, i.itemId])));
}
