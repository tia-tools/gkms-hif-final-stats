import { describe, expect, test } from "bun:test";
import { PLACEMENTS, type Placement, applySchedule, bestScheduleGain, lessonGain } from "./schedule.ts";
import type { Memory } from "./types.ts";

/** The DMM sample in temp/dmm/: Vo 1982 (37.1%), Da 2468 (59.8%), Vi 1050 (28.8%). */
const DMM: Memory = {
  params: { vocal: 1982, dance: 2468, visual: 1050 },
  bonusPermil: { vocal: 371, dance: 598, visual: 288 },
  star: 810,
  affection: 37,
  refreshesLeft: 1,
  medalMoja: false,
};

const flat = (vocal: number, dance: number, visual: number, bonus: Memory["bonusPermil"]): Memory => ({
  params: { vocal, dance, visual },
  bonusPermil: bonus,
  star: 0,
  affection: 37,
  refreshesLeft: 0,
  medalMoja: false,
});

describe("lessonGain", () => {
  test("floors base × (1 + bonus) per gain", () => {
    expect([lessonGain(120, 598), lessonGain(140, 598), lessonGain(20, 371), lessonGain(80, 371)]).toEqual([
      191, 223, 27, 109,
    ]);
  });

  test("multiplies in integers: 120 at 2.5% is 123, where 120 × 1.025 floors to 122", () => {
    expect(lessonGain(120, 25)).toBe(123);
  });

  test("a stat with no bonus gains the base", () => {
    expect(lessonGain(140, 0)).toBe(140);
  });
});

describe("PLACEMENTS", () => {
  test("holds every schedule once: 3 × 3 lessons, 2 × 2 サブ stats, 3 × 3 授業", () => {
    expect(PLACEMENTS.length).toBe(324);
    expect(new Set(PLACEMENTS.map((p) => JSON.stringify(p))).size).toBe(324);
  });

  test("never puts a lesson's サブ stat on its main stat", () => {
    expect(PLACEMENTS.every((p) => p.lessons.every((l) => l.sub !== l.main))).toBe(true);
  });
});

describe("applySchedule", () => {
  test("adds both lessons with the bonus and both 授業 without it", () => {
    const placement: Placement = {
      lessons: [
        { main: "dance", sub: "vocal" },
        { main: "dance", sub: "vocal" },
      ],
      classes: ["visual", "visual"],
    };
    expect(applySchedule(DMM, placement, 3200)).toEqual({ vocal: 1982 + 136, dance: 2468 + 414, visual: 1050 + 360 });
  });
});

describe("bestScheduleGain", () => {
  test("the DMM sample's schedule-only best total is 6410", () => {
    const best = bestScheduleGain(DMM, 3200);
    expect(best.total).toBe(6410);
    expect(best.placement.lessons).toEqual([
      { main: "dance", sub: "vocal" },
      { main: "dance", sub: "vocal" },
    ]);
    // 授業 to Vo or Vi tie at 360; the search keeps the first, in STATS order
    expect(best.params).toEqual({ vocal: 2478, dance: 2882, visual: 1050 });
  });

  test("steers around a stat near the cap", () => {
    // Da can take 50 more. Best: lessons on Vo/Vi (260), day-2 サブ on Da (32), day-5 サブ elsewhere (80), 授業 360.
    const best = bestScheduleGain(flat(1000, 3150, 1000, { vocal: 0, dance: 600, visual: 0 }), 3200);
    expect(best.total).toBe(5150 + 260 + 32 + 80 + 360);
    expect(best.params.dance).toBe(3182);
  });

  test("a memory at the cap everywhere gains nothing", () => {
    const best = bestScheduleGain(flat(3200, 3200, 3200, { vocal: 500, dance: 500, visual: 500 }), 3200);
    expect(best.total).toBe(9600);
  });

  test("a lower cap lowers the bound", () => {
    expect(bestScheduleGain(flat(3000, 3000, 3000, { vocal: 0, dance: 0, visual: 0 }), 3000).total).toBe(9000);
  });
});
