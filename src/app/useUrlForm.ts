/** The form held in the URL query: read on load and on back/forward, rewritten (replaceState) on every change. */

import { useCallback, useEffect, useState } from "preact/hooks";
import { type FormState, readForm, writeForm } from "./form.ts";

function current(): FormState {
  return readForm(new URLSearchParams(window.location.search));
}

export function useUrlForm(): [FormState, (patch: Partial<FormState>) => void] {
  const [form, setForm] = useState<FormState>(current);
  useEffect(() => {
    const onPop = (): void => setForm(current());
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, []);
  useEffect(() => {
    const query = writeForm(form).toString();
    const search = query ? `?${query}` : "";
    if (window.location.search !== search) window.history.replaceState(null, "", `${window.location.pathname}${search}`);
  }, [form]);
  const update = useCallback((patch: Partial<FormState>) => setForm((prev) => ({ ...prev, ...patch })), []);
  return [form, update];
}
