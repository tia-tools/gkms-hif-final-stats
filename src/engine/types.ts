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
  /** 相談リフレッシュ回数 残り, on the 編成 tab: each one is another 4 P-drinks to buy at the day-6 相談 (decision G24). */
  refreshesLeft: number;
  /** The first P-item, the カスタム item, is the 黄 メダルもじゃ: 2 deletions at the 相談 (decisions G24, G33). */
  medalMoja: boolean;
}

/** A support card in the deck at its level. */
export interface DeckSlot {
  cardId: string;
  level: number;
}

/** The item id H.I.Fワッペン takes among the held P-items. */
export const WAPPEN = "wappen";

/** A P-item the memory holds, with the fires left that its icon shows. Absent: the item's cap if it has one, else no limit. */
export interface HeldItem {
  itemId: string;
  remaining?: number;
}

/** One rank of the result: what it needs, and how far the best total is above (or below) that. */
export interface RankLine {
  rank: string;
  rating: number;
  required: number;
  margin: number;
  /** "Not reachable" while a held deck card's uncounted ability has no manual value (decision G12). */
  provisional: boolean;
}

/** Vo + Da + Vi. */
export function sumStats(values: Record<Stat, number>): number {
  return values.vocal + values.dance + values.visual;
}
