/**
 * The fonts the reader tells apart, each with its own glyph templates:
 * - `bold`: スター性, the stats and 親愛度, dark on the page;
 * - `bonus`: the bonus percentages, dark on their grey pill, with 「%」;
 * - `badge`: a P-item's fires left, white on its grey badge;
 * - `lv`: a support tile's level, white with a dark outline;
 * - `count`: the 編成 tab's 「残りN」 lines, a lighter weight.
 */
export type FontClass = "bold" | "bonus" | "badge" | "lv" | "count";

export const FONT_CLASSES: readonly FontClass[] = ["bold", "bonus", "badge", "lv", "count"];

/**
 * Where a font borrows the characters the samples do not show in it: from the bold font, which the
 * samples show all ten digits of. The level and badge digits have the bold font's shapes (the bold
 * templates alone read every sample Lv right), so a level such as 35 or a badge 7 is read with the
 * bold template. The count lines are a lighter weight, so the bold templates alone misread their
 * 3 as 8; next to the count font's own 0 to 4 they change no sample reading, and they let a count
 * of 5 or more be read at all.
 */
export const FALLBACK: Partial<Record<FontClass, FontClass>> = { badge: "bold", lv: "bold", count: "bold" };

/** A font's templates, with the fallback font's for every character it lacks. */
export function withFallback<T>(own: ReadonlyMap<string, T>, fallback: ReadonlyMap<string, T> | undefined): Map<string, T> {
  const out = new Map(own);
  for (const [char, t] of fallback ?? []) if (!out.has(char)) out.set(char, t);
  return out;
}
