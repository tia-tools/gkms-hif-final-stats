/**
 * Writes `src/reader/glyph-templates.ts`: for each font, the mean shape of every character the
 * sample screenshots show in it (decision G32). Run it after adding or changing a sample, or after
 * changing how the reader cuts glyphs: `bun scripts/glyph-templates.ts`. It also prints, per font,
 * how many glyphs templates cut from the other memories read right, the evidence that the
 * templates carry over to a memory they were not cut from.
 */

import { FONT_CLASSES } from "../src/reader/fonts.ts";
import { average, collectExamples, leaveOneOut, templatesFile } from "../src/test-support/glyph-examples.ts";

const examples = await collectExamples();
for (const font of FONT_CLASSES) {
  const chars = [...average(examples[font]).keys()].sort().join("");
  const held = leaveOneOut(examples, font);
  const misses = held.misses.length > 0 ? `, missed ${held.misses.join(", ")}` : "";
  console.log(`${font}: ${examples[font].length} glyphs, characters ${chars}; other memories' templates read ${held.right}/${held.total}${misses}`);
}
await Bun.write(new URL("../src/reader/glyph-templates.ts", import.meta.url), templatesFile(examples));
