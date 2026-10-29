/**
 * Image URLs under `/img/*`, which the Worker answers from R2 and the dev server from the sibling's
 * local library: `w192/` card thumbnails (192 × 108) and `w48/` P-item icons (48 × 48). Adopted
 * from gakumas-supportcards' src/app/images.ts at d08f3de.
 */

export function thumbnailUrl(assetId: string): string {
  return `/img/w192/img_general_${assetId}_full.webp`;
}

/** `assetId` is the item's own, which already starts with `img_general_` (e.g. `img_general_pitem_2-004`). */
export function itemIconUrl(assetId: string): string {
  return `/img/w48/${assetId}.webp`;
}
