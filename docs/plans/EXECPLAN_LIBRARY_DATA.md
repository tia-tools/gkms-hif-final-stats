# Read the card data and images from gkms-library

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. It is maintained in accordance with `docs/PLANS.md` at the repository root. Its board issue is `tia-tools/gkms-hif-final-stats#34`; the decision on where the data is fetched from is the job `#35`.

## Purpose / Big Picture

This page (`https://gkms-hif-final-stats.tia.run`) computes whether a 学園アイドルマスター H.I.F. memory can still reach S5. To do it, it needs every support card's effects, and it shows each card's art and each P-item's icon. Today all three come from the sibling app gakumas-supportcards: its Worker publishes a card file shaped for this page alone (`cards.v1.json`), and its R2 bucket `tia-assets` holds the images, which this app's own Worker serves under `/img/*` (`docs/adr/0001-card-data-and-art-are-shared-with-gakumas-supportcards-at-runtime.md`).

A new service, gkms-library (`tia-tools/gkms-library`, served at `https://gkms-library.tia.run`), now publishes the game's data and images for every app, twice a day with no person involved. After this plan, this page reads its support cards and its images from there, and nothing of this app reads `gakumas-supportcards.tia.run` or the bucket any more. gakumas-supportcards can then drop the file it kept for this page.

