/**
 * Which support card a 編成 tile shows. A tile is the card's art cropped and zoomed by an amount
 * that differs per card (`Surprises & Discoveries`), so each card's 192 × 108 thumbnail is compared
 * with the tile under a range of zooms and offsets, and the best fit is the card's score. Only the
 * tile's upper part is compared: the Lv, the × marks, the type icon and the rainbow bar cover the
 * rest. Pure.
 */

import { type Frame, boxOf } from "./layout.ts";
import type { Raster } from "./raster.ts";
import { tile } from "./hensei.ts";

/** The compared part of a tile, in tile units. */
const REGION = { x: 4, y: 4, w: 183, h: 62 };
const TILE = { w: 191, h: 107 };

/**
 * A grid: the cells the region is split into. The coarse search scores every card on a small grid
 * over a few zooms and offsets; the refinement walks the best few from there on a finer grid.
 */
interface Grid {
  cols: number;
  rows: number;
}

/** A placement of the thumbnail under the tile: zoom, and offsets as shares (−1 to 1) of the slack. */
interface Pose {
  z: number;
  fx: number;
  fy: number;
}

const steps = (from: number, to: number, step: number) => Array.from({ length: Math.round((to - from) / step) + 1 }, (_, i) => from + i * step);

const COARSE: Grid = { cols: 16, rows: 6 };
const FINE: Grid = { cols: 30, rows: 10 };
/** Zooms up to 2: a sample tile measured 1.8. */
const ZOOM = { min: 1, max: 2.2 };
const COARSE_POSES: readonly Pose[] = steps(1, 2, 0.2).flatMap((z) => steps(-1, 1, 0.5).flatMap((fx) => steps(-1, 1, 0.5).map((fy) => ({ z, fx, fy }))));
/** The refinement's step sizes, halved in turn: zoom, and offset share. */
const WALK = [
  { z: 0.1, f: 0.25 },
  { z: 0.05, f: 0.125 },
  { z: 0.025, f: 0.0625 },
];
/** How many of the coarse search's best the refinement re-scores. */
const REFINED = 8;

/** A tile's or a fit's colours: one cell after another, R, G and B each. */
export type Signature = Float32Array;

/** Sums of R, G and B over every rectangle from the origin, for box averages in constant time. */
export interface Integral {
  w: number;
  h: number;
  sums: Float64Array;
}

export function integral(r: Raster): Integral {
  const w = r.width + 1;
  const sums = new Float64Array(w * (r.height + 1) * 3);
  for (let y = 0; y < r.height; y++) {
    for (let x = 0; x < r.width; x++) {
      const i = (y * r.width + x) * 4;
      const o = ((y + 1) * w + x + 1) * 3;
      for (let c = 0; c < 3; c++) {
        sums[o + c] = (r.data[i + c] ?? 0) + (sums[o - 3 + c] ?? 0) + (sums[o - w * 3 + c] ?? 0) - (sums[o - w * 3 - 3 + c] ?? 0);
      }
    }
  }
  return { w, h: r.height + 1, sums };
}

/** The mean colour over the rectangle [x0, x1) × [y0, y1), clamped to the image, into out[at..at+2]. */
function boxMean(t: Integral, rect: { x0: number; y0: number; x1: number; y1: number }, out: Float32Array, at: number): void {
  const cx0 = Math.max(0, Math.min(t.w - 1, Math.round(rect.x0)));
  const cx1 = Math.max(cx0 + 1, Math.min(t.w - 1, Math.round(rect.x1)));
  const cy0 = Math.max(0, Math.min(t.h - 1, Math.round(rect.y0)));
  const cy1 = Math.max(cy0 + 1, Math.min(t.h - 1, Math.round(rect.y1)));
  const n = (cx1 - cx0) * (cy1 - cy0);
  for (let c = 0; c < 3; c++) {
    const s = (t.sums[(cy1 * t.w + cx1) * 3 + c] ?? 0) - (t.sums[(cy0 * t.w + cx1) * 3 + c] ?? 0) - (t.sums[(cy1 * t.w + cx0) * 3 + c] ?? 0) + (t.sums[(cy0 * t.w + cx0) * 3 + c] ?? 0);
    out[at + c] = s / n;
  }
}

/** The mean colour over a box of pixels, into out[0..2]. */
export function boxMeanOf(t: Integral, b: { x: number; y: number; w: number; h: number }, out: Float32Array): void {
  boxMean(t, { x0: b.x, y0: b.y, x1: b.x + b.w, y1: b.y + b.h }, out, 0);
}

