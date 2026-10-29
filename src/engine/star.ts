/** 親愛度 bonus to every スター性 gain, in percent, for Lv28 to Lv37. */
const AFFECTION_BONUS_PERCENT: readonly number[] = [5, 10, 15, 20, 25, 30, 35, 40, 50, 50];
const LOWEST_AFFECTION = 28;

/** gakumas-tools caps スター性 at 1110 until round 2 adds its gain. */
const STAR_CAP_BEFORE_ROUND_2 = 1110;

/** H.I.Fワッペン fires at most 20 times per run. */
export const WAPPEN_FIRES_PER_RUN = 20;

/** SP lesson gains (day 2 and day 5), one ワッペン fire, and each round's highest gain. */
const LESSON_GAINS: readonly number[] = [30, 10];
const WAPPEN_GAIN = 10;
const ROUND_1_GAIN = 120;
const ROUND_2_GAIN = 150;

/**
 * The 親愛度 Lv in force for gains after day 6. The level rises during 本戦 (34 after day 6, 35
 * after the recovery event before round 1, 36 after winning round 1), and when each rise lands
 * against each gain is unconfirmed (open item O5), so every gain after the lessons takes the highest
 * of them: an upper bound must not fall below what the memory can reach.
 */
const LATE_AFFECTION_FLOOR = 36;

export function affectionBonusPercent(level: number): number {
  const percent = Number.isInteger(level) ? AFFECTION_BONUS_PERCENT[level - LOWEST_AFFECTION] : undefined;
  if (percent === undefined) throw new RangeError(`親愛度 Lv must be an integer from 28 to 37, got ${level}`);
  return percent;
}

/** A スター性 gain after the 親愛度 bonus, floored, in integers so no float error can move the floor. */
export function boostedStar(base: number, level: number): number {
  return Math.floor((base * (100 + affectionBonusPercent(level))) / 100);
}

/**
 * The highest スター性 the memory can end 本戦 with: both lessons SP, every remaining ワッペン fire,
 * round 1 at its highest gain, capped at 1110, then round 2 at its highest gain.
 */
export function bestFinalStar(input: { star: number; affection: number; wappenLeft: number }): number {
  const { star, affection, wappenLeft } = input;
  if (!Number.isInteger(wappenLeft) || wappenLeft < 0 || wappenLeft > WAPPEN_FIRES_PER_RUN) {
    throw new RangeError(`ワッペン fires left must be an integer from 0 to 20, got ${wappenLeft}`);
  }
  const late = Math.max(affection, LATE_AFFECTION_FLOOR);
  const lessons = LESSON_GAINS.reduce((sum, base) => sum + boostedStar(base, affection), 0);
  const beforeRound2 = star + lessons + wappenLeft * boostedStar(WAPPEN_GAIN, late) + boostedStar(ROUND_1_GAIN, late);
  return Math.min(STAR_CAP_BEFORE_ROUND_2, beforeRound2) + boostedStar(ROUND_2_GAIN, late);
}
