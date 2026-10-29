/**
 * The カスタム P-item in the first slot, read by its layers (decision G33): which character it
 * carries and which accessory, if any. メダルもじゃ is the もじゃ with the メダル; the reader assumes
 * the 黄 one and reads no colour. Every layer shares one canvas, which the game draws about 67 units
 * square from (8, 29) in the slot, so each layer is compared there only: a wrong layer cannot drift
 * to wherever it happens to fit. Pure.
 */

import type { Integral } from "./cards.ts";
import { LAYER_CELLS, STORED_LAYERS } from "./custom-templates.ts";
import { type IconTemplate, type Pose, poseScore } from "./items.ts";
import type { Frame } from "./layout.ts";

export type Character = keyof typeof STORED_LAYERS.characters;
export type Accessory = keyof typeof STORED_LAYERS.accessories;

function decode(stored: { rgb: string; cover: string }): IconTemplate {
  const cells = LAYER_CELLS;
  const rgb = new Float32Array(cells * cells * 3);
  for (let i = 0; i < rgb.length; i++) rgb[i] = Number.parseInt(stored.rgb.slice(2 * i, 2 * i + 2), 16);
  const cover = Float32Array.from(stored.cover, (h) => Number.parseInt(h, 16) / 15);
  if (cover.length !== cells * cells) throw new Error(`layer template: ${cover.length} cells, not ${cells * cells}`);
  return { cells, rgb, cover };
}

function decodeAll<K extends string>(group: Readonly<Record<K, { rgb: string; cover: string }>>): [K, IconTemplate][] {
  return Object.keys(group)
    .filter((name): name is K => name in group)
    .map((name) => [name, decode(group[name])]);
}

const CHARACTERS = decodeAll<Character>(STORED_LAYERS.characters);
const ACCESSORIES = decodeAll<Accessory>(STORED_LAYERS.accessories);

/** The canvas's place in slot 0, within a unit or two of 67 units from (8, 29). */
const POSES: readonly Pose[] = [65, 66, 67, 68, 69, 70].flatMap((size) => [6, 7, 8, 9, 10].flatMap((x) => [27, 28, 29, 30, 31].map((y) => ({ size, x, y }))));

/** Above this no accessory fits: the samples' accessories fit at 188 or better, the others at 1448 or worse. */
export const ACCESSORY_FIT_MAX = 600;
/**
 * Above this the best character is not sure, however far it leads: the samples' characters fit at
 * 1386 or better, and the nearest wrong one at 1795 or worse.
 */
export const CHARACTER_FIT_MAX = 1600;
function fits<K extends string>(screen: Integral, frame: Frame, layers: readonly [K, IconTemplate][]): { name: K; score: number }[] {
  return layers
    .map(([name, t]) => ({ name, score: Math.min(...POSES.map((pose) => poseScore(screen, frame, t, pose))) }))
    .sort((a, b) => a.score - b.score);
}

/** How much nearer the best is than the runner-up; with no runner-up, not sure. */
const margin = (best: number, next: number | undefined) => (next === undefined || !Number.isFinite(next) ? 0 : (next - best) / next);

export interface CustomRead {
  character: { value: Character; confidence: number };
  /** null when no accessory fits. */
  accessory: { value: Accessory | null; confidence: number };
}

export function readCustom(screen: Integral, frame: Frame): CustomRead | null {
  const accessories = fits(screen, frame, ACCESSORIES);
  const [topAccessory, nextAccessory] = accessories;
  if (topAccessory === undefined) return null;
  const worn = topAccessory.score <= ACCESSORY_FIT_MAX;
  const characters = fits(screen, frame, CHARACTERS);
  const [topCharacter, nextCharacter] = characters;
  if (topCharacter === undefined) return null;
  const accessoryConfidence = worn
    ? margin(topAccessory.score, nextAccessory?.score)
    : Math.min(1, (topAccessory.score - ACCESSORY_FIT_MAX) / ACCESSORY_FIT_MAX);
  return {
    character: { value: topCharacter.name, confidence: topCharacter.score <= CHARACTER_FIT_MAX ? margin(topCharacter.score, nextCharacter?.score) : 0 },
    accessory: { value: worn ? topAccessory.name : null, confidence: accessoryConfidence },
  };
}

/** Whether the read カスタム item is メダルもじゃ (G24, G33). */
export function isMedalMoja(read: CustomRead): boolean {
  return read.character.value === "もじゃ" && read.accessory.value === "メダル";
}
