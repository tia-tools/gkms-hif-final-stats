import { describe, expect, test } from "bun:test";
import { decodePng, loadFixture } from "./png.ts";
import type { Raster } from "../reader/raster.ts";

function sha256Prefix(r: Raster): string {
  return new Bun.CryptoHasher("sha256").update(r.data).digest("hex").slice(0, 16);
}

function pixel(r: Raster, x: number, y: number): number[] {
  const at = (y * r.width + x) * 4;
  return Array.from(r.data.subarray(at, at + 4));
}

// The expected values were read with Pillow 12.3 (`Image.open(…).convert("RGBA")`), an
// independent decoder, on 2026-10-29.
describe("decodePng", () => {
  test("an RGBA screenshot decodes to Pillow's pixels, transparent corner included", async () => {
    const r = await loadFixture("dmm-01-kihon");
    expect([r.width, r.height]).toEqual([720, 1280]);
    expect(sha256Prefix(r)).toBe("d456dc3fc6056f8b");
    expect(pixel(r, 100, 100)).toEqual([200, 183, 249, 255]);
    expect(pixel(r, 719, 1279)).toEqual([0, 0, 0, 0]);
  });

  test("an RGB screenshot gains an opaque alpha", async () => {
    const r = await loadFixture("iphone-15promax-01-kihon");
    expect([r.width, r.height]).toEqual([1290, 2796]);
    expect(sha256Prefix(r)).toBe("8b5625d7d64e6383");
    expect(pixel(r, 1289, 2795)).toEqual([250, 250, 250, 255]);
  });

  test("refuses what it cannot read", async () => {
    expect(() => decodePng(new Uint8Array([1, 2, 3]))).toThrow("no PNG signature");
    const png = await Bun.file(new URL("../reader/fixtures/iphone-se3-01-hensei.png", import.meta.url)).bytes();
    const palette = png.slice();
    palette[25] = 3;
    expect(() => decodePng(palette)).toThrow("colour type 3");
  });
});
