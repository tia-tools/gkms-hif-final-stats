/** The page's parts in a simulated DOM (happy-dom). No layout: how it looks is checked in a browser. */

import { GlobalRegistrator } from "@happy-dom/global-registrator";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, test } from "bun:test";
import { render } from "preact";
import { act } from "preact/test-utils";
import type { PanelState } from "../engine/total.ts";
import { CARD_DATA, DMM_DECK, DMM_ITEMS, DMM_MEMORY } from "../test-support/dmm.ts";
import { compute } from "./compute.ts";
import { CountPanel } from "./CountPanel.tsx";
import { DeckForm } from "./DeckForm.tsx";
import { CardPicker } from "./CardPicker.tsx";
import { PercentField, WholeField } from "./Fields.tsx";
import { type FormState, emptyForm } from "./form.ts";
import { ItemsForm } from "./ItemsForm.tsx";
import { MemoryForm } from "./MemoryForm.tsx";
import { itemChoices } from "./items.ts";
import { Result } from "./Result.tsx";

function must<T>(value: T | null | undefined, what: string): T {
  if (value === null || value === undefined) throw new Error(`${what} is missing`);
  return value;
}

const DMM_FORM: FormState = {
  ...emptyForm(),
  params: DMM_MEMORY.params,
  bonusPermil: DMM_MEMORY.bonusPermil,
  star: DMM_MEMORY.star,
  deck: DMM_DECK,
  items: Object.fromEntries(DMM_ITEMS.map((i) => [i.itemId, i.remaining ?? null])),
};
const RESULT = must(compute(DMM_FORM, CARD_DATA, 3200).result, "the DMM result");
const NAMES = new Map(CARD_DATA.cards.map((c) => [c.id, c.name]));

let root: HTMLElement;
beforeAll(() => GlobalRegistrator.register());
afterAll(() => GlobalRegistrator.unregister());
beforeEach(() => {
  root = document.body.appendChild(document.createElement("div"));
});
afterEach(() => act(() => render(null, root)));

function type(input: HTMLInputElement, text: string): void {
  input.value = text;
  input.dispatchEvent(new Event("input", { bubbles: true }));
}

describe("Result", () => {
  test("shows the total, S5 short by 73, and highlights the best reachable rank, S4+", async () => {
    await act(() => render(<Result result={RESULT} />, root));
    expect(root.textContent).toContain("6971");
    const rows = [...root.querySelectorAll("tr")].map((tr) => [...tr.querySelectorAll("td")].map((td) => td.textContent));
    expect(rows[0]).toEqual(["S5", "7044", "−73"]);
    expect(rows[1]).toEqual(["S4+", "4544", "+2427"]);
    expect(root.querySelectorAll("tr")[1]?.className).toContain("bg-emerald-50");
    expect(root.querySelectorAll("tr")[0]?.className).not.toContain("bg-emerald-50");
  });

  test("shows a dash until the form holds every number", async () => {
    await act(() => render(<Result result={null} />, root));
    expect(root.textContent).toBe("—");
  });
});

describe("ItemsForm", () => {
  test("tapping an item marks it held, and its fires left are typed under it", async () => {
    const seen: Record<string, number | null>[] = [];
    const choices = itemChoices(DMM_DECK.map((s) => CARD_DATA.cards.find((c) => c.id === s.cardId)));
    await act(() => render(<ItemsForm choices={choices} items={{ wappen: 4 }} onItems={(i) => seen.push(i)} medalMoja={false} onMedalMoja={() => {}} check={new Set()} />, root));
    await act(() => must(root.querySelector<HTMLButtonElement>('button[aria-label="完全制覇でポン"]'), "the item").click());
    await act(() => type(must(root.querySelector<HTMLInputElement>('input[aria-label="H.I.Fワッペン 残り"]'), "ワッペン's field"), "3"));
    expect(seen).toEqual([{ wappen: 4, "pitem_03-3-263-0": null }, { wappen: 3 }]);
  });
});

