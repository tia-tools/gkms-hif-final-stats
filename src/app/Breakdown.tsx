import type { AbilityLine, DrinkLine } from "../engine/abilities.ts";
import type { BestResult } from "../engine/total.ts";
import { STAT_STYLE } from "./stats.ts";
import { triggerLabel } from "./labels.ts";

function Line({ line }: { line: AbilityLine }) {
  const stat = STAT_STYLE[line.effect.stat];
  return (
    <li class={`flex gap-2 ${line.fires === 0 ? "text-slate-400" : ""}`}>
      <span class="flex-1">
        {line.effect.itemName && <span class="mr-1">「{line.effect.itemName}」</span>}
        {line.effect.trigger ? triggerLabel(line.effect.trigger) : ""}
      </span>
      <span class="tabular-nums">
        <span class={stat.text}>{stat.short}+{line.effect.value}</span> ×{line.fires}
      </span>
      <span class="w-12 text-right font-semibold tabular-nums">{line.points}</span>
    </li>
  );
}

function Drinks({ line }: { line: DrinkLine }) {
  return (
    <li class={`flex gap-2 ${line.fires === 0 ? "text-slate-400" : ""}`}>
      <span class="flex-1">
        「{line.itemName}」{triggerLabel(line.trigger)}
      </span>
      <span class="tabular-nums">
        Pドリンク+{line.perFire} ×{line.fires}
      </span>
      <span class="w-12 text-right tabular-nums text-slate-500">{line.drinks}</span>
    </li>
  );
}

/** The best placement, then each card's abilities with how often they fire, and the P-drinks its items grant. */
export function Breakdown({ result, names }: { result: BestResult; names: ReadonlyMap<string, string> }) {
  const { lessons, classes } = result.placement;
  const s = (stat: keyof typeof STAT_STYLE) => STAT_STYLE[stat].short;
  const cards = [...new Set([...result.lines, ...result.drinks].map((l) => l.cardId))];
  return (
    <section class="flex flex-col gap-2 rounded-lg bg-white p-3 text-sm shadow-sm">
      <p class="text-slate-600">
        {lessons.map((l) => `${s(l.main)}(${s(l.sub)})`).join(" ")} ・ 授業 {classes.map(s).join(" ")} ・ {result.day3 === "present" ? "差し入れ" : "おでかけ"}
      </p>
      {cards.map((id) => (
        <div key={id}>
          <h3 class="font-semibold">{names.get(id) ?? id}</h3>
          <ul class="flex flex-col gap-0.5 pl-2">
            {result.lines
              .filter((l) => l.cardId === id)
              .map((l) => (
                <Line key={l.key} line={l} />
              ))}
            {result.drinks
              .filter((d) => d.cardId === id)
              .map((d) => (
                <Drinks key={`${d.key} drinks`} line={d} />
              ))}
          </ul>
        </div>
      ))}
    </section>
  );
}
