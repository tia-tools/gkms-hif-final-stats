/**
 * The format files copied from https://gkms-library.tia.run/formats/ never change there (the
 * library's ADR 0005): a change of shape is a new file with the next version number. This test fails
 * on any edit to a copy, a comment included, so the check this page runs stays the library's own.
 * The hashes are the ones gkms-library pins in its formats/pinned.test.ts.
 */

import { describe, expect, test } from "bun:test";
import { createHash } from "node:crypto";

const COPIED: readonly { file: URL; sha256: string }[] = [
  { file: new URL("./latest.v1.ts", import.meta.url), sha256: "4100dc880a64eb53fc18f1defa3544583a331dcbc38514ea24047461ae0ae0a1" },
  { file: new URL("./support-cards.v1.ts", import.meta.url), sha256: "a9b0c7a95e13f5b20adaa5e6597d69d1c073064dc71ff7520b6783cfbf89aaf1" },
];

describe("the library's format files", () => {
  test("each copy is byte for byte what the library published", async () => {
    for (const { file, sha256 } of COPIED) {
      const actual = createHash("sha256").update(await Bun.file(file).bytes()).digest("hex");
      expect(`${file.pathname} ${actual}`).toBe(`${file.pathname} ${sha256}`);
    }
  });
});
