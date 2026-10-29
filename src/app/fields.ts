/** What the form's text fields read. Pure. */

/** A whole number from what was typed, ignoring anything that is not a digit; null when empty. */
export function wholeOf(text: string): number | null {
  const digits = text.replace(/\D/g, "").slice(0, 7);
  return digits === "" ? null : Number(digits);
}

/** "59.8" (a percentage with at most one decimal) → 598 tenths of a percent; null otherwise. */
export function permilOf(text: string): number | null {
  const t = text.trim().replace(/%$/, "");
  if (!/^\d{1,3}$/.test(t) && !/^\d{1,3}\.\d$/.test(t)) return null;
  const [whole, tenth] = t.split(".");
  return Number(whole) * 10 + Number(tenth ?? "0");
}

/** 598 → "59.8". */
export function percentText(permil: number | null): string {
  return permil === null ? "" : `${Math.floor(permil / 10)}.${permil % 10}`;
}
