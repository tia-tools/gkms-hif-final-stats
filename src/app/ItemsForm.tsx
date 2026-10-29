import { WholeField, mark } from "./Fields.tsx";
import { itemIconUrl } from "./images.ts";
import type { ItemChoice } from "./items.ts";

interface Props {
  choices: readonly ItemChoice[];
  items: Readonly<Record<string, number | null>>;
  onItems: (items: Record<string, number | null>) => void;
  medalMoja: boolean;
  onMedalMoja: (on: boolean) => void;
  /** The fields to check after reading a screenshot. */
  check: ReadonlySet<string>;
}

/** Laid out as the 「Pアイテム」 row: an icon per item, tapped when the memory holds it, with its fires left under it. */
export function ItemsForm({ choices, items, onItems, medalMoja, onMedalMoja, check }: Props) {
  const toggle = (id: string) => {
    const next = { ...items };
    if (id in next) delete next[id];
    else next[id] = null;
    onItems(next);
  };
  return (
    <section class="flex flex-wrap items-start gap-2 rounded-lg bg-white p-3 shadow-sm">
      {choices.map((choice) => {
        const held = choice.itemId in items;
        return (
          <div key={choice.itemId} class="flex w-14 flex-col items-center gap-1">
            <button type="button" aria-pressed={held} aria-label={choice.name} title={choice.name} class={`flex h-12 w-12 items-center justify-center rounded border ${held ? "border-slate-500 bg-white" : "border-slate-200 bg-slate-50 opacity-40"} ${mark(check.has(`items.${choice.itemId}`))}`} onClick={() => toggle(choice.itemId)}>
              {choice.assetId ? <img src={itemIconUrl(choice.assetId)} alt="" class="h-11 w-11" /> : <span class="text-[10px] leading-tight">H.I.F ワッペン</span>}
            </button>
            {held && choice.cap !== undefined && <WholeField class="py-0 text-sm" label={`${choice.name} 残り`} value={items[choice.itemId] ?? null} onChange={(n) => onItems({ ...items, [choice.itemId]: n })} />}
          </div>
        );
      })}
      <button type="button" aria-pressed={medalMoja} class={`ml-auto self-center rounded-full border px-3 py-0.5 text-sm ${medalMoja ? "border-slate-700 bg-slate-700 text-white" : "border-slate-300 text-slate-500"} ${mark(check.has("medalMoja"))}`} onClick={() => onMedalMoja(!medalMoja)}>
        メダルもじゃ
      </button>
    </section>
  );
}
