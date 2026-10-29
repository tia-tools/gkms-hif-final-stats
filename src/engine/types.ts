/** The three parameters: Vo, Da, Vi. */
export type Stat = "vocal" | "dance" | "visual";

/** Every stat, in the order the game lists them; searches try them in this order. */
export const STATS: readonly Stat[] = ["vocal", "dance", "visual"];

/** What a 選抜試験メモリー carries into 本戦 that the arithmetic needs. */
export interface Memory {
  params: Record<Stat, number>;
  /** パラメータボーナス in tenths of a percent: 59.8% → 598. */
  bonusPermil: Record<Stat, number>;
  star: number;
  /** 親愛度 Lv, 28–37. */
  affection: number;
}

/** Vo + Da + Vi. */
export function sumStats(values: Record<Stat, number>): number {
  return values.vocal + values.dance + values.visual;
}