What a player sees: the same page, the same numbers for the six sample screenshots (the DMM pair still reads 6971, S5 short by 73), with two differences. The card `s_card-3-0114` gains an effect the old file had to leave out (its trigger is filtered on a ロジック card), so a deck holding it can be bounded higher. And the 「未計上」 entries (an ability this page cannot count, with a field for the player's own points) now come from the library's `unread` list, in which every entry is an effect missing from the card, so no entry stands for an effect already counted.

How to see it working: `bun run dev`, open `http://localhost:5173`, and watch the browser's network panel: the card data and the images come from `gkms-library.tia.run`. After the release, the same holds on the live page.

## Progress

- [x] (2026-11-27 13:15Z) Claimed #34 on branch `feat/gkms-library`; read the data seam, the Worker, the library's formats and its current release.
- [x] (2026-11-27 13:20Z) Filed job #35: fetch the data in the browser (A) or through this Worker (B).
- [x] (2026-11-27 13:25Z) Drafted this plan.
- [x] (2026-11-27 13:28Z) Milestone 1: `src/data/cards.ts` reads `support-cards` v1 through the library's own `parse` (format files copied, hashes pinned in `src/data/formats.test.ts`); `BestResult.uncounted` from `unread` drives 「未計上」; `hif_memory` counts as H.I.F.; `plan` family labelled; fixture and the reader's image snapshot refreshed from the library. `bun test` 245 pass, type check, lint and build clean.
- [x] (2026-11-27 14:34Z) Milestone 2, under A (job #35): `src/data/fetch.ts` `fetchCardData` fetches the pointer, checks it with `latest.v1.ts`, then fetches and checks the `support-cards` v1 release; `App.tsx` calls it. `infra/worker/data.ts`, `worker.ts` and their tests are gone; `wrangler.toml` deploys assets only (no `main`, no binding; `wrangler deploy --dry-run` prints `No bindings found.`); the dev server has no routes left. `src/data/fetch.test.ts` fails when the lookup names another format (seen red). 234 pass, type check, lint and build clean. In Chrome on the dev server: `latest.v1.json` then `support-cards/v1/20261127T1126Z-44f93c3c.json` from the library, 9/9 images, one 「未計上」 row with 暫定, nothing from supportcards.
- [x] (2026-11-27 13:29Z) Milestone 3: `src/app/images.ts` points at `https://gkms-library.tia.run/img/…` (pinned by `src/app/images.test.ts`); the dev server's `/img/*` route and its gakumas-supportcards checkout (`SUPPORTCARDS_DIR`) are gone, and its `/data/cards.json` serves the library fixture until Milestone 2. 246 pass, type check and lint clean. Seen in Chrome at 13:36Z on the dev server, with the DMM deck plus `s_card-3-0117` in the URL: all 9 images (6 card arts, 3 item icons) loaded from `gkms-library.tia.run`, no request named `supportcards`, and one 「未計上」 row for 「次はボクの番や！」 with the library's reason.
- [x] (2026-11-27 13:31Z) Milestone 4, part one: `infra/worker/img.ts` and its test removed; `worker.ts` answers only `/data/cards.json`; `wrangler.toml` runs the Worker first for that path alone and binds no bucket (`wrangler.test.ts` pins both). 237 pass, type check and lint clean.
- [x] (2026-11-27 14:35Z) Milestone 4, remaining: `docs/adr/0003-card-data-and-art-come-from-gkms-library-fetched-by-the-browser.md` written, ADR 0001 marked superseded (its text kept); `CLAUDE.md`, `README.md` and `infra/worker/README.md` describe the library and the assets-only deployment.
- [ ] Milestone 5: the release (a PR from `develop` into `main`, merged by the user) and the live check that nothing reads `gakumas-supportcards.tia.run`.

## Surprises & Discoveries

- Observation: the issue's step 3 asks to handle the library's origin "in the offline cache". This app has no offline cache: no service worker, no `caches` use anywhere in `src/` (the step was written for gkms-memomemo, which has one). There is nothing to change.
  Evidence: `grep -rn "serviceWorker\|caches\." src` finds nothing.
- Observation: the library's current release has one `unread` entry, `s_card-3-0117` 「次はボクの番や！」, a trigger counting トラブル cards (`trouble`, a filter piece the library does not know). The fixture `cards.v1.json` this app tests with has an empty `held` list.
  Evidence: `data/support-cards/v1/20261127T1126Z-44f93c3c.json`, fetched 2026-11-27 13:18Z: 218 cards, `unread` of length 1.
- Observation: the library already answers every data file and image with `access-control-allow-origin: *`, and releases and images with `cache-control: public, max-age=31536000, immutable`, so a browser on another origin may fetch and decode both.
  Evidence: `curl -sI` of the release above and of `img/w48/img_general_pitem_2-004.webp`, 2026-11-27 13:18Z.
- Observation: gkms-library's plan orders the moves one reader at a time, gkms-memomemo first (its decision L6). gkms-memomemo's issue `#109` was still open when this plan began. Nothing technical ties the two moves together: each app reads the library on its own, and gakumas-supportcards keeps publishing until both have moved. This plan goes ahead because the user asked for #34.

- Observation: the library's release has 218 cards against the old fixture's 210, so the reader's image snapshot (`src/reader/fixtures/w192/`, `w48/`, read only by the tests) lacked 8 card arts and 6 item icons. They were downloaded from the library, and every one of the 278 snapshot images was then compared with the library's copy: all byte-identical.
  Evidence: 2026-11-27 13:27Z, `checked 278, differing 0` (SHA-256 of each file against `curl https://gkms-library.tia.run/img/<path>`).
- Observation: the format checks `value`, `cap` and `eventBonusPermil` only as numbers, where the old checker required integers. The engine computes floored products in integers (the first plan's decision G18), so a fractional value would give a slightly wrong bound rather than a refusal. The library writes integers (every value in the release is one), and the format cannot be edited, so nothing is added.

## Decision Log

- Decision: L1 — check the data with the library's own format file, copied verbatim to `src/data/support-cards.v1.ts` (and the pointer's to `src/data/latest.v1.ts`), with their SHA-256 pinned in a test. Both replace the hand-written `src/data/contract.ts` and `src/data/load.ts`. Valibot 1 becomes a dependency, since the format files import it.
  Rationale: the issue asks for it, and the library's README says the same: a format file never changes, a change of shape is a new version beside the old one, so a verbatim copy plus a pinned hash is the whole contract. Keeping a hand-written checker would mean two definitions of one shape. One behaviour changes with it: the old checker dropped a field the contract did not name (the first plan's decision G23), while the format's objects are strict and refuse one. Since a published format never gains a field, a refused file can only be a broken one.
  Date/Author: 2026-11-27, agent, from the issue.
- Decision: L2 — each `unread` entry of a deck card is one 「未計上」 entry, with the library's `reason` as its text. 「暫定」 stays until every entry has a value, 0 included, as before (the first plan's decision G12). The rule of the first plan's decision G28 — every reason listed, the player entering 0 for one already counted — no longer applies: the library's format says an unread effect "is therefore left out of the card", so every entry is a real gap. A card with no reason gets no entry (the library's `reason` cannot be empty, so the old "one entry even with an empty list" case is gone).
  Rationale: the issue asks to decide 「未計上」 from `unread` alone. `held` mixed two causes (an effect left out, and a scoring gap of gakumas-supportcards' own); `unread` has only the first, which is exactly what needs manual points. The entry keys stay `cardId#index` (`uncountedKey` in `src/engine/total.ts`), so links already shared keep their values for a card whose reasons have not changed.
  Date/Author: 2026-11-27, agent.
- Decision: L3 — a trigger restricted to the scenario token `hif` or `hif_memory` fires here; any other token counts 0.
  Rationale: the library writes the game's own token after `for_` in the trigger id. gakumas-supportcards' parser mapped both `hif` and `hif_memory` to its scenario `hif` (`scripts/lib/parse-trigger.ts`, `SCENARIO_TOKENS`), and the library's comparison check uses the same map, so this keeps today's meaning. No card uses a scenario token today.
  Date/Author: 2026-11-27, agent.
- Decision: L4 — the filter family `plan` (a card's plan: センス, ロジック, アノマリー) is accepted. The 本戦 profile has no count for it, so an effect filtered on it fires as often as its occasion, the same fallback every filter family without a count gets (`src/engine/count.ts`, decision G25), and its count is editable in the panel like the others.
  Rationale: the bound is a best case, and the panel already lets the player lower any count. A label for the panel's row is added beside the other families' labels in `src/app/labels.ts`.
  Date/Author: 2026-11-27, agent.

- Decision: L5 — the browser fetches the card data straight from gkms-library (job #35, answer A). The Worker's data route goes, and with the image route already gone the deployment is a Worker with static assets only, under the same name, so a deploy updates the existing Worker with the token it already has.
  Rationale: the library answers with `access-control-allow-origin: *`, its releases never change under their names, and its pointer may be kept five minutes, so a new card appears within minutes instead of an hour, and no Worker request is spent per page load. The alternative (B, the Worker fetching pointer and release and caching an hour) kept a Worker and its tests for nothing the browser cannot do. Chosen by the user, 2026-11-27.
  Date/Author: 2026-11-27, user (job #35).

## Outcomes & Retrospective

Nothing yet.

## Context and Orientation

The repository is a Preact page built with Vite, tested with `bun test`, and deployed as a Cloudflare Worker with static assets. A Worker here is a small script Cloudflare runs at its edge for chosen paths; everything else is served from the built files in `dist/`. The parts this plan touches:

`src/data/contract.ts` holds the TypeScript types of the card file gakumas-supportcards publishes (`CardDataFile`: `formatVersion`, `levelLimits`, `cards`, `held`), and `src/data/load.ts` holds `parseCardData`, a hand-written checker that refuses a file with any bad value. Every consumer imports the types from `contract.ts`: the engine (`src/engine/abilities.ts`, `count.ts`, `total.ts`), the page (`src/app/App.tsx`, `compute.ts`, `CountPanel.tsx`, `screenshots.ts`, and the forms), and the test support (`src/test-support/dmm.ts`, which parses the fixture `src/data/fixtures/cards.v1.json`, a real copy of the sibling's file).

The library's file differs from the old one in three ways. It has `unread` (one entry per card and reason, `{ cardId, cardName, reason }`) instead of `held` (one entry per card, `{ id, name, reasons[] }`). Its filter families include `plan`. Its scenario restriction is the game's token, not a site's id. Otherwise the cards are the same: the library's comparison check found every support card equal to gakumas-supportcards' `cards.v2.json`, and `cards.v1.json` is `cards.v2.json` with the `plan` effects removed.

The library publishes a pointer, `https://gkms-library.tia.run/data/latest.v1.json`, which changes under its name and may be cached for five minutes, and releases under names that never change (`data/support-cards/v1/<release>.json`). A reader fetches the pointer, finds the entry with `format: "support-cards"` and `formatVersion: 1`, and fetches its `path`. The format files at `https://gkms-library.tia.run/formats/` (`support-cards.v1.ts`, `latest.v1.ts`) are each the types and a `parse(data: unknown)` that returns the typed value or throws `Error("support-cards v1: <path>: <message>")`.

`infra/worker/worker.ts` routes two paths: `/data/cards.json` to `serveCardData` (`infra/worker/data.ts`, which fetches the sibling's file and caches it an hour) and `/img/*` to `serveImage` (`infra/worker/img.ts`, which reads the bucket `tia-assets`). `infra/worker/wrangler.toml` sends only those two paths to the Worker (`run_worker_first`) and binds the bucket as `IMAGES`. `vite.config.ts` answers the same two routes in the dev server from a gakumas-supportcards checkout beside this one. `src/app/images.ts` builds the image URLs (`/img/w192/img_general_<assetId>_full.webp`, `/img/w48/<assetId>.webp`); the library serves the same file names under `https://gkms-library.tia.run/img/`.

`src/app/screenshots.ts` fetches every thumbnail and item icon to match them against a screenshot, with `fetch`, then decodes the blob; a cross-origin fetch works because the library sends `access-control-allow-origin: *`.

## Plan of Work

Milestone 1 changes what is read, behind the same seam. Add Valibot 1 (`bun add valibot@^1`). Copy the two format files verbatim from `https://gkms-library.tia.run/formats/` into `src/data/`, and add `src/data/formats.test.ts` pinning each file's SHA-256 (the values gkms-library pins in its own `formats/pinned.test.ts`). Replace `src/data/contract.ts` and `src/data/load.ts` with one module, `src/data/cards.ts`, which re-exports the types the app uses from `support-cards.v1.ts` (`Card`, `Breakpoint`, `ClassifiedEffect`, `ParsedTrigger`, `FilterRef`, `ConditionRef`, `ItemGrant`, `LevelLimits`, `Unread`, and the file as `CardDataFile`) and exports `parseCardData(json: unknown): CardDataFile`, which calls the format's `parse`. Point every import at it. Replace the fixture with the library's current release, saved as `src/data/fixtures/support-cards.v1.json`. In `src/engine/total.ts`, `bestTotal` collects the deck's `unread` entries grouped per card, keyed `uncountedKey(cardId, i)`, and `BestResult.held` becomes `uncounted: { cardId, name, reasons }[]` (renamed: "held" also names the P-items a memory holds); `src/app/CountPanel.tsx` reads it. In `src/engine/count.ts`, the scenario check accepts `hif` and `hif_memory` (L3). In `src/app/labels.ts`, label the `plan` family's members (L4). Tests: the old `load.test.ts` cases that still apply move to `cards.test.ts` (a bad value refused with its path, an unknown field refused, since the format is strict); `total.test.ts` gets a deck holding `s_card-3-0117` and shows one 「未計上」 entry and 「暫定」; `count.test.ts` gets `hif_memory` firing and `nia_master` not.

Milestone 2 depends on job #35. Under A, `src/data/fetch.ts` exports `fetchCardData(fetcher)`: fetch the pointer, check it with `latest.v1.ts`'s `parse`, find the `support-cards` v1 entry, fetch its path, `parseCardData` it; `App.tsx` calls it with the browser's `fetch`; the Worker's `/data/cards.json` route, `infra/worker/data.ts` and its test go, and `/data/cards.json` leaves `run_worker_first`. Under B, `infra/worker/data.ts` fetches the pointer and then the release, still answering `/data/cards.json` with an hour's cache, and the page is unchanged.

Milestone 3 points `src/app/images.ts` at `https://gkms-library.tia.run/img/…` and drops the dev server's `/img/*` route in `vite.config.ts` (and, under A, its data route, so the dev server reads the live library too).

Milestone 4 removes `serveImage`, `infra/worker/img.ts` and its test, the `IMAGES` binding and `/img/*` from `wrangler.toml`. Under A the Worker has no route left, so `main` and `worker.ts` go and the deployment is assets only; under B it keeps the data route. It writes `docs/adr/0003-…` superseding ADR 0001 (status line of 0001 updated, its text kept), and updates `CLAUDE.md`, `README.md` and `infra/worker/README.md`.

Milestone 5 is the release: a PR from `develop` into `main`, which the user merges; `deploy.yml` deploys. Then the live checks in § Validation.

## Concrete Steps

All commands run from the repository root. Install and check:

    BUN_INSTALL_CACHE_DIR="$TMPDIR/bun-cache" bun add valibot@^1   # under the sandbox; plain `bun add` otherwise
    bun test && bun run type-check && bun run lint && bun run build

Copy the format files and refresh the fixture (idempotent; rerun to refresh):

    curl -sf https://gkms-library.tia.run/formats/support-cards.v1.ts -o src/data/support-cards.v1.ts
    curl -sf https://gkms-library.tia.run/formats/latest.v1.ts -o src/data/latest.v1.ts
    P=$(curl -sf https://gkms-library.tia.run/data/latest.v1.json | python3 -I -c 'import json,sys; print(next(f["path"] for f in json.load(sys.stdin)["files"] if f["format"]=="support-cards" and f["formatVersion"]==1))')
    curl -sf "https://gkms-library.tia.run/$P" -o src/data/fixtures/support-cards.v1.json

## Validation and Acceptance

`bun test` passes, with the DMM sample's bound unchanged (`src/app/compute.test.ts` and the engine's DMM tests: 6971). `src/data/formats.test.ts` fails after any byte of a copied format file is changed. The new `total.test.ts` case fails if `unread` is ignored. In the dev server, the network panel shows the card data (under A) and every image coming from `gkms-library.tia.run`, a deck with 「次はボクの番や！」 shows one 「未計上」 row, and reading the DMM screenshots still fills the deck. After the release, `curl -sI https://gkms-hif-final-stats.tia.run/img/w48/img_general_pitem_2-004.webp` no longer reaches a Worker route, and the live page's network panel names no `gakumas-supportcards.tia.run` request.

## Idempotence and Recovery

Every step is a file edit or a download that can be rerun. The release is reverted, if needed, by a PR from a revert branch into `develop` and then into `main`, like any change; until gakumas-supportcards drops `cards.v1.json` and the bucket's old paths, the previous Worker still works if redeployed.

## Artifacts and Notes

The library's pointer entry on 2026-11-27:

    {'format': 'support-cards', 'formatVersion': 1, 'release': '20261127T1126Z-44f93c3c', 'path': 'data/support-cards/v1/20261127T1126Z-44f93c3c.json', 'sha256': '44f93c3c…', 'entries': 218}

## Interfaces and Dependencies

Valibot `^1` (the format files import `* as v from "valibot"`). In `src/data/cards.ts`:

    export type CardDataFile = SupportCardsFile;
    export function parseCardData(json: unknown): CardDataFile;   // throws Error naming the first bad value's path

In `src/engine/total.ts`, `BestResult` carries `uncounted: { cardId: string; name: string; reasons: string[] }[]` in place of `held: HeldCard[]`.
