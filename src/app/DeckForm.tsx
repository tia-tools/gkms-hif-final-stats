import { useState } from "preact/hooks";
import type { Card, LevelLimits } from "../data/contract.ts";
import type { DeckSlot } from "../engine/types.ts";
import { CardPicker } from "./CardPicker.tsx";
import { WholeField, mark } from "./Fields.tsx";
import { thumbnailUrl } from "./images.ts";

interface Props {
  deck: readonly (DeckSlot | null)[];
  cards: ReadonlyMap<string, Card> | null;
  levelLimits: LevelLimits | null;
  onDeck: (deck: (DeckSlot | null)[]) => void;
  refreshesLeft: number;
  onRefreshes: (n: number) => void;
  /** The fields to check after reading a screenshot. */
  check: ReadonlySet<string>;
  /** Per slot, the next-best cards of the last 編成 screenshot. */
  alternatives: readonly (readonly string[])[] | null;
}

interface SlotProps {
  slot: DeckSlot | null;
  card: Card | undefined;
  cards: ReadonlyMap<string, Card> | null;
  alternatives: readonly string[];
  cardMark: boolean;
  levelMark: boolean;
  onPick: () => void;
  onCard: (cardId: string) => void;
  onLevel: (lv: number | null) => void;
  onRemove: () => void;
}

function Slot({ slot, card, cards, alternatives, cardMark, levelMark, onPick, onCard, onLevel, onRemove }: SlotProps) {
  return (
    <div class="flex flex-col gap-1">
    <div class={`relative overflow-hidden rounded border border-slate-200 bg-slate-50 ${mark(cardMark)}`}>
      <button type="button" aria-label={card?.name ?? "サポートカードを選ぶ"} class="flex aspect-[16/9] w-full items-center justify-center" onClick={onPick}>
        {card ? <img src={thumbnailUrl(card.assetId)} alt="" class="h-full w-full object-cover" /> : <span class="text-2xl text-slate-400">{slot ? "?" : "＋"}</span>}
      </button>
      {slot && (
        <>
          <div class="absolute bottom-1 left-1 flex items-center gap-1 rounded bg-white/90 px-1">
            <span class="text-xs">Lv</span>
            <WholeField class={`w-12 py-0 ${mark(levelMark)}`} label={`${card?.name ?? slot.cardId} Lv`} value={slot.level} onChange={onLevel} />
          </div>
          <button type="button" aria-label={`${card?.name ?? slot.cardId}を外す`} class="absolute right-1 top-1 rounded bg-white/90 px-1.5 text-xs" onClick={onRemove}>
            ×
          </button>
        </>
      )}
    </div>
      {slot && alternatives.length > 0 && (
        <div class="flex gap-1">
          {alternatives.map((id) => {
            const alt = cards?.get(id);
            return (
              <button key={id} type="button" aria-label={alt?.name ?? id} title={alt?.name ?? id} class="w-12 overflow-hidden rounded border border-slate-200" onClick={() => onCard(id)}>
                {alt && <img src={thumbnailUrl(alt.assetId)} alt="" class="aspect-[16/9] w-full object-cover" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}

/** Laid out as the memory's 編成 tab: six cards in two columns, the 相談 refreshes left below. */
export function DeckForm({ deck, cards, levelLimits, onDeck, refreshesLeft, onRefreshes, check, alternatives }: Props) {
  const [picking, setPicking] = useState<number | null>(null);
  const setSlot = (i: number, slot: DeckSlot | null) => onDeck(deck.map((s, j) => (j === i ? slot : s)));
  const pickable = cards === null ? [] : [...cards.values()];
  return (
    <section class="flex flex-col gap-2 rounded-lg bg-white p-3 shadow-sm">
      <div class="grid grid-cols-2 gap-2">
        {deck.map((slot, i) => (
          <Slot
            key={i}
            slot={slot}
            card={slot === null ? undefined : cards?.get(slot.cardId)}
            cards={cards}
            alternatives={(alternatives?.[i] ?? []).filter((id) => id !== slot?.cardId)}
            cardMark={check.has(`deck.${i}`)}
            levelMark={check.has(`level.${i}`)}
            onPick={() => cards !== null && setPicking(i)}
            onCard={(cardId) => slot && setSlot(i, { ...slot, cardId })}
            onLevel={(level) => slot && setSlot(i, { ...slot, level: level ?? 1 })}
            onRemove={() => setSlot(i, null)}
          />
        ))}
      </div>
      <label class="flex items-center justify-end gap-2 text-sm text-slate-600">
        相談リフレッシュ 残り
        <WholeField class={`w-14 ${mark(check.has("refreshes"))}`} label="相談リフレッシュ回数 残り" value={refreshesLeft} onChange={(n) => onRefreshes(n ?? 0)} />
      </label>
      {picking !== null && (
        <CardPicker
          cards={pickable}
          onClose={() => setPicking(null)}
          onPick={(card) => {
            setSlot(picking, { cardId: card.id, level: levelLimits?.[card.rarity][4] ?? 1 });
            setPicking(null);
          }}
        />
      )}
    </section>
  );
}
