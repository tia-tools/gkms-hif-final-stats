import type { Stat } from "../engine/types.ts";

/** Each stat as the game names and colours it. */
export const STAT_STYLE: Readonly<Record<Stat, { name: string; short: string; text: string }>> = {
  vocal: { name: "ボーカル", short: "Vo", text: "text-pink-600" },
  dance: { name: "ダンス", short: "Da", text: "text-sky-600" },
  visual: { name: "ビジュアル", short: "Vi", text: "text-amber-600" },
};

/** +2427 and −73, as the margins read. */
export function signed(n: number): string {
  return n >= 0 ? `+${n}` : `−${-n}`;
}
