/**
 * Reads the card file gakumas-supportcards publishes (src/data/contract.ts) from untrusted JSON.
 * Every value is checked against the contract and copied into a fresh object, so a field the
 * contract does not name is dropped. Anything else that does not match refuses the whole file, with
 * the path of the first bad value: the page never computes with part of the card list.
 */

import { STATS } from "../engine/types.ts";
import {
  type Breakpoint,
  CARD_DATA_FORMAT_VERSION,
  type Card,
  type CardDataFile,
  type CardType,
  type ClassifiedEffect,
  type ConditionRef,
  type EffectKind,
  FILTER_FAMILIES,
  type FilterRef,
  type HeldCard,
  type ItemGrant,
  type LevelLimits,
  type ParsedTrigger,
  type Plan,
  type Rarity,
} from "./contract.ts";

/** The card file does not match the contract; the message names where. */
export class CardDataError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "CardDataError";
  }
}

/** Reads one value as T, or throws naming `path`. */
type Read<T> = (value: unknown, path: string) => T;
type Fields = Record<string, unknown>;

function fail(path: string, expected: string): never {
  throw new CardDataError(`${path}: expected ${expected}`);
}

function isFields(value: unknown): value is Fields {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

const object: Read<Fields> = (value, path) => (isFields(value) ? value : fail(path, "an object"));
const string: Read<string> = (value, path) => (typeof value === "string" ? value : fail(path, "a string"));
const integer: Read<number> = (value, path) =>
  typeof value === "number" && Number.isInteger(value) ? value : fail(path, "an integer");
const literalTrue: Read<true> = (value, path) => (value === true ? value : fail(path, "true"));

function oneOf<T extends string>(options: readonly T[]): Read<T> {
  return (value, path) => options.find((option) => option === value) ?? fail(path, options.join(" | "));
}

function list<T>(item: Read<T>): Read<T[]> {
  return (value, path) =>
    Array.isArray(value) ? value.map((entry: unknown, i: number) => item(entry, `${path}[${i}]`)) : fail(path, "an array");
}

function child(path: string, key: string): string {
  return path === "" ? key : `${path}.${key}`;
}

/** A required field. */
function req<T>(fields: Fields, key: string, read: Read<T>, path: string): T {
  return read(fields[key], child(path, key));
}

/** An optional field: `{ key: value }` when present, `{}` when absent, so no `undefined` keys appear. */
function opt<K extends string, T>(fields: Fields, key: K, read: Read<T>, path: string): Partial<Record<K, T>> {
  const out: Partial<Record<K, T>> = {};
  const value = fields[key];
  if (value !== undefined) out[key] = read(value, child(path, key));
  return out;
}

const CARD_TYPES: readonly CardType[] = [...STATS, "assist"];
const RARITIES: readonly Rarity[] = ["r", "sr", "ssr"];
const PLANS: readonly Plan[] = ["common", "sense", "logic", "anomaly"];
const EFFECT_KINDS: readonly EffectKind[] = ["skill", "event", "item"];

const filterRef: Read<FilterRef> = (value, path) => {
  const f = object(value, path);
  return { family: req(f, "family", oneOf(FILTER_FAMILIES), path), member: req(f, "member", string, path) };
};

const conditionRef: Read<ConditionRef> = (value, path) => {
  const f = object(value, path);
  return {
    kind: req(f, "kind", string, path),
    ...opt(f, "subject", list(filterRef), path),
    min: req(f, "min", integer, path),
    max: req(f, "max", integer, path),
  };
};

const trigger: Read<ParsedTrigger> = (value, path) => {
  const f = object(value, path);
  return {
    occasion: req(f, "occasion", string, path),
    ...opt(f, "filters", list(filterRef), path),
    ...opt(f, "conditions", list(conditionRef), path),
    ...opt(f, "scenario", string, path),
  };
};

const effect: Read<ClassifiedEffect> = (value, path) => {
  const f = object(value, path);
  return {
    stat: req(f, "stat", oneOf(STATS), path),
    value: req(f, "value", integer, path),
    kind: req(f, "kind", oneOf(EFFECT_KINDS), path),
    ...opt(f, "cap", integer, path),
    ...opt(f, "itemId", string, path),
    ...opt(f, "itemName", string, path),
    ...opt(f, "trigger", trigger, path),
    ...opt(f, "bonus", literalTrue, path),
  };
};

const breakpoint: Read<Breakpoint> = (value, path) => {
  const f = object(value, path);
  return {
    minLevel: req(f, "minLevel", integer, path),
    effects: req(f, "effects", list(effect), path),
    eventBonusPermil: req(f, "eventBonusPermil", integer, path),
  };
};

const drinks: Read<{ perFire: number; trigger: ParsedTrigger }> = (value, path) => {
  const f = object(value, path);
  return { perFire: req(f, "perFire", integer, path), trigger: req(f, "trigger", trigger, path) };
};

const itemGrant: Read<ItemGrant> = (value, path) => {
  const f = object(value, path);
  return {
    itemId: req(f, "itemId", string, path),
    itemName: req(f, "itemName", string, path),
    assetId: req(f, "assetId", string, path),
    ...opt(f, "cap", integer, path),
    ...opt(f, "drinks", drinks, path),
  };
};

const card: Read<Card> = (value, path) => {
  const f = object(value, path);
  return {
    id: req(f, "id", string, path),
    name: req(f, "name", string, path),
    assetId: req(f, "assetId", string, path),
    type: req(f, "type", oneOf(CARD_TYPES), path),
    rarity: req(f, "rarity", oneOf(RARITIES), path),
    plan: req(f, "plan", oneOf(PLANS), path),
    breakpoints: req(f, "breakpoints", list(breakpoint), path),
    ...opt(f, "items", list(itemGrant), path),
    ...opt(f, "spRate", literalTrue, path),
  };
};

const heldCard: Read<HeldCard> = (value, path) => {
  const f = object(value, path);
  return { id: req(f, "id", string, path), name: req(f, "name", string, path), reasons: req(f, "reasons", list(string), path) };
};

const levelRow: Read<readonly [number, number, number, number, number]> = (value, path) => {
  const row = list(integer)(value, path);
  const [a, b, c, d, e] = row;
  if (row.length !== 5 || a === undefined || b === undefined || c === undefined || d === undefined || e === undefined) {
    return fail(path, "five levels, one per 凸");
  }
  return [a, b, c, d, e];
};

const levelLimits: Read<LevelLimits> = (value, path) => {
  const f = object(value, path);
  return { r: req(f, "r", levelRow, path), sr: req(f, "sr", levelRow, path), ssr: req(f, "ssr", levelRow, path) };
};

/** The card file, checked whole; throws `CardDataError` at the first value that does not match. */
export function parseCardData(json: unknown): CardDataFile {
  if (!isFields(json)) throw new CardDataError("the card file: expected an object");
  const version = json["formatVersion"];
  if (version !== CARD_DATA_FORMAT_VERSION) {
    throw new CardDataError(
      `card data format version ${JSON.stringify(version)} is not supported: this page reads version ${CARD_DATA_FORMAT_VERSION}`,
    );
  }
  const cards = req(json, "cards", list(card), "");
  if (cards.length === 0) fail("cards", "at least one card");
  return {
    formatVersion: version,
    levelLimits: req(json, "levelLimits", levelLimits, ""),
    cards,
    held: req(json, "held", list(heldCard), ""),
  };
}
