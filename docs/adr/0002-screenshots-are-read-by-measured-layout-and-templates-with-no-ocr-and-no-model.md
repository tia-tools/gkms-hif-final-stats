---
status: accepted
---

# Screenshots are read by measured layout and templates, with no OCR and no model

The reader (`src/reader/`) finds one anchor per screenshot (the 「カスタム」 label on 基本情報, the 「SP」 badge on 編成) and measures every field from it in units of width / 720. It reads digits, cards, P-items and the カスタム item by comparing pixels with templates: glyphs cut from the committed samples, the sibling's thumbnails and icons, and layers derived from the game's art. It refuses an aspect ratio outside 1.75–2.25 rather than guess, and it runs in the page. Rejected: OCR (Tesseract.js) with model downloads, the way gakumas-tools reads its contest-memory screen; no model covers support-card art. The cost: a new layout, font or device class needs its own samples and templates, so tablets stay refused until samples exist. A read only pre-fills the form, which stays what is computed, so a misread is visible and fixable.

Source: decisions G6, G7, G35, G37 and G38 of `docs/plans/EXECPLAN_HIF_FINAL_STATS.md` (agent design, built and accepted in Milestone 5). Confirmed by all six committed sample pairs read right, both in `bun test` and on the live page on 2026-10-29, with only fields the screenshot hides ringed.