describe("CountPanel", () => {
  test("a count typed in becomes a panel change, and ↺ puts it back", async () => {
    const changes: PanelState[] = [];
    const draw = (panel: PanelState) => render(<CountPanel result={RESULT} panel={panel} names={NAMES} onPanel={(p) => changes.push(p)} />, root);
    await act(() => draw({}));
    await act(() => type(must(root.querySelector<HTMLInputElement>('input[aria-label="Pドリンク獲得"]'), "the drinks field"), "5"));
    expect(changes.at(-1)?.occasions).toEqual({ GetProduceDrink: 5 });
    await act(() => draw({ occasions: { GetProduceDrink: 5 } }));
    await act(() => must(root.querySelector<HTMLButtonElement>('button[aria-label="Pドリンク獲得を戻す"]'), "the reset").click());
    expect(changes.at(-1)?.occasions).toEqual({});
  });
});

describe("PercentField", () => {
  test("reads 59.8 as 598, and keeps the text while it is not yet a number", async () => {
    const seen: (number | null)[] = [];
    await act(() => render(<PercentField label="ダンスボーナス" value={null} onChange={(v) => seen.push(v)} />, root));
    const input = must(root.querySelector<HTMLInputElement>("input"), "the field");
    await act(() => type(input, "59."));
    await act(() => type(input, "59.8"));
    expect(seen).toEqual([null, 598]);
    expect(input.value).toBe("59.8");
  });
});

describe("CardPicker", () => {
  test("puts the cursor in the search as it opens, so typing a name goes there (the walkthrough found it did not)", async () => {
    await act(() => render(<CardPicker cards={CARD_DATA.cards} onPick={() => {}} onClose={() => {}} />, root));
    expect(document.activeElement).toBe(root.querySelector('input[type="search"]'));
  });

  test("typing narrows the cards, and picking one hands it over", async () => {
    const picked: string[] = [];
    await act(() => render(<CardPicker cards={CARD_DATA.cards} onPick={(c) => picked.push(c.id)} onClose={() => {}} />, root));
    await act(() => type(must(root.querySelector<HTMLInputElement>('input[type="search"]'), "the search"), "もうすぐ本番"));
    const buttons = [...root.querySelectorAll<HTMLButtonElement>('[role="dialog"] .grid button')];
    expect(buttons.map((b) => b.textContent)).toEqual(["もうすぐ本番ですね"]);
    await act(() => buttons[0]?.click());
    expect(picked).toEqual(["s_card-3-0099"]);
  });
});

describe("WholeField", () => {
  test("fills its cell, unless it is given a width (the walkthrough found the width ignored)", async () => {
    await act(() => render(<WholeField label="a" value={1} onChange={() => {}} />, root));
    expect(root.querySelector("input")?.className.split(" ")).toContain("w-full");
    await act(() => render(<WholeField label="b" class="w-14" value={1} onChange={() => {}} />, root));
    const classes = root.querySelector("input")?.className.split(" ") ?? [];
    expect([classes.includes("w-14"), classes.includes("w-full")]).toEqual([true, false]);
  });
});

const CARDS = new Map(CARD_DATA.cards.map((c) => [c.id, c]));

describe("after reading a screenshot", () => {
  test("a field to check carries the mark, and the others do not", async () => {
    await act(() => render(<MemoryForm form={DMM_FORM} update={() => {}} capLevel={0} onCapLevel={() => {}} check={new Set(["params.dance"])} />, root));
    const ring = (label: string) => must(root.querySelector<HTMLInputElement>(`input[aria-label="${label}"]`), label).className.includes("ring-amber-400");
    expect([ring("ダンス"), ring("ボーカル")]).toEqual([true, false]);
  });

  test("a slot offers the tile's next-best cards, and taking one keeps the level", async () => {
    const seen: unknown[] = [];
    const alternatives = [["s_card-3-0042", "s_card-3-0001"], [], [], [], [], []];
    await act(() => render(<DeckForm deck={DMM_DECK} cards={CARDS} levelLimits={CARD_DATA.levelLimits} onDeck={(d) => seen.push(d[0])} refreshesLeft={1} onRefreshes={() => {}} check={new Set()} alternatives={alternatives} />, root));
    const name = must(CARDS.get("s_card-3-0042"), "the card").name;
    await act(() => must(root.querySelector<HTMLButtonElement>(`button[aria-label="${name}"]`), "the alternative").click());
    expect(seen).toEqual([{ cardId: "s_card-3-0042", level: 60 }]);
  });
});
