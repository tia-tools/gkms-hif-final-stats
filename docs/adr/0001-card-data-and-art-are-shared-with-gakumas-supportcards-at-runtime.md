---
status: accepted
---

# Card data and art are shared with gakumas-supportcards at runtime, not copied

This tool needs every support card's abilities (trigger, value per level, per-run cap) and its art, both of which the sibling project gakumas-supportcards (`tia-tools/gakumas-supportcards`) already generates twice a day from the game data and stores in the Cloudflare R2 bucket `tia-assets`. We read them live: the sibling's build publishes its card data as a versioned JSON file, this app fetches that file, and this app's own Worker binds `tia-assets` and only ever reads from it (`w192/` card thumbnails, `w48/` item icons), so images are same-origin and their pixels readable in a canvas without CORS. The JSON format is therefore a contract between the two repositories, and the 本戦 calculation stays this repository's own code. Rejected: a vendored snapshot of `cards.generated.ts` and the thumbnails with a sync script (simplest, but new support cards appear in 選抜 decks the day they release and a stale copy cannot recognise them), and a second generator and image pipeline here (independent, but duplicates the sibling's pipeline and its gates).

Source: user decision G5, grill-me session 2026-10-28 (`docs/plans/EXECPLAN_HIF_FINAL_STATS.md` § Decision Log). Not implemented yet: the sibling does not emit the JSON today; that change is Milestone 2 of the same plan.

Update (2026-10-29): the data part is implemented. gakumas-supportcards' build writes `dist/data/cards.v1.json` (its pull request #57, merge d08f3de), and its own `docs/adr/0010` makes any change to the file's shape bump the format version and the file name. This repository copies the types into `src/data/contract.ts` and reads the file with `src/data/load.ts`. The file is served at `https://gakumas-supportcards.tia.run/data/cards.v1.json` once the sibling's `develop` is released into `main`. Still to come: this app's Worker fetching that file and the `tia-assets` art, in Milestone 4 of the plan.
