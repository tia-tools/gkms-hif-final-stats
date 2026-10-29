/**
 * What each sample screenshot in `src/reader/fixtures/` shows, read by eye on 2026-10-29 (decision
 * G32). The reader's tests compare with these, and the glyph templates are cut from them. DMM 01
 * and iPhone 15 Pro Max 01 are the same memory on two devices.
 */

export const SAMPLES = ["dmm-01", "iphone-15promax-01", "iphone-15promax-02", "iphone-15promax-03", "iphone-16e-01", "iphone-se3-01"] as const;
export type Sample = (typeof SAMPLES)[number];

/** A P-item slot's fires-left digit: a number, "none" with no disc, or "spent" (発動済み). */
export type SlotDigit = number | "none" | "spent";

export interface KihonSample {
  star: number;
  params: [number, number, number];
  /** Tenths of a percent, Vo, Da, Vi. */
  bonusPermil: [number, number, number];
  /** null where the idol image hides it (the tab is scrolled). */
  affection: number | null;
  slots: SlotDigit[];
}

export interface HenseiSample {
  /** The six support cards, row by row, matched by art and checked by eye. */
  cards: string[];
  levels: number[];
  /** Lit × marks per tile: the card's 凸. */
  marks: number[];
  /** The three count lines: 再抽選, 除去 and 相談リフレッシュ 残り. */
  counts: [number, number, number];
}

const DMM_KIHON: KihonSample = {
  star: 810,
  params: [1982, 2468, 1050],
  bonusPermil: [371, 598, 288],
  affection: 37,
  slots: [1, "none", 4, 1, "none", 1, 1],
};

const DMM_HENSEI: HenseiSample = {
  cards: ["s_card-3-0099", "s_card-3-0062", "s_card-2-0007", "s_card-3-0082", "s_card-3-0066", "s_card-3-0069"],
  levels: [60, 60, 50, 60, 60, 60], marks: [4, 4, 4, 4, 4, 4], counts: [2, 0, 1] };

export const KIHON: Record<Sample, KihonSample> = {
  "dmm-01": DMM_KIHON,
  "iphone-15promax-01": DMM_KIHON,
  "iphone-15promax-02": {
    star: 825,
    params: [2074, 1826, 958],
    bonusPermil: [547, 513, 252],
    affection: 37,
    slots: [1, "none", 2, "spent", "none", "none", "none"],
  },
  "iphone-15promax-03": {
    star: 795,
    params: [2523, 1775, 635],
    bonusPermil: [533, 507, 258],
    affection: 37,
    slots: [1, "none", 5, "none", "none", "none"],
  },
  "iphone-16e-01": {
    star: 814,
    params: [820, 2598, 1865],
    bonusPermil: [280, 564, 500],
    affection: 37,
    slots: [2, "none", 3, "none", 4, "none"],
  },
  "iphone-se3-01": {
    star: 735,
    params: [892, 2661, 1543],
    bonusPermil: [286, 548, 532],
    affection: null,
    slots: [1, "none", 9, "none", 1, "none", 3],
  },
};

export const HENSEI: Record<Sample, HenseiSample> = {
  "dmm-01": DMM_HENSEI,
  "iphone-15promax-01": DMM_HENSEI,
  "iphone-15promax-02": {
    cards: ["s_card-3-0065", "s_card-3-0001", "s_card-3-0094", "s_card-3-0079", "s_card-3-0069", "s_card-3-0072"],
    levels: [55, 60, 60, 55, 55, 60], marks: [3, 4, 4, 3, 3, 4], counts: [3, 3, 0] },
  "iphone-15promax-03": {
    cards: ["s_card-3-0042", "s_card-3-0079", "s_card-2-0007", "s_card-3-0069", "s_card-3-0065", "s_card-3-0072"],
    levels: [50, 60, 50, 60, 60, 60], marks: [2, 4, 4, 4, 4, 4], counts: [4, 3, 1] },
  "iphone-16e-01": {
    cards: ["s_card-3-0070", "s_card-3-0069", "s_card-3-0030", "s_card-2-0007", "s_card-3-0077", "s_card-3-0064"],
    levels: [40, 40, 40, 50, 45, 60], marks: [0, 0, 0, 4, 1, 4], counts: [0, 0, 0] },
  "iphone-se3-01": {
    cards: ["s_card-3-0030", "s_card-2-0007", "s_card-3-0070", "s_card-3-0077", "s_card-3-0064", "s_card-3-0069"],
    levels: [50, 50, 40, 40, 40, 60], marks: [2, 4, 0, 0, 0, 4], counts: [3, 2, 0] },
};

/** Tenths of a percent as the screen writes it: 371 → "37.1". */
export function permilText(permil: number): string {
  return `${Math.floor(permil / 10)}.${permil % 10}`;
}
