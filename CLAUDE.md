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

- `docs/adr/0001-card-data-and-art-are-shared-with-gakumas-supportcards-at-runtime.md` — **accepted** (not implemented yet): support card data comes from a versioned JSON file the sibling gakumas-supportcards publishes, and card art and item icons from its R2 bucket `tia-assets`, which this app's Worker only reads; nothing is copied into this repository.

## Project Overview

A static web page for 学園アイドルマスター players of the H.I.F. scenario. It answers one question: can this 選抜試験メモリー still reach S5 in 本戦? The page reads two screenshots of the memory (the 基本情報 and 編成 tabs) into an editable form, then computes the best-case Vo+Da+Vi total the memory can reach. That bound assumes every remaining lesson is SP and on the best stat, and every remaining support ability and P-item fire happens, within the parameter cap. It is compared with each rank's required total, S5 (評価値 35000) first. The required total depends on the memory's reachable スター性 and is 7044 when スター性 can reach 1335 (per `docs/plans/EXECPLAN_HIF_FINAL_STATS.md`, decisions G1, G2, G10). Screenshots only pre-fill the form, which is what gets computed, so a misread is visible and fixable (decision G6). Card data and art come from the sibling gakumas-supportcards at runtime (per `docs/adr/0001`).

## Architecture

<!-- Describe the high-level structure: key directories, how components relate, data flow. Name the main entry points. -->

## Setup and Development

<!-- How to install dependencies, configure the environment, and run the project locally. Include exact commands. -->

## Build and Test

<!-- List the commands to build, test, lint, and format. Show expected output for a clean run. -->

## Code Style

<!-- Language-specific conventions, naming patterns, import ordering, or formatting tools in use. -->

## Commit Discipline

- Follow Git-flow workflow to manage the branches
- Use small, frequent commits rather than large, infrequent ones
- Only add and commit affected files; leave untracked files as they are
- Never add coding agent attribution in commits

