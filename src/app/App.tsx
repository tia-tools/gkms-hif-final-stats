import { useEffect, useMemo, useState } from "preact/hooks";
import type { CardDataFile } from "../data/contract.ts";
import { parseCardData } from "../data/load.ts";
import { Breakdown } from "./Breakdown.tsx";
import { CAP_STORAGE_KEY, capLevelOf, capOf } from "./cap.ts";
import { compute } from "./compute.ts";
import { CountPanel } from "./CountPanel.tsx";
import { DeckForm } from "./DeckForm.tsx";
import { ItemsForm } from "./ItemsForm.tsx";
import { itemChoices } from "./items.ts";
import { MemoryForm } from "./MemoryForm.tsx";
import { Result } from "./Result.tsx";
import { ScreenshotInput } from "./ScreenshotInput.tsx";
import { useScreenshots } from "./useScreenshots.ts";
import { useUrlForm } from "./useUrlForm.ts";

type CardData = { status: "loading" } | { status: "ready"; data: CardDataFile } | { status: "failed" };

/** The card data at this origin (decision G14); a failure leaves the form usable without card pickers. */
function useCardData(): CardData {
  const [state, setState] = useState<CardData>({ status: "loading" });
  useEffect(() => {
    fetch("/data/cards.json")
      .then(async (res) => (res.ok ? setState({ status: "ready", data: parseCardData(await res.json()) }) : setState({ status: "failed" })))
      .catch(() => setState({ status: "failed" }));
  }, []);
  return state;
}

/** 「H.I.Fボーナス 上限Lv」, remembered in this browser (decision G8). */
function useCapLevel(): [number, (level: number) => void] {
  const [level, setLevel] = useState(() => capLevelOf(window.localStorage.getItem(CAP_STORAGE_KEY)));
  const set = (next: number) => {
    window.localStorage.setItem(CAP_STORAGE_KEY, String(next));
    setLevel(next);
  };
  return [level, set];
}

export function App() {
  const [form, update] = useUrlForm();
  const cardData = useCardData();
  const [capLevel, setCapLevel] = useCapLevel();
  const data = cardData.status === "ready" ? cardData.data : null;
  const cards = useMemo(() => (data === null ? null : new Map(data.cards.map((c) => [c.id, c]))), [data]);
  const names = useMemo(() => new Map([...(cards?.values() ?? [])].map((c) => [c.id, c.name])), [cards]);
  const { result, problem } = useMemo(() => compute(form, data, capOf(capLevel)), [form, data, capLevel]);
  const choices = useMemo(() => itemChoices(form.deck.map((s) => (s === null ? undefined : cards?.get(s.cardId)))), [form.deck, cards]);
  const shots = useScreenshots(form, update, data, cards);
  const edit = shots.edit;
  return (
    <div
      class="mx-auto flex max-w-5xl flex-col gap-3 p-3 sm:p-6"
      onDragOver={(e) => e.preventDefault()}
      onDrop={(e) => {
        e.preventDefault();
        shots.read([...(e.dataTransfer?.files ?? [])]);
      }}
    >
      <h1 class="text-lg font-bold">H.I.F. 本戦ランク判定</h1>
      {cardData.status === "failed" && <p class="text-sm text-rose-600">カードデータを読み込めませんでした</p>}
      {problem !== null && "unknownCards" in problem && <p class="text-sm text-rose-600">不明なカード {problem.unknownCards.join(" ")}</p>}
      {problem !== null && "error" in problem && <p class="text-sm text-rose-600">計算できません: {problem.error}</p>}
      <div class="grid gap-3 md:grid-cols-2">
        <div class="flex flex-col gap-3">
          {data !== null && <ScreenshotInput status={shots.status} onFiles={shots.read} />}
          <MemoryForm form={form} update={edit} capLevel={capLevel} onCapLevel={setCapLevel} check={shots.check} />
          <DeckForm deck={form.deck} cards={cards} levelLimits={data?.levelLimits ?? null} onDeck={(deck) => edit({ deck })} refreshesLeft={form.refreshesLeft} onRefreshes={(refreshesLeft) => edit({ refreshesLeft })} check={shots.check} alternatives={shots.alternatives} />
          <ItemsForm choices={choices} items={form.items} onItems={(items) => edit({ items })} medalMoja={form.medalMoja} onMedalMoja={(medalMoja) => edit({ medalMoja })} check={shots.check} />
        </div>
        <div class="order-first flex flex-col gap-3 md:sticky md:top-3 md:order-none md:self-start">
          <Result result={result} />
          {result !== null && <Breakdown result={result} names={names} />}
          {result !== null && <CountPanel result={result} panel={form.panel} names={names} onPanel={(panel) => update({ panel })} />}
        </div>
      </div>
    </div>
  );
}
