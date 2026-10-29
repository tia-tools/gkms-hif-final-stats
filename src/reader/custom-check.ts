/**
 * A stored layer template's checksum: the first 16 hex digits of the SHA-256 of its rgb and cover
 * strings. The generator writes it beside them, and a test recomputes it, so a template edited by
 * hand no longer passes for the generator's output. It cannot catch a fault in the generator: the
 * layer art it reads is not committed (decision G37).
 */
export function payloadCheck(rgb: string, cover: string): string {
  return new Bun.CryptoHasher("sha256").update(`${rgb}:${cover}`).digest("hex").slice(0, 16);
}
