/**
 * Reading dropped screenshots into the form: the sibling's images are fetched on the first read
 * and kept, each screenshot fills the fields of its tab, and the fields to check stay marked until
 * the player edits them or reads that tab again.
 */

import { useRef, useState } from "preact/hooks";
import type { Card, CardDataFile } from "../data/contract.ts";
import { type References, readScreenshot } from "../reader/read.ts";
import { type Filled, fromHensei, fromKihon, touchedKeys } from "./fill.ts";
import type { FormState } from "./form.ts";
import { itemIdsOf, loadReferences, rasterOf } from "./screenshots.ts";

export type ReadStatus = "idle" | "reading" | "unread";

/** Whether a mark belongs to the 編成 tab's fields; the rest are 基本情報's. */
const ofHensei = (key: string) => /^(deck|level)\.|^refreshes$/.test(key);

export interface Screenshots {
  status: ReadStatus;
  /** The fields to check, by `fill.ts`'s keys. */
  check: ReadonlySet<string>;
  /** Per deck slot, the next-best cards of the last 編成 read. */
  alternatives: readonly (readonly string[])[] | null;
  read: (files: File[]) => void;
  /** The form's update, which also settles the marks of the fields it changes. */
  edit: (patch: Partial<FormState>) => void;
}

export function useScreenshots(form: FormState, update: (patch: Partial<FormState>) => void, data: CardDataFile | null, cards: ReadonlyMap<string, Card> | null): Screenshots {
  const [status, setStatus] = useState<ReadStatus>("idle");
  const [check, setCheck] = useState<ReadonlySet<string>>(new Set());
  const [alternatives, setAlternatives] = useState<string[][] | null>(null);
  const refs = useRef<Promise<References> | null>(null);
  const latest = useRef(form);
  latest.current = form;

  const fill = (filled: Filled, tab: "kihon" | "hensei") => {
    update(filled.patch);
    latest.current = { ...latest.current, ...filled.patch };
    const kept = (key: string) => (tab === "hensei" ? !ofHensei(key) : ofHensei(key));
    setCheck((prev) => new Set([...[...prev].filter(kept), ...filled.unsure]));
    if (filled.alternatives !== undefined) setAlternatives(filled.alternatives);
  };

  const read = async (files: File[]) => {
    if (data === null || cards === null || files.length === 0) return;
    setStatus("reading");
    refs.current ??= loadReferences(data);
    const references = await refs.current;
    let unread = false;
    for (const file of files) {
      const r = readScreenshot(await rasterOf(file), references);
      if (r === null) unread = true;
      else if (r.tab === "kihon") fill(fromKihon(latest.current, r, itemIdsOf(data)), "kihon");
      else fill(fromHensei(latest.current, r, cards, data.levelLimits), "hensei");
    }
    setStatus(unread ? "unread" : "idle");
  };

  const edit = (patch: Partial<FormState>) => {
    const settled = new Set(touchedKeys(latest.current, patch));
    if (settled.size > 0) setCheck((prev) => new Set([...prev].filter((k) => !settled.has(k))));
    update(patch);
  };

  return {
    status,
    check,
    alternatives,
    read: (files) => {
      read(files).catch((error: unknown) => {
        console.error("reading the screenshots failed", error);
        setStatus("unread");
      });
    },
    edit,
  };
}
