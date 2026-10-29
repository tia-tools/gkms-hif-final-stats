import { describe, expect, test } from "bun:test";
import { loadFixture } from "../test-support/png.ts";
import { KIHON, SAMPLES } from "../test-support/samples.ts";
import { integral } from "./cards.ts";
import { STORED_LAYERS } from "./custom-templates.ts";
import { isMedalMoja, readCustom } from "./custom.ts";
import { type Frame, boxOf, locate } from "./layout.ts";
import type { Raster } from "./raster.ts";

async function kihon(sample: string): Promise<{ r: Raster; frame: Frame }> {
  const r = await loadFixture(`${sample}-kihon`);
  const frame = locate(r);
  if (frame === null) throw new Error("not located");
  return { r, frame };
}

describe("readCustom over the samples", () => {
  for (const sample of SAMPLES) {
    test(`${sample}: the カスタム item's character and accessory`, async () => {
      const { r, frame } = await kihon(sample);
      const read = readCustom(integral(r), frame);
      expect([read?.character.value, read?.accessory.value]).toEqual(KIHON[sample].custom);
      expect(read === null ? false : isMedalMoja(read)).toBe(false);
    });
  }
});

/**
 * No sample holds the メダル, so one is painted: over the DMM sample's カスタム item, a plain 黄
 * ground, then the もじゃ layer's cells, then the メダル's (or none), each cell its template colour,
 * at the canvas's place (67 units from (8, 29)).
 */
function paint(r: Raster, frame: Frame, layers: { rgb: string; cover: string }[]): Raster {
  const data = new Uint8ClampedArray(r.data);
  const fill = (x: number, y: number, w: number, h: number, rgb: [number, number, number]) => {
    const b = boxOf(frame, { x, y, w, h });
    for (let py = Math.round(b.y); py < Math.round(b.y + b.h); py++) for (let px = Math.round(b.x); px < Math.round(b.x + b.w); px++) data.set([...rgb, 255], (py * r.width + px) * 4);
  };
  fill(8, 29, 67, 67, [250, 225, 90]);
  const cs = 67 / 16;
  for (const layer of layers) {
    for (let cell = 0; cell < 256; cell++) {
      if (Number.parseInt(layer.cover[cell] ?? "0", 16) / 15 < 0.5) continue;
      const channel = (c: number) => Number.parseInt(layer.rgb.slice(6 * cell + 2 * c, 6 * cell + 2 * c + 2), 16);
      fill(8 + (cell % 16) * cs, 29 + Math.floor(cell / 16) * cs, cs, cs, [channel(0), channel(1), channel(2)]);
    }
  }
  return { width: r.width, height: r.height, data };
}

describe("メダルもじゃ, painted", () => {
  test("もじゃ with the メダル is メダルもじゃ", async () => {
    const { r, frame } = await kihon("iphone-15promax-01");
    const painted = paint(r, frame, [STORED_LAYERS.characters.もじゃ, STORED_LAYERS.accessories.メダル]);
    const read = readCustom(integral(painted), frame);
    expect([read?.character.value, read?.accessory.value]).toEqual(["もじゃ", "メダル"]);
    expect(read === null ? false : isMedalMoja(read)).toBe(true);
  });

  test("もじゃ with no accessory is not", async () => {
    const { r, frame } = await kihon("iphone-15promax-01");
    const read = readCustom(integral(paint(r, frame, [STORED_LAYERS.characters.もじゃ])), frame);
    expect([read?.character.value, read?.accessory.value]).toEqual(["もじゃ", null]);
  });
});
