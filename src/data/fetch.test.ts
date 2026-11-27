import { describe, expect, test } from "bun:test";
import { CARD_DATA } from "../test-support/dmm.ts";
import { fetchCardData, POINTER_URL } from "./fetch.ts";

const RELEASE = "data/support-cards/v1/20261127T1126Z-44f93c3c.json";
const ENTRY = {
  format: "support-cards",
  formatVersion: 1,
  release: "20261127T1126Z-44f93c3c",
  path: RELEASE,
  sha256: "44f93c3c2dee577d3a345b66fa810f807186b60d5bbd916a29cbb9fc6673481a",
  entries: 218,
};
const IDOLS = { ...ENTRY, format: "idols", release: "20261127T1126Z-0a1b2c3d", path: "data/idols/v1/20261127T1126Z-0a1b2c3d.json", sha256: `0a1b2c3d${"0".repeat(56)}`, entries: 13 };

/** A fake library: each URL it knows answers its JSON, every other a 404; it records what was asked. */
function library(files: Record<string, unknown>) {
  const asked: string[] = [];
  const fetcher = async (url: string) => {
    asked.push(url);
    return url in files ? new Response(JSON.stringify(files[url])) : new Response("Not found", { status: 404 });
  };
  return { asked, fetcher };
}

/** The message `fetchCardData` rejects with, or a failed test if it resolves. */
async function failure(fetcher: (url: string) => Promise<Response>): Promise<string> {
  const outcome = await fetchCardData(fetcher).then(
    () => "resolved",
    (e: unknown) => (e instanceof Error ? e.message : String(e)),
  );
  if (outcome === "resolved") throw new Error("fetchCardData resolved");
  return outcome;
}

describe("fetchCardData", () => {
  test("reads the pointer, then the support-cards v1 release it names", async () => {
    const lib = library({ [POINTER_URL]: { pointerVersion: 1, files: [IDOLS, ENTRY] }, [`https://gkms-library.tia.run/${RELEASE}`]: CARD_DATA });
    expect(await fetchCardData(lib.fetcher)).toEqual(CARD_DATA);
    expect(lib.asked).toEqual([POINTER_URL, `https://gkms-library.tia.run/${RELEASE}`]);
  });

  test("refuses a pointer that names no support-cards v1 release", async () => {
    const lib = library({ [POINTER_URL]: { pointerVersion: 1, files: [IDOLS] } });
    expect(await failure(lib.fetcher)).toContain("names no support-cards v1 release");
  });

  test("refuses a broken pointer, naming the place", async () => {
    const lib = library({ [POINTER_URL]: { pointerVersion: 1, files: [{ ...ENTRY, path: "elsewhere.json" }] } });
    expect(await failure(lib.fetcher)).toContain("latest v1");
  });

  test("refuses a release the library cannot serve, naming its URL", async () => {
    const lib = library({ [POINTER_URL]: { pointerVersion: 1, files: [ENTRY] } });
    expect(await failure(lib.fetcher)).toContain(`${RELEASE}: HTTP 404`);
  });
});
