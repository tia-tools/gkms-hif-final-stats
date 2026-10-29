import { useEffect, useState } from "preact/hooks";
import { percentText, permilOf, wholeOf } from "./fields.ts";

const INPUT = "w-full min-w-0 rounded border border-slate-300 bg-white px-2 py-1 text-right tabular-nums focus:border-slate-500 focus:outline-none";

interface FieldProps {
  value: number | null;
  onChange: (value: number | null) => void;
  label: string;
  class?: string;
}

export function WholeField({ value, onChange, label, class: extra = "" }: FieldProps) {
  return <input type="text" inputMode="numeric" aria-label={label} class={`${INPUT} ${extra}`} value={value ?? ""} onInput={(e) => onChange(wholeOf(e.currentTarget.value))} />;
}

/** A percentage with one decimal, held as tenths; the text stays as typed until it reads as a number. */
export function PercentField({ value, onChange, label, class: extra = "" }: FieldProps) {
  const [text, setText] = useState(percentText(value));
  useEffect(() => {
    if (permilOf(text) !== value) setText(percentText(value));
  }, [value]);
  return (
    <input
      type="text"
      inputMode="decimal"
      aria-label={label}
      class={`${INPUT} ${extra}`}
      value={text}
      onInput={(e) => {
        setText(e.currentTarget.value);
        onChange(permilOf(e.currentTarget.value));
      }}
    />
  );
}

export function Chip({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  const look = on ? "border-slate-700 bg-slate-700 text-white" : "border-slate-300 bg-white text-slate-600";
  return (
    <button type="button" aria-pressed={on} class={`rounded-full border px-3 py-0.5 text-sm ${look}`} onClick={onClick}>
      {label}
    </button>
  );
}
