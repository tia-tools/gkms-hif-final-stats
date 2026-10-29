/**
 * 「H.I.Fボーナス 上限Lv」: the account bonus that sets 本戦's per-stat parameter cap (decision G8).
 * Remembered in the browser, since no screenshot shows it.
 */

/** Lv0–Lv6 → the cap per stat. */
export const CAP_BY_LEVEL: readonly number[] = [3000, 3050, 3080, 3110, 3140, 3170, 3200];
export const DEFAULT_CAP_LEVEL = 6;
export const CAP_STORAGE_KEY = "gkms-hif-final-stats.capLevel";

/** The stored level, or the default when nothing valid is stored. */
export function capLevelOf(stored: string | null): number {
  const level = stored !== null && /^\d$/.test(stored) ? Number(stored) : DEFAULT_CAP_LEVEL;
  return level < CAP_BY_LEVEL.length ? level : DEFAULT_CAP_LEVEL;
}

export function capOf(level: number): number {
  return CAP_BY_LEVEL[level] ?? CAP_BY_LEVEL[DEFAULT_CAP_LEVEL] ?? 3200;
}
