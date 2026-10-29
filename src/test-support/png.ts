/**
 * A PNG decoder for the tests, which have no canvas: 8-bit RGB or RGBA, not interlaced. That covers
 * the sample screenshots and what `Bun.Image` writes when it turns a webp thumbnail into a PNG. The
 * page never needs it: there the browser decodes.
 */

import { inflateSync } from "node:zlib";
import type { Raster } from "../reader/raster.ts";

const SIGNATURE = [137, 80, 78, 71, 13, 10, 26, 10];
const CHANNELS: ReadonlyMap<number, number> = new Map([
  [2, 3],
  [6, 4],
]);

interface Header {
  width: number;
  height: number;
  channels: number;
}

function readHeader(view: DataView, at: number, body: Uint8Array): Header {
  const depth = body[8];
  const colourType = body[9] ?? -1;
  const interlace = body[12];
  const channels = CHANNELS.get(colourType);
  if (depth !== 8 || channels === undefined || interlace !== 0) {
    throw new Error(`PNG: only 8-bit RGB or RGBA without interlace, not depth ${depth} colour type ${colourType} interlace ${interlace}`);
  }
  return { width: view.getUint32(at), height: view.getUint32(at + 4), channels };
}

function chunks(bytes: Uint8Array): { header: Header; data: Uint8Array } {
  if (!SIGNATURE.every((b, i) => bytes[i] === b)) throw new Error("PNG: no PNG signature");
  const view = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  let header: Header | null = null;
  const parts: Uint8Array[] = [];
  for (let at = 8; at + 8 <= bytes.length; ) {
    const length = view.getUint32(at);
    const type = String.fromCharCode(...bytes.subarray(at + 4, at + 8));
    const body = bytes.subarray(at + 8, at + 8 + length);
    if (type === "IHDR") header = readHeader(view, at + 8, body);
    if (type === "IDAT") parts.push(body);
    if (type === "IEND") break;
    at += 12 + length;
  }
  if (header === null) throw new Error("PNG: no IHDR chunk");
  return { header, data: Buffer.concat(parts) };
}

function paeth(a: number, b: number, c: number): number {
  const p = a + b - c;
  const pa = Math.abs(p - a);
  const pb = Math.abs(p - b);
  const pc = Math.abs(p - c);
  if (pa <= pb && pa <= pc) return a;
  return pb <= pc ? b : c;
}

const PREDICTORS: readonly ((a: number, b: number, c: number) => number)[] = [
  () => 0,
  (a) => a,
  (_a, b) => b,
  (a, b) => (a + b) >> 1,
  paeth,
];

/** Undoes each row's filter (PNG § 9): `left`, `up` and `upLeft` are the bytes one pixel back. */
function unfilter(raw: Uint8Array, { width, height, channels }: Header): Uint8Array {
  const stride = width * channels;
  const out = new Uint8Array(stride * height);
  for (let y = 0; y < height; y++) {
    const start = y * (stride + 1);
    const predict = PREDICTORS[raw[start] ?? -1];
    if (predict === undefined) throw new Error(`PNG: unknown filter ${raw[start]} on row ${y}`);
    const row = y * stride;
    for (let x = 0; x < stride; x++) {
      const left = x >= channels ? (out[row + x - channels] ?? 0) : 0;
      const up = y > 0 ? (out[row - stride + x] ?? 0) : 0;
      const upLeft = x >= channels && y > 0 ? (out[row - stride + x - channels] ?? 0) : 0;
      out[row + x] = (raw[start + 1 + x] ?? 0) + predict(left, up, upLeft);
    }
  }
  return out;
}

export function decodePng(bytes: Uint8Array): Raster {
  const { header, data } = chunks(bytes);
  const pixels = unfilter(inflateSync(data), header);
  const { width, height, channels } = header;
  if (channels === 4) return { width, height, data: new Uint8ClampedArray(pixels.buffer) };
  const rgba = new Uint8ClampedArray(width * height * 4);
  for (let i = 0, o = 0; i < pixels.length; i += 3, o += 4) {
    rgba[o] = pixels[i] ?? 0;
    rgba[o + 1] = pixels[i + 1] ?? 0;
    rgba[o + 2] = pixels[i + 2] ?? 0;
    rgba[o + 3] = 255;
  }
  return { width, height, data: rgba };
}

/** A fixture screenshot from `src/reader/fixtures/`, by its name without `.png`. */
export async function loadFixture(name: string): Promise<Raster> {
  return decodePng(await Bun.file(new URL(`../reader/fixtures/${name}.png`, import.meta.url)).bytes());
}
