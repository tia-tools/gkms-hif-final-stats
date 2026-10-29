/** The glyph templates of each font, as the reader compares them (see `fonts.ts`). */

import { type Templates, decodeTemplates } from "./digits.ts";
import { FALLBACK, type FontClass, withFallback } from "./fonts.ts";
import { STORED_TEMPLATES } from "./glyph-templates.ts";

const own = (font: FontClass): Templates => decodeTemplates(STORED_TEMPLATES[font]);

function build(font: FontClass): Templates {
  const fallback = FALLBACK[font];
  return withFallback(own(font), fallback === undefined ? undefined : own(fallback));
}

export const TEMPLATES: Record<FontClass, Templates> = {
  bold: build("bold"),
  bonus: build("bonus"),
  badge: build("badge"),
  lv: build("lv"),
  count: build("count"),
};
