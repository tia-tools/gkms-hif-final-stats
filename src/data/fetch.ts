/**
 * Fetches the card data from gkms-library, in the browser (docs/plans/EXECPLAN_LIBRARY_DATA.md,
 * decision L5): the pointer `data/latest.v1.json` first, which names the newest release of each
 * format and may be kept five minutes, then the `support-cards` v1 release it names, whose name
 * never gets other content, so a browser may keep it forever. Both are checked with the library's
 * own format files. The fetcher is passed in, so this runs under `bun test`.
 */

import { type CardDataFile, parseCardData } from "./cards.ts";
import { parse as parsePointer } from "./latest.v1.ts";

/** gkms-library's public address; it answers every data file and image with `access-control-allow-origin: *`. */
export const LIBRARY = "https://gkms-library.tia.run";
export const POINTER_URL = `${LIBRARY}/data/latest.v1.json`;

async function json(fetcher: (url: string) => Promise<Response>, url: string): Promise<unknown> {
  const res = await fetcher(url);
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
}

/** The newest `support-cards` v1 release, checked whole; throws naming what failed. */
export async function fetchCardData(fetcher: (url: string) => Promise<Response>): Promise<CardDataFile> {
  const pointer = parsePointer(await json(fetcher, POINTER_URL));
  const entry = pointer.files.find((f) => f.format === "support-cards" && f.formatVersion === 1);
  if (entry === undefined) throw new Error("the library's pointer names no support-cards v1 release");
  return parseCardData(await json(fetcher, `${LIBRARY}/${entry.path}`));
}
