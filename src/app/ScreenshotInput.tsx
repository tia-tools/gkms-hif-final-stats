interface Props {
  status: "idle" | "reading" | "unread";
  onFiles: (files: File[]) => void;
}

/** The two screenshots, chosen or dropped anywhere on the page; they only fill the form (G6). */
export function ScreenshotInput({ status, onFiles }: Props) {
  return (
    <label class="flex cursor-pointer items-center justify-center gap-2 rounded-lg border-2 border-dashed border-slate-300 bg-white p-3 text-sm text-slate-500">
      <input
        type="file"
        accept="image/*"
        multiple
        class="sr-only"
        aria-label="スクリーンショット"
        onChange={(e) => {
          onFiles([...(e.currentTarget.files ?? [])]);
          e.currentTarget.value = "";
        }}
      />
      {status === "reading" ? "読み取り中…" : "基本情報・編成のスクリーンショット"}
      {status === "unread" && <span class="text-rose-600">読み取れない画像があります</span>}
    </label>
  );
}
