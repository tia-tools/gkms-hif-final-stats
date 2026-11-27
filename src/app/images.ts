/**
 * Image URLs at gkms-library's address, which serves the game's images under the game's own file
 * names, with `access-control-allow-origin: *` so `screenshots.ts` may fetch and decode them
 * (docs/plans/EXECPLAN_LIBRARY_DATA.md, Milestone 3): `w192/` card art (192 × 108) and `w48/` P-item
 * icons (48 × 48). An image a release names may be missing for a while, and the address tells a
 * browser to remember the miss for four hours.
 */

import { LIBRARY } from "../data/fetch.ts";

export function thumbnailUrl(assetId: string): string {
  return `${LIBRARY}/img/w192/img_general_${assetId}_full.webp`;
}

/** `assetId` is the item's own, which already starts with `img_general_` (e.g. `img_general_pitem_2-004`). */
export function itemIconUrl(assetId: string): string {
  return `${LIBRARY}/img/w48/${assetId}.webp`;
}
