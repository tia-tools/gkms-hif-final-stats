# CLAUDE.md

This file provides guidance to a coding agent when working with code in this repository.

## Central Configuration

This template carries only the project-scoped scaffold: this CLAUDE.md skeleton, `docs/PLANS.md` (ExecPlan methodology), and `docs/adr/README.md` (ADR convention). Cross-project rules and the generic workflow skills (`grill-me`, `close-out`, `codebase-design`, `adopt-from-sibling`, `harvest-session`, `backlog`) live in the central `Taka499/claude` repository, deployed user-level at `~/.claude` — do not copy them into projects.

`docs/PLANS.md` is the one document that exists in both places. The canonical copy is `docs/PLANS.md` in `Taka499/claude`; the copy here is downstream and is checked in so a plan stays followable from a fresh clone with no `~/.claude`. Change the canonical one and propagate; see the note at the top of the file.

## Documentation

Project documentation lives in `docs/`. When creating or updating plans, ExecPlans, or design docs, save them there. Reference existing docs in `docs/` for context on project phases and milestones.

Every document should be self-sufficient: the reader should never need to hunt for context. Explain concepts inline. When a concept is already defined in another checked-in document, you may reference it by file path and section rather than repeating it — but the reference must be precise enough that the reader can find it immediately (e.g., "see `docs/PLANS.md` § Milestones"), not vague ("see the architecture doc").

## ExecPlans

When writing complex features or significant refactors, use an ExecPlan (as described in `docs/PLANS.md`) from design to implementation. ExecPlans are the persistence layer for cross-session development — they carry forward all context, decisions, and progress so that a fresh session can continue the work without loss. Completed plans are immutable history; when one finishes, run the close-out ritual (`close-out` skill) to extract its durable decisions before moving on.

## Durable Decisions (ADRs)

Cross-plan decisions live in `docs/adr/` (convention: `docs/adr/README.md`). This list is an index, not a home — one line per active decision with a pointer to its ADR; full context, provenance, and lifecycle live in the ADR file. Every non-obvious claim elsewhere in this file must cite its source (`per docs/adr/NNNN` or `per docs/plans/<plan>.md`) so this snapshot stays auditable and rebuildable. When an ADR corrects something an old plan asserted, the ADR wins.

- `docs/adr/0001-card-data-and-art-are-shared-with-gakumas-supportcards-at-runtime.md` — **accepted** (data part implemented, art not yet): support card data comes from a versioned JSON file the sibling gakumas-supportcards publishes, and card art and item icons from its R2 bucket `tia-assets`, which this app's Worker only reads; nothing is copied into this repository.

## Project Overview

A static web page for 学園アイドルマスター players of the H.I.F. scenario. It answers one question: can this 選抜試験メモリー still reach S5 in 本戦? The page reads two screenshots of the memory (the 基本情報 and 編成 tabs) into an editable form, then computes the best-case Vo+Da+Vi total the memory can reach. That bound assumes every remaining lesson is SP and on the best stat, and every remaining support ability and P-item fire happens, within the parameter cap. It is compared with each rank's required total, S5 (評価値 35000) first. The required total depends on the memory's reachable スター性 and is 7044 when スター性 can reach 1335 (per `docs/plans/EXECPLAN_HIF_FINAL_STATS.md`, decisions G1, G2, G10). Screenshots only pre-fill the form, which is what gets computed, so a misread is visible and fixable (decision G6). Card data and art come from the sibling gakumas-supportcards at runtime (per `docs/adr/0001`).

## Architecture

`src/engine/` holds the arithmetic as pure TypeScript with no DOM, one module per rule, each with a co-located `*.test.ts`:
- `rating.ts`: the rank table, the 評価値 formula, and the total each rank needs for a given final スター性;
- `star.ts`: the best final スター性 a memory can reach in 本戦;
- `schedule.ts`: the 324 placements of the 本戦 lessons and 授業, and the best total from the schedule alone;
- `count.ts`: how often a trigger fires under a set of counts, ported from gakumas-supportcards' counting rule;
- `honsen-profile.ts`: 本戦's counts from the schedule and the user's typical play, and a stopgap for 選抜's (per `docs/plans/EXECPLAN_HIF_FINAL_STATS.md`, decisions G24 and G27);
- `abilities.ts`: what the deck's support cards and held P-items can still fire in 本戦, with the fires each has left;
- `total.ts`: `bestTotal`, the best-case bound: every placement scored with the abilities, capped per stat, and every rank's margin;
- `types.ts`: the shared `Stat`, `Memory`, `DeckSlot`, `HeldItem` and `RankLine` types.

Every count the bound uses is a default the player can change in the panel (decision G25). `src/test-support/dmm.ts` is the DMM sample as engine input; its worked breakdown is in the plan's § Artifacts and Notes.

Every floored product is computed in integers, because floating point floors 120 at +2.5% to 122 instead of 123 (per `docs/plans/EXECPLAN_HIF_FINAL_STATS.md`, decision G18).

