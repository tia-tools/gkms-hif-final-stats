import { describe, expect, test } from "bun:test";
import { loadIcons } from "../test-support/images.ts";
import { loadFixture } from "../test-support/png.ts";
import { KIHON, SAMPLES } from "../test-support/samples.ts";
import { integral } from "./cards.ts";
import { slotState } from "./kihon.ts";
import { matchItem, slotRole } from "./items.ts";
import { locate } from "./layout.ts";

const icons = await loadIcons();

describe("the 「Pアイテム」 row", () => {
  for (const sample of SAMPLES) {
    test(`${sample}: each slot's kind by its label, each サポート icon matched or left unknown`, async () => {
      const r = await loadFixture(`${sample}-kihon`);
      const frame = locate(r);
      if (frame === null) throw new Error("not located");
      const e = KIHON[sample];
      const roles = e.slots.map((_, k) => slotRole(r, frame, k));
      expect(roles).toEqual(e.slots.map((_, k) => (["custom", "pidol", "scenario"] as const)[k] ?? "support"));
      const screen = integral(r);
      const matched = e.slots.map((_, k) => (roles[k] === "support" && slotState(r, frame, k) !== "spent" ? (matchItem(screen, frame, k, icons)?.id ?? null) : null));
      expect(matched).toEqual(e.icons);
    });
  }
});
