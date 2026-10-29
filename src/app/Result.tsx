import type { BestResult } from "../engine/total.ts";
import { STATS } from "../engine/types.ts";
import { STAT_STYLE, signed } from "./stats.ts";

/** The best total, and every rank from S5 down with what it needs and the margin; the best reachable rank stands out. */
export function Result({ result }: { result: BestResult | null }) {
  if (result === null) return <section class="rounded-lg bg-white p-3 text-center text-3xl text-slate-300 shadow-sm">—</section>;
  const best = result.ranks.find((r) => r.margin >= 0);
  return (
    <section class="flex flex-col gap-2 rounded-lg bg-white p-3 shadow-sm">
      <div class="flex flex-wrap items-baseline gap-x-3">
        <span class="text-3xl font-bold tabular-nums">{result.total}</span>
        {STATS.map((s) => (
          <span key={s} class={`tabular-nums ${STAT_STYLE[s].text}`}>
            {STAT_STYLE[s].short} {result.params[s]}
          </span>
        ))}
        <span class="tabular-nums text-orange-500">スター性 {result.finalStar}</span>
      </div>
      <table class="w-full text-sm tabular-nums">
        <tbody>
          {result.ranks.map((r) => (
            <tr key={r.rank} class={r === best ? "bg-emerald-50 font-semibold" : ""}>
              <td class="py-0.5 pl-1">{r.rank}</td>
              <td class="text-right text-slate-500">{r.required}</td>
              <td class={`pr-1 text-right ${r.margin >= 0 ? "text-emerald-700" : "text-rose-600"}`}>
                {signed(r.margin)}
                {r.provisional && <span class="ml-1 text-xs text-amber-600">暫定</span>}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}