`src/data/` reads the card data gakumas-supportcards publishes as `/data/cards.v1.json` (per `docs/adr/0001`):
- `contract.ts`: the file's types, copied from the sibling's `src/engine/types.ts`. Never edit them on their own; a change there bumps the file's format version and name (the sibling's ADR 0010), and the new shapes are copied here then.
- `load.ts`: `parseCardData` checks the whole file against the contract. One bad value or an empty card list refuses the file, with the path named; fields the contract does not name are dropped (per the plan, decision G23).
- `fixtures/cards.v1.json`: the sibling's real file, used by the tests. The plan's § Concrete Steps says how to refresh it (decision G22).

`src/app/` is the page (Preact, Tailwind 4): pure modules (`form.ts` holds the form and its URL round trip, `compute.ts`, `panel.ts`, `items.ts`, `picker.ts`, `fields.ts`, `cap.ts`, `labels.ts`), and components laid out as the game's own tabs (per the plan, decisions G26 and G30). `infra/worker/` is its Cloudflare Worker: `/img/*` from the R2 bucket `tia-assets`, read only, and `/data/cards.json` proxied from gakumas-supportcards (decisions G14, G31); `vite.config.ts` answers the same routes in the dev server from the sibling's local files or the fixture, and a missing image with 404. The deployment comes in Milestone 6 of that plan.

`src/reader/` reads the two screenshots into values with confidences, in pure functions over a `Raster` (the shape of the browser's `ImageData`); no OCR and no model (per `docs/plans/EXECPLAN_HIF_FINAL_STATS.md`, decision G35):
- `layout.ts` finds each tab's anchor (the 「カスタム」 label, the 「SP」 badge) and measures everything from it in units of width / 720; a field the idol image hides reads as null;
- `glyphs.ts`, `digits.ts`, `fonts.ts` and `templates.ts` read the numbers against glyph templates cut from the samples; `kihon.ts` and `hensei.ts` say where each field sits;
- `cards.ts` ranks every card's thumbnail against a tile, `items.ts` matches the サポート P-items' icons, and `custom.ts` reads the カスタム item's character and accessory for メダルもじゃ (decisions G33, G37);
- `read.ts`'s `readScreenshot` puts it together. `src/app/fill.ts` turns a reading into form values and the fields to ring (G38), and `screenshots.ts` is the browser's decoding.

Two files are generated, never edited: `src/reader/glyph-templates.ts` by `bun scripts/glyph-templates.ts`, and `src/reader/custom-templates.ts` by `bun scripts/custom-templates.ts <folder of extracted layers>` (the plan's § Concrete Steps). The reader's fixtures are in `src/reader/fixtures/`: the six sample pairs (G32), and a snapshot of the sibling's thumbnails and item icons that only the tests read (G36; ADR 0001's update). `src/test-support/samples.ts` holds what each sample shows.

## Setup and Development

Install with Bun (1.4): `bun install`. Under the Claude Code sandbox, the global cache in `~/.bun` is not writable, so point Bun at a writable one: `BUN_INSTALL_CACHE_DIR="$TMPDIR/bun-cache" bun install` (per `docs/plans/EXECPLAN_HIF_FINAL_STATS.md` § Concrete Steps). `bun run dev` serves the page at `http://localhost:5173`. Under the Claude Code sandbox it cannot open its port (`listen EPERM`), so run it outside the sandbox, or set `sandbox.network.allowLocalBinding: true` (per the plan's § Surprises & Discoveries). `SUPPORTCARDS_DIR` points the dev server at a gakumas-supportcards checkout elsewhere than beside this one.

## Build and Test

- `bun test` runs every `*.test.ts`.
- `bun run type-check` runs `tsc --noEmit` (TypeScript 7).
- `bun run lint` runs `oxlint --deny-warnings` with type-aware rules.
- `bun run build` writes the page to `dist/`.
- Component tests (`*.test.tsx`) run in happy-dom under `bun test`; how the page looks is checked in a browser.
- The reader's tests read every sample and the image snapshot, so `bun test` takes a few seconds; `src/reader/templates.test.ts` fails while a generated template file is stale.

A clean type check or lint prints only the command line, so judge both by exit status 0. The lint rules in `oxlint.config.ts` were adopted from gakumas-supportcards; an exception goes in that file with its reason and removal condition, never as an inline disable.

## Code Style

<!-- Language-specific conventions, naming patterns, import ordering, or formatting tools in use. -->

## Tasks

Tasks live on the GitHub board `tia-tools` project `1`; work them with the `task-board` skill. Merges go through PRs into `develop`, the default branch; a PR closes its issue with `Closes #N`.

## Commit Discipline

- Follow Git-flow workflow to manage the branches
- Use small, frequent commits rather than large, infrequent ones
- Only add and commit affected files; leave untracked files as they are
- Never add coding agent attribution in commits

