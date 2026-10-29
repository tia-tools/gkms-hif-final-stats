import { describe, expect, test } from "bun:test";
import { collectExamples, leaveOneOut, templatesFile } from "../test-support/glyph-examples.ts";
import { classify } from "./digits.ts";
import { FONT_CLASSES } from "./fonts.ts";
import { TEMPLATES } from "./templates.ts";

describe("glyph templates", () => {
  test("the committed templates are what the script cuts from the samples today", async () => {
    const committed = await Bun.file(new URL("./glyph-templates.ts", import.meta.url)).text();
    // If this fails, run `bun scripts/glyph-templates.ts` and commit the result.
    expect(templatesFile(await collectExamples())).toBe(committed);
  });

  // The evidence that templates carry over to a memory they were not cut from: every glyph is read
  // with templates from the other memories only (2026-10-29: 96, 70, 21, 72 and 17 glyphs).
  test("templates from the other memories read every sample glyph", async () => {
    const examples = await collectExamples();
    for (const font of FONT_CLASSES) {
      const held = leaveOneOut(examples, font);
      expect({ font, misses: held.misses }).toEqual({ font, misses: [] });
      expect(held.total).toBeGreaterThan(0);
    }
  });

  // Lv samples show only 0, 4, 5 and 6, and count samples only 0 to 4.
  test("a digit no sample shows in a font is read with the bold template", async () => {
    const bold = (await collectExamples()).bold;
    const read = (char: string, font: "lv" | "count") => {
      const example = bold.find((e) => e.char === char);
      if (example === undefined) throw new Error(`no bold ${char}`);
      return classify(example.cells, TEMPLATES[font]).char;
    };
    expect(["1", "2", "3", "7", "8", "9"].map((c) => read(c, "lv"))).toEqual(["1", "2", "3", "7", "8", "9"]);
    expect(["5", "6", "7", "8", "9"].map((c) => read(c, "count"))).toEqual(["5", "6", "7", "8", "9"]);
  });
});