/** Signature of a rectangle of an image mapped onto the tile: tile unit (u, v) ↦ (x0 + u·sx, y0 + v·sy). */
function signatureOf(t: Integral, grid: Grid, x0: number, y0: number, sx: number, sy: number): Signature {
  const out = new Float32Array(grid.cols * grid.rows * 3);
  const cw = REGION.w / grid.cols;
  const ch = REGION.h / grid.rows;
  for (let j = 0; j < grid.rows; j++) {
    for (let i = 0; i < grid.cols; i++) {
      const u = REGION.x + i * cw;
      const v = REGION.y + j * ch;
      boxMean(t, { x0: x0 + u * sx, y0: y0 + v * sy, x1: x0 + (u + cw) * sx, y1: y0 + (v + ch) * sy }, out, (j * grid.cols + i) * 3);
    }
  }
  return out;
}

/** Tile k's signature on a grid, from the screenshot's integral image. */
export function tileSignature(screen: Integral, frame: Frame, k: number, grid: Grid): Signature {
  const b = boxOf(frame, tile(k));
  return signatureOf(screen, grid, b.x, b.y, b.w / TILE.w, b.h / TILE.h);
}

/** Mean squared difference per channel, 0 when identical. */
function difference(a: Signature, b: Signature): number {
  let sum = 0;
  for (let i = 0; i < a.length; i++) sum += ((a[i] ?? 0) - (b[i] ?? 0)) ** 2;
  return sum / a.length;
}

/** How far the thumbnail, placed by the pose, is from the tile: lower is better. */
function score(tileSig: Signature, thumb: Integral, grid: Grid, pose: Pose): number {
  const tw = thumb.w - 1;
  const th = thumb.h - 1;
  const sx = tw / TILE.w / pose.z;
  const sy = th / TILE.h / pose.z;
  const slackX = tw - TILE.w * sx;
  const slackY = th - TILE.h * sy;
  return difference(tileSig, signatureOf(thumb, grid, (slackX * (1 + pose.fx)) / 2, (slackY * (1 + pose.fy)) / 2, sx, sy));
}

interface Fit {
  pose: Pose;
  score: number;
}

function coarseFit(tileSig: Signature, thumb: Integral): Fit {
  let best: Fit = { pose: COARSE_POSES[0] ?? { z: 1, fx: 0, fy: 0 }, score: Number.POSITIVE_INFINITY };
  for (const pose of COARSE_POSES) {
    const s = score(tileSig, thumb, COARSE, pose);
    if (s < best.score) best = { pose, score: s };
  }
  return best;
}

const clampPose = (p: Pose): Pose => ({
  z: Math.min(ZOOM.max, Math.max(ZOOM.min, p.z)),
  fx: Math.min(1, Math.max(-1, p.fx)),
  fy: Math.min(1, Math.max(-1, p.fy)),
});

/** The 27 moves of one step: each of zoom and the two offsets down, kept or up. */
const MOVES = [-1, 0, 1].flatMap((dz) => [-1, 0, 1].flatMap((dx) => [-1, 0, 1].map((dy) => ({ dz, dx, dy }))));

/** From a pose, steps to whichever neighbouring pose fits better, until none does, at each step size. */
function refine(tileSig: Signature, thumb: Integral, start: Pose): Fit {
  let best: Fit = { pose: start, score: score(tileSig, thumb, FINE, start) };
  for (const step of WALK) {
    for (let moved = true; moved; ) {
      moved = false;
      const { z, fx, fy } = best.pose;
      for (const { dz, dx, dy } of MOVES) {
        const pose = clampPose({ z: z + dz * step.z, fx: fx + dx * step.f, fy: fy + dy * step.f });
        const s = score(tileSig, thumb, FINE, pose);
        if (s < best.score) [best, moved] = [{ pose, score: s }, true];
      }
    }
  }
  return best;
}

export interface Candidate {
  id: string;
  score: number;
}

/**
 * The cards whose thumbnails best fit tile k, best first: every card by the coarse search, then the
 * best few refined from there, whose scores are the ones returned.
 */
export function rankCards(screen: Integral, frame: Frame, k: number, thumbs: ReadonlyMap<string, Integral>): Candidate[] {
  const coarse = tileSignature(screen, frame, k, COARSE);
  const fine = tileSignature(screen, frame, k, FINE);
  const fits = [...thumbs].map(([id, thumb]) => ({ id, thumb, fit: coarseFit(coarse, thumb) }));
  fits.sort((a, b) => a.fit.score - b.fit.score);
  return fits
    .slice(0, REFINED)
    .map(({ id, thumb, fit }) => ({ id, score: refine(fine, thumb, fit.pose).score }))
    .sort((a, b) => a.score - b.score);
}
