import { type Stat, sumStats } from "./types.ts";

/** A produce rank and the 評価値 it needs. */
export interface Rank {
  rank: string;
  rating: number;
}

/** Every rank the result lists, S5 first (decision G10). */
export const RANKS: readonly Rank[] = [
  { rank: "S5", rating: 35000 },
  { rank: "S4+", rating: 30000 },
  { rank: "S4", rating: 26000 },
  { rank: "SSS+", rating: 23000 },
  { rank: "SSS", rating: 20000 },
  { rank: "SS+", rating: 18000 },
  { rank: "SS", rating: 16000 },
  { rank: "S+", rating: 14500 },
  { rank: "S", rating: 13000 },
  { rank: "A+", rating: 11500 },
  { rank: "A", rating: 10000 },
];

/** The highest R1評価点 and R2評価点; the bound assumes both rounds reach them (decision G2). */
export const R1_RATING_CAP = 5500;
export const R2_RATING_CAP = 7400;

const RATING_OFFSET = 2000;

/** floor(スター性 × 7.5), in integers so no float error can move the floor. */
function starRating(star: number): number {
  return Math.floor((star * 15) / 2);
}

/** 評価値 = floor(Σparams × 2 + スター性 × 7.5) + R1評価点 + R2評価点 − 2000. Parameters are integers. */
export function rating(params: Record<Stat, number>, star: number, r1Rating: number, r2Rating: number): number {
  return sumStats(params) * 2 + starRating(star) + r1Rating + r2Rating - RATING_OFFSET;
}

/**
 * The smallest Vo+Da+Vi total that reaches `rankRating` with `finalStar` and both rounds at their
 * caps (decision G2), never below 0.
 */
export function requiredTotal(rankRating: number, finalStar: number): number {
  const fromParams = rankRating - starRating(finalStar) - R1_RATING_CAP - R2_RATING_CAP + RATING_OFFSET;
  return Math.max(0, Math.ceil(fromParams / 2));
}
