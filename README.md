# H.I.F. 本戦ランク判定

Can this 選抜試験メモリー still reach S5? This is a web page for players of 学園アイドルマスター's H.I.F. scenario. Give it two screenshots of a memory, and it shows the best Vo+Da+Vi total that memory can still reach in 本戦, against what each produce rank needs.

**https://gmks-hif-final-stats.tia.run**

## Using it

1. On the memory's detail screen, take one screenshot of the 基本情報 tab and one of the 編成 tab.
2. Drop both anywhere on the page, or tap 「基本情報・編成のスクリーンショット」 and choose them.
3. Look for fields with an amber ring. The page was not sure of these, or the screenshot hides them. Correct them by hand: everything recomputes as you type.
4. Read the rank table. It lists every rank from S5 (評価値 35000) down to A, with the total each needs and this memory's margin, and highlights the best rank within reach.

The form also works with no screenshots, filled in by hand.
- **The URL holds the whole form,** so a result can be bookmarked or shared.
- **The 上限 selector,** the H.I.F bonus's parameter cap level, is remembered by the browser. It defaults to Lv6 (3200 per stat).

Screenshots are read in your browser and are never uploaded. Portrait phones and DMM (PC) are supported: images 1.75 to 2.25 times as tall as they are wide. Other shapes, tablets among them, are refused rather than misread, and the form is then filled by hand.

## What the result means

The total is a **best case**, not a forecast. It assumes:
- every remaining lesson is an SP lesson on the best stat, and both 授業 go to the best stat;
- every remaining support-card ability and P-item fire happens;
- each stat is capped at the 上限.

So "not reachable, short by N" means the memory cannot reach that rank. Discard it, if that rank is the goal. A plus margin means the rank is still possible, not that it is likely.

The total a rank needs depends on the memory's best final スター性, with both contest rounds at their rating caps. S5 needs 7044 when スター性 can reach 1335, and more when it cannot.

Under the result:
- **The breakdown** shows the best lesson and 授業 placement and every ability that fires.
- **The folded カウント panel** lists every count the bound used: how many P-drinks are acquired, how many skill cards, each ability's fires left, and more. Each count can be changed, and ↺ puts it back.
- **「未計上」 entries:** a support card whose ability the card data cannot count yet is listed here, with a points field. Until each such entry has a value, 0 included, a "not reachable" line reads 「暫定」 (provisional).

## Sources

- **Card data and art:** support card data, thumbnails and P-item icons come at runtime from [gakumas-supportcards](https://gakumas-supportcards.tia.run) ([tia-tools/gakumas-supportcards](https://github.com/tia-tools/gakumas-supportcards)), so a new card works here the day that site has it.
- **The H.I.F. rules:** the rating formula, the 本戦 schedule and the スター性 rules come from the community wikis (wikiwiki 「HIF/基本情報」, seesaawiki 「H.I.F」) and [gakumas-tools](https://github.com/gakumas-tools/gakumas-tools).

This is a fan-made tool.

## Development

The stack is Bun 1.4, TypeScript 7, Vite, Preact and Tailwind 4, with Oxlint for linting.

    bun install
    bun run dev          # http://localhost:5173
    bun test             # every *.test.ts and *.test.tsx
    bun run type-check
    bun run lint
    bun run build        # writes dist/

The dev server takes the card data and images from a gakumas-supportcards checkout beside this one, or from `SUPPORTCARDS_DIR`. Without one, it serves the committed card file and no images, so a screenshot's cards and P-items cannot be matched.

Where things are:
- `src/engine/` holds the arithmetic, pure TypeScript with no DOM.
- `src/data/` reads the card data against its contract.
- `src/reader/` reads the screenshots by measured layout and templates, with no OCR and no model (`docs/adr/0002`).
- `src/app/` is the page.
- `infra/worker/` is the Cloudflare Worker that serves the page, the images and the card data.

`CLAUDE.md` maps every module. The design and how it was built are in `docs/plans/EXECPLAN_HIF_FINAL_STATS.md`, and the lasting decisions are in `docs/adr/`.

Changes go through pull requests into `develop`, where CI runs the tests, the type check, the lint and the build. `main` is production: a release is a pull request from `develop` into `main`, and merging it deploys the site (`infra/worker/README.md`).
