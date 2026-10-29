import type { Day3 } from "../engine/honsen-profile.ts";
import { type BestResult, type PanelState, uncountedKey } from "../engine/total.ts";
import { STATS, type Stat } from "../engine/types.ts";
import { WholeField } from "./Fields.tsx";
import { panelRows, withCount } from "./panel.ts";
import { STAT_STYLE } from "./stats.ts";

interface Props {
  result: BestResult;
  panel: PanelState;
  names: ReadonlyMap<string, string>;
  onPanel: (panel: PanelState) => void;
}

const DAY3: readonly [Day3 | undefined, string][] = [
  [undefined, "3日目 自動"],
  ["present", "差し入れ"],
  ["activity", "おでかけ"],
];

function Uncounted({ result, panel, onPanel }: Omit<Props, "names">) {
  const entries = result.held.flatMap((h) => (h.reasons.length > 0 ? h.reasons : [""]).map((reason, i) => ({ key: uncountedKey(h.id, i), name: h.name, reason })));
  const set = (key: string, value: { stat: Stat; points: number } | null) => {
    const next = { ...panel.uncounted };
    if (value === null) delete next[key];
    else next[key] = value;
    onPanel({ ...panel, uncounted: next });
  };
  return entries.map(({ key, name, reason }) => {
    const entry = panel.uncounted?.[key];
    return (
      <div key={key} class="flex items-center gap-2 text-amber-700">
        <span class="flex-1">
          未計上 {name} {reason}
        </span>
        <select aria-label="未計上の能力" class="rounded border border-slate-300 bg-white" value={entry?.stat ?? "vocal"} onChange={(e) => set(key, { stat: STATS.find((s) => s === e.currentTarget.value) ?? "vocal", points: entry?.points ?? 0 })}>
          {STATS.map((s) => (
            <option key={s} value={s}>
              {STAT_STYLE[s].short}
            </option>
          ))}
        </select>
        <WholeField class="w-16" label={`未計上 ${name}`} value={entry?.points ?? null} onChange={(points) => set(key, points === null ? null : { stat: entry?.stat ?? "vocal", points })} />
      </div>
    );
  });
}

/** Every count the bound used, as it stands; a changed one can be put back (decision G25). */
export function CountPanel({ result, panel, names, onPanel }: Props) {
  const rows = panelRows(result, panel, names);
  return (
    <details class="rounded-lg bg-white p-3 text-sm shadow-sm">
      <summary class="cursor-pointer font-semibold">カウント</summary>
      <div class="mt-2 flex flex-col gap-1">
        <select aria-label="3日目" class="self-start rounded border border-slate-300 bg-white" value={panel.day3 ?? ""} onChange={(e) => {
          const day3 = DAY3.find(([d]) => (d ?? "") === e.currentTarget.value)?.[0];
          const { day3: _, ...rest } = panel;
          onPanel(day3 === undefined ? rest : { ...rest, day3 });
        }}>
          {DAY3.map(([d, label]) => (
            <option key={label} value={d ?? ""}>
              {label}
            </option>
          ))}
        </select>
        {rows.map((row) => (
          <div key={`${row.kind} ${row.key}`} class={`flex items-center gap-2 ${row.depth === 1 ? "pl-4 text-slate-600" : "pt-1"}`}>
            <span class="flex-1">{row.label}</span>
            {row.changed && (
              <button type="button" aria-label={`${row.label}を戻す`} class="text-slate-400" onClick={() => onPanel(withCount(panel, row.kind, row.key, null))}>
                ↺
              </button>
            )}
            <WholeField class={`w-16 ${row.changed ? "border-slate-700" : ""}`} label={row.label} value={row.value} onChange={(v) => onPanel(withCount(panel, row.kind, row.key, v))} />
          </div>
        ))}
        <Uncounted result={result} panel={panel} onPanel={onPanel} />
      </div>
    </details>
  );
}
