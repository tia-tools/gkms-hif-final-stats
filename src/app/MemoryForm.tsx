import { STATS } from "../engine/types.ts";
import { CAP_BY_LEVEL } from "./cap.ts";
import { PercentField, WholeField } from "./Fields.tsx";
import type { FormState } from "./form.ts";
import { STAT_STYLE } from "./stats.ts";

const AFFECTION = [28, 29, 30, 31, 32, 33, 34, 35, 36, 37];
const SELECT = "rounded border border-slate-300 bg-white px-1 py-1 tabular-nums";

interface Props {
  form: FormState;
  update: (patch: Partial<FormState>) => void;
  capLevel: number;
  onCapLevel: (level: number) => void;
}

/** Laid out as the memory's 基本情報 tab: スター性 and 親愛度, then each stat over its bonus. */
export function MemoryForm({ form, update, capLevel, onCapLevel }: Props) {
  return (
    <section class="grid grid-cols-3 gap-x-3 gap-y-2 rounded-lg bg-white p-3 shadow-sm">
      <label class="flex flex-col gap-1">
        <span class="text-sm text-orange-500">スター性</span>
        <WholeField label="スター性" value={form.star} onChange={(star) => update({ star })} />
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm text-rose-400">親愛度</span>
        <select aria-label="親愛度" class={SELECT} value={form.affection} onChange={(e) => update({ affection: Number(e.currentTarget.value) })}>
          {AFFECTION.map((lv) => (
            <option key={lv} value={lv}>
              {lv}
            </option>
          ))}
        </select>
      </label>
      <label class="flex flex-col gap-1">
        <span class="text-sm text-slate-500">上限</span>
        <select aria-label="H.I.Fボーナス 上限Lv" class={SELECT} value={capLevel} onChange={(e) => onCapLevel(Number(e.currentTarget.value))}>
          {CAP_BY_LEVEL.map((cap, lv) => (
            <option key={lv} value={lv}>
              Lv{lv} {cap}
            </option>
          ))}
        </select>
      </label>
      {STATS.map((s) => (
        <div key={s} class="flex flex-col gap-1">
          <span class={`text-sm font-semibold ${STAT_STYLE[s].text}`}>{STAT_STYLE[s].name}</span>
          <WholeField label={STAT_STYLE[s].name} value={form.params[s]} onChange={(v) => update({ params: { ...form.params, [s]: v } })} />
          <div class="flex items-center gap-1">
            <PercentField class="text-sm" label={`${STAT_STYLE[s].name}ボーナス`} value={form.bonusPermil[s]} onChange={(v) => update({ bonusPermil: { ...form.bonusPermil, [s]: v } })} />
            <span class="text-xs text-slate-500">%</span>
          </div>
        </div>
      ))}
    </section>
  );
}
