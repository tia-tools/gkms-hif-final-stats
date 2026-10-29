import { useEffect, useMemo, useRef, useState } from "preact/hooks";
import type { Card, CardType, Rarity } from "../data/contract.ts";
import { Chip } from "./Fields.tsx";
import { thumbnailUrl } from "./images.ts";
import { type PickerFilter, pickable } from "./picker.ts";

const TYPES: readonly [CardType, string][] = [
  ["vocal", "Vo"],
  ["dance", "Da"],
  ["visual", "Vi"],
  ["assist", "アシスト"],
];
const RARITIES: readonly [Rarity, string][] = [
  ["ssr", "SSR"],
  ["sr", "SR"],
  ["r", "R"],
];

interface Props {
  cards: readonly Card[];
  onPick: (card: Card) => void;
  onClose: () => void;
}

export function CardPicker({ cards, onPick, onClose }: Props) {
  const [filter, setFilter] = useState<PickerFilter>({ query: "", type: null, rarity: null });
  const shown = useMemo(() => pickable(cards, filter), [cards, filter]);
  // The picker opens after the page has loaded, where `autofocus` does nothing: focus the search by hand.
  const search = useRef<HTMLInputElement>(null);
  useEffect(() => search.current?.focus(), []);
  useEffect(() => {
    const onKey = (e: KeyboardEvent): void => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  return (
    <div class="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div role="dialog" aria-label="サポートカード" class="flex max-h-[85vh] w-full max-w-3xl flex-col gap-2 rounded-t-lg bg-white p-3 sm:rounded-lg" onClick={(e) => e.stopPropagation()}>
        <div class="flex flex-wrap items-center gap-2">
          <input ref={search} type="search" aria-label="カード名" placeholder="カード名" class="min-w-0 flex-1 rounded border border-slate-300 px-2 py-1" value={filter.query} onInput={(e) => setFilter({ ...filter, query: e.currentTarget.value })} />
          {TYPES.map(([type, label]) => (
            <Chip key={type} label={label} on={filter.type === type} onClick={() => setFilter({ ...filter, type: filter.type === type ? null : type })} />
          ))}
          {RARITIES.map(([rarity, label]) => (
            <Chip key={rarity} label={label} on={filter.rarity === rarity} onClick={() => setFilter({ ...filter, rarity: filter.rarity === rarity ? null : rarity })} />
          ))}
        </div>
        <div class="grid grid-cols-3 gap-2 overflow-y-auto sm:grid-cols-4">
          {shown.map((card) => (
            <button key={card.id} type="button" class="flex flex-col gap-0.5 text-left" onClick={() => onPick(card)}>
              <img src={thumbnailUrl(card.assetId)} alt="" loading="lazy" class="aspect-[16/9] w-full rounded bg-slate-200 object-cover" />
              <span class="truncate text-xs">{card.name}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
