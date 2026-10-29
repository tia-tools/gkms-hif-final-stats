import { describe, expect, test } from "bun:test";
import { classify, decodeTemplates, encodeTemplate, readMask } from "./digits.ts";
import { GRID_H, GRID_W, type Mask, normalize, segment } from "./glyphs.ts";

const CELLS = GRID_W * GRID_H;

describe("classify", () => {
  const a = new Float32Array(CELLS).fill(1);
  const b = new Float32Array(CELLS).fill(0);
  const templates = new Map([
    ["1", a],
    ["7", b],
  ]);

  test("the nearest template wins, sure when the runner-up is far", () => {
    expect(classify(a, templates)).toEqual({ char: "1", confidence: 1 });
  });

  test("far from every template is no sure reading, however far it leads (a damaged or covered glyph)", () => {
    // Three quarters inked: 0.25 from "1", 0.75 from "7".
    const cells = Float32Array.from({ length: CELLS }, (_, i) => (i < (CELLS * 3) / 4 ? 1 : 0));
    expect(classify(cells, templates)).toEqual({ char: "1", confidence: 0 });
  });

  test("halfway between two templates is a guess", () => {
    expect(classify(new Float32Array(CELLS).fill(0.5), templates).confidence).toBe(0);
  });
});

describe("readMask", () => {
  // "1.1" and a speck: two bars, a dot on the baseline, one stray pixel near the top.
  const w = 30;
  const h = 12;
  const mask: Mask = { w, h, ink: new Uint8Array(w * h) };
  const fill = (x0: number, y0: number, rw: number, rh: number) => {
    for (let y = y0; y < y0 + rh; y++) for (let x = x0; x < x0 + rw; x++) mask.ink[y * w + x] = 1;
  };
  fill(2, 1, 2, 10);
  fill(7, 9, 2, 2);
  fill(12, 1, 2, 10);
  fill(20, 2, 1, 1);
  const [bar] = segment(mask);
  if (bar === undefined) throw new Error("no glyph");
  const templates = new Map([
    ["1", normalize(mask, bar)],
    ["0", new Float32Array(CELLS)],
  ]);

  test("a short glyph on the baseline is a decimal point; a speck is dropped", () => {
    expect(readMask(mask, templates, true)?.text).toBe("1.1");
  });

  test("without dots the point is dropped too", () => {
    expect(readMask(mask, templates)?.text).toBe("11");
  });

  test("an empty mask reads as nothing", () => {
    expect(readMask({ w: 4, h: 4, ink: new Uint8Array(16) }, templates)).toBeNull();
  });
});

describe("stored templates", () => {
  test("round-trip in sixteenths", () => {
    const cells = Float32Array.from({ length: CELLS }, (_, i) => (i % 16) / 15);
    const [back] = decodeTemplates({ x: encodeTemplate(cells) }).values();
    expect(Array.from(back ?? [])).toEqual(Array.from(cells));
  });

  test("a template of the wrong size is refused", () => {
    expect(() => decodeTemplates({ x: "0f" })).toThrow("2 cells");
  });
});
