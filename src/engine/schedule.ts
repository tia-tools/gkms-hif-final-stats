import { type Memory, STATS, type Stat, sumStats } from "./types.ts";

/** One 公開レッスン: the stat the player picks, and the random other stat that also gains (decision G9). */
export interface LessonPlacement {
  main: Stat;
  sub: Stat;
}

/** One way through the 本戦 schedule: the day-2 and day-5 lessons, and the day-1 and day-4 授業. */
export interface Placement {
  lessons: readonly [LessonPlacement, LessonPlacement];
  classes: readonly [Stat, Stat];
}

export interface ScheduleResult {
  placement: Placement;
  /** Each stat after the schedule, capped. */
  params: Record<Stat, number>;
  total: number;
}

/** SP 公開レッスン gains before the bonus: day 2 and day 5. */
const DAY_2_LESSON = { main: 120, sub: 20 };
const DAY_5_LESSON = { main: 140, sub: 80 };

/** A 授業 adds 180 to the stat the player picks, without the bonus. */
const CLASS_GAIN = 180;

/**
 * A lesson gain after パラメータボーナス, floored (open item O4 asks whether the game floors), in
 * integers so no float error can move the floor.
 */
export function lessonGain(base: number, bonusPermil: number): number {
  return Math.floor((base * (1000 + bonusPermil)) / 1000);
}

function pairs<T>(options: readonly T[]): [T, T][] {
  return options.flatMap((first) => options.map((second): [T, T] => [first, second]));
}

const LESSON_CHOICES: readonly LessonPlacement[] = STATS.flatMap((main) =>
  STATS.filter((sub) => sub !== main).map((sub) => ({ main, sub })),
);

/** Every placement, lessons outermost, each stat in STATS order. */
export const PLACEMENTS: readonly Placement[] = pairs(LESSON_CHOICES).flatMap((lessons) =>
  pairs(STATS).map((classes) => ({ lessons, classes })),
);

function addLesson(
  params: Record<Stat, number>,
  bonusPermil: Record<Stat, number>,
  lesson: LessonPlacement,
  gains: { main: number; sub: number },
): void {
  params[lesson.main] += lessonGain(gains.main, bonusPermil[lesson.main]);
  params[lesson.sub] += lessonGain(gains.sub, bonusPermil[lesson.sub]);
}

/** What the placement's lessons and 授業 add to each stat, before the cap. */
export function scheduleGains(memory: Memory, placement: Placement): Record<Stat, number> {
  const gains = { vocal: 0, dance: 0, visual: 0 };
  const [day2, day5] = placement.lessons;
  addLesson(gains, memory.bonusPermil, day2, DAY_2_LESSON);
  addLesson(gains, memory.bonusPermil, day5, DAY_5_LESSON);
  for (const stat of placement.classes) gains[stat] += CLASS_GAIN;
  return gains;
}

/** Each stat plus its gains, capped once at the end: every gain is positive, so that equals capping at each gain. */
export function capped(params: Record<Stat, number>, gains: Record<Stat, number>, cap: number): Record<Stat, number> {
  return {
    vocal: Math.min(cap, params.vocal + gains.vocal),
    dance: Math.min(cap, params.dance + gains.dance),
    visual: Math.min(cap, params.visual + gains.visual),
  };
}

/** Each stat after the placement, capped. */
export function applySchedule(memory: Memory, placement: Placement, cap: number): Record<Stat, number> {
  return capped(memory.params, scheduleGains(memory, placement), cap);
}

/** The placement with the highest capped total; on a tie, the first in PLACEMENTS order. */
export function bestScheduleGain(memory: Memory, cap: number): ScheduleResult {
  return PLACEMENTS.map((placement) => {
    const params = applySchedule(memory, placement, cap);
    return { placement, params, total: sumStats(params) };
  }).reduce((best, next) => (next.total > best.total ? next : best));
}
