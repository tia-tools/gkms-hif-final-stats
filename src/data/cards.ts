/**
 * The card data this page reads: gkms-library's format `support-cards`, version 1, published at
 * https://gkms-library.tia.run (docs/plans/EXECPLAN_LIBRARY_DATA.md, decision L1). The shape and its
 * check are the library's own format file, `support-cards.v1.ts` beside this one, copied verbatim
 * and pinned by `formats.test.ts`; never edit it. A change of shape is a new version the library
 * publishes beside the old one, copied in then.
 */

import { parse, type SupportCardsFile } from "./support-cards.v1.ts";

export type {
  Breakpoint,
  Card,
  CardType,
  ClassifiedEffect,
  ConditionRef,
  FilterRef,
  ItemGrant,
  LevelLimits,
  ParsedTrigger,
  Plan,
  Rarity,
  Unread,
} from "./support-cards.v1.ts";
export { FILTER_FAMILIES } from "./support-cards.v1.ts";

/** The whole file: every card, and the effects the library could not read, which are left out of their cards. */
export type CardDataFile = SupportCardsFile;

/**
 * The card file, checked whole by the library's own `parse`. It throws an `Error` naming the place
 * of the first bad value (`support-cards v1: cards.3.rarity: …`): the page never computes with part
 * of the card list. A field the format does not name is refused too, since its objects are strict.
 */
export function parseCardData(json: unknown): CardDataFile {
  return parse(json);
}
