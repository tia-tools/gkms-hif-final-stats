# Tell an H.I.F. player whether a 選抜試験メモリー can still reach S5

This ExecPlan is a living document. The sections `Progress`, `Surprises & Discoveries`, `Decision Log`, and `Outcomes & Retrospective` must be kept up to date as work proceeds. It is maintained in accordance with `docs/PLANS.md` at the repository root.


## Purpose / Big Picture

学園アイドルマスター (Gakumas) is a mobile and PC idol-raising game. Its H.I.F. scenario (『Hatsuboshi IDOL FESTIVAL』) is played in two parts. The first part, 選抜試験 (a 20-day run), ends by saving a 選抜試験メモリー: a snapshot of the idol's parameters, deck and items. The second part, 本戦 (7 days and two contest rounds), is played from that snapshot, and can be replayed from it many times. The run's final grade is a produce rank. The top rank today is S5, which needs a 評価値 (evaluation value) of 35000.

A player chasing S5 makes many 選抜試験メモリー and has to decide which ones are worth playing 本戦 with. Today they guess. After this plan, they open a web page and give it two screenshots of a memory's detail screen (its 基本情報 tab and its 編成 tab). The page fills a form with what it read: the parameters, parameter bonus percentages, スター性, 親愛度, P-items with their remaining uses, and the six support cards with their levels. The player can correct any field. The page then shows, for every rank from S5 down, the parameter total the rank needs and the best total this memory can still reach. The answer reads "reachable, with N to spare" or "not reachable, short by N".

To see it working, run `bun run dev`, open `http://localhost:5173`, drop the two DMM sample screenshots, and read the S5 line. The worked example in `Artifacts and Notes` predicts what that line should say.

The work is tracked on the GitHub board `tia-tools` project 1, one issue per milestone branch (decision G20): Milestone 1 was issue #4, and Milestone 2 is issue #6.


## Progress

- [x] (2026-10-28 14:40Z) Research: H.I.F. rating formula, 本戦 schedule, memory carry-over, prior art (gakumas-tools), art-matching feasibility on the samples. Findings in `Context and Orientation` and `Surprises & Discoveries`.
- [x] (2026-10-28 15:10Z) Design interview (grill-me) with the user: decisions G1–G13 in the `Decision Log`.
- [x] (2026-10-28 15:20Z) Repository scaffolded from `Taka499/project-template` at b52b8df into `~/Developer/gmks-hif-final-stats`; `docs/adr/0001-card-data-and-art-are-shared-with-gakumas-supportcards-at-runtime.md` written; this plan drafted.
- [ ] Open item O2: decide whether the sample screenshots may be committed as test fixtures in this public repository. Needed by Milestone 5.
- [ ] Open item O3: choose the tia.run subdomain. Needed by Milestone 6.
- [x] (2026-10-29 01:10Z) Milestone 1: toolchain, rating arithmetic, スター性 bound, schedule-only bound. Issue #4, branch `feature/m1-rating-schedule`: `bun test` 30 pass, type-check and lint clean, every guard seen red by mutation (`Artifacts and Notes`).
- [x] (2026-10-29 02:07Z) Milestone 1 merged into `develop` by pull request #5 (merge commit 841b7be), closing #4.
- [x] (2026-10-29 03:02Z) Milestone 2 (issue #6, branch `feature/m2-card-data`), sibling half: gakumas-supportcards publishes `dist/data/cards.v1.json`, worked by a session in that repository (decision G21). Its pull request #57 (`tia-tools/gakumas-supportcards`) merged into its `develop` as d08f3de. The file goes live only after the sibling's `develop` is released into `main`, which deploys. Milestone 4's Worker needs that; this milestone's tests do not.
- [x] (2026-10-29 03:10Z) Milestone 2, this repository's half: `src/data/contract.ts`, `src/data/load.ts` and the fixture `src/data/fixtures/cards.v1.json`. `bun test` 46 pass, type-check and lint clean, every loader guard seen red by mutation (`Artifacts and Notes`).
- [x] (2026-10-29 03:40Z) Milestone 2 merged into `develop` by pull request #7 (merge commit b1363b2), closing #6.
- [x] (2026-10-29 04:00Z) Open item O1 answered for 本戦 by the user (decisions G24–G26). 選抜 counts stay a stopgap (decision G27).
- [x] (2026-10-29 05:10Z) Milestone 3 (issue #8, branch `feature/m3-honsen-abilities`), code: `src/engine/count.ts`, `honsen-profile.ts`, `abilities.ts` and `total.ts`. `bun test` 94 pass after the Codex reviews' fixes, type-check and lint clean, every guard seen red by mutation. The DMM sample comes to 6971, short of S5 by 73 (`Artifacts and Notes`).
- [x] (2026-10-29 05:14Z) Milestone 3, acceptance: the user checked the DMM breakdown in `Artifacts and Notes` line by line and confirmed it.
- [ ] Milestone 3 merged into `develop` by a pull request that closes #8.
- [ ] Milestone 4: the form page and its Worker.
- [ ] Milestone 5: reading the screenshots (prototype first).
- [ ] Milestone 6: deploy and CI gates.


## Surprises & Discoveries

- Observation: The 7044 the user started from is exactly the parameter total S5 needs when every other term of the rating is at its maximum.
  Evidence: 評価値 = floor(Σparams × 2 + スター性 × 7.5) + R1評価点 + R2評価点 − 2000. With スター性 1335 and the round ratings at their caps (5500 and 7400), 35000 needs 2·P ≥ 35000 + 2000 − 12900 − 10012.5 = 14087.5, so P ≥ 7043.75, i.e. 7044. Sources: wikiwiki `HIF/基本情報` and gakumas-tools `utils/hif.js`, both read 2026-10-28.

- Observation: The in-game support-card tile on the 編成 tab is not the whole card art. It is a crop of it, zoomed by a different amount per card.
  Evidence: Each DMM tile was compared with all 206 local 192 × 108 thumbnails of gakumas-supportcards (`scripts/images/out/w192/`) on a 32 × 18 colour grid. The plain comparison ranked 4 of 6 tiles correctly. A search over zoom 1.0–1.6 and nine offsets ranked all 6 first, but two margins are thin: csprt-3-0062 scored 1243 against 1632 for the runner-up, at the edge of the zoom range, and csprt-2-0007 scored 315 against 660.

- Observation: The marks after "Lv" on a support-card tile count 凸 (limit breaks). There is no filled versus empty distinction.
  Evidence: In samples 02 and 03, Lv55 tiles show three ×, an SSR at Lv50 shows two ×, and Lv60 tiles and an SR at Lv50 show four ×.

- Observation: On a tall phone the layout is the DMM layout scaled to the image width and shifted down. A blurred band of the idol image fills the extra top space.
  Evidence: DMM sample 720 × 1280; iPhone 15 Pro Max sample 1290 × 2796. The stats row sits at y ≈ 600 on DMM and y ≈ 1245 on the iPhone, against ≈ 1075 expected from width scaling alone.

- Observation: The sample memory is far from S5 even before support abilities are counted.
  Evidence: DMM sample at Vo 1982, Da 2468, Vi 1050 (total 5500). Lessons and 授業 alone add about 910 (see `Artifacts and Notes`). Its abilities add roughly 370 more, still about 260 short of 7044.

- Observation: Multiplying by a bonus in floating point and then flooring gives wrong answers for real inputs. floor(120 × 1.025) is 122, but 120 at +2.5% is exactly 123. The same happens for 50 at +8.2% (90 instead of 91) and for 100 at +15% (114 instead of 115).
  Evidence: a scan of every bonus from 0.0% to 150.0% against the lesson bases found 10 mismatches between `Math.floor(base * (1 + permil / 1000))` and `Math.floor(base * (1000 + permil) / 1000)`, and 10 more for スター性 bases 1–200 at the 親愛度 percentages (2026-10-29). The engine therefore multiplies in integers (decision G18).

- Observation: On an empty `src/`, neither `bun test` nor the type check passes, contrary to what Milestone 1 first said. Lint does pass.
  Evidence: `bun test` exits 1 with "0 test files matching **{.test,.spec,_test_,_spec_}.{js,ts,jsx,tsx}", and `tsc --noEmit` exits 2 with "TS18003: No inputs were found in config file". Both pass once the first module and its test exist.

- Observation: `bun install` resolved newer versions than the sibling's lockfile, all inside the sibling's own version ranges: oxlint 1.90.0 (sibling 1.85.0), oxlint-tsgolint 7.0.2005 (7.0.2003), eslint-plugin-security 4.2.0 (4.1.0) and @types/bun 1.4.4 (1.4.2). TypeScript is 7.0.2 in both. The lint config still loads under them.
  Evidence: `bun.lock`; a probe file `export const probe: any = 1;` makes `bun run lint` exit 1 with `typescript(no-explicit-any)`, and removing it makes the lint pass again (2026-10-29).

- Observation: The published card file keeps held cards in a separate top-level list, not on each card, and calls the field `reasons`, not `uncounted` as this plan first said. The top-level keys are `formatVersion`, `levelLimits`, `cards` and `held`, in that order. Each `held` entry is a `HeldCard`, `{ id, name, reasons: string[] }`. `cards` holds every card, held ones included.
  Evidence: the sibling's pull request #57, `data/card-data-file.ts` (`CardDataFile`), and the sibling session's report of 2026-10-29. Its build printed `1` and `210` for `jq '.formatVersion, (.cards | length)'`. `held` was `[]` that day. The file is compact JSON of about 1.57 MB (45 KB gzipped).

- Observation: A held card's entry in `cards` is incomplete in one of two ways, depending on why it is held. If the sibling cannot read an effect at all, that effect is left out of the card. If it can read the effect but one of its own route profiles has no number for it, the effect stays in the card. Milestone 3 must therefore not assume that every reason in `held` stands for a missing effect. An effect that stays may be countable here with the 本戦 profile. Only effects that are actually missing should add manual points (decision G12). Milestone 3 found that the reasons cannot tell the two cases apart, so every reason gets a 「未計上」 entry, and the player enters 0 for one whose effect is already counted here (decision G28).
  Evidence: the doc comment on `held` in the sibling's `data/card-data-file.ts` (pull request #57).

- Observation: No trigger in the published data carries a `scenario` field today. No support card ability or card-granted P-item in it is limited to one scenario, so open item O6 has no case to handle yet. A card added later could still bring one.
  Evidence: `jq '[.. | objects | select(has("occasion")) | keys[]] | unique'` over the fixture prints `["conditions","filters","occasion"]` (2026-10-29, sibling d08f3de).

- Observation: Two of the DMM deck's P-items differ from how this plan first described them. 素敵なお仕事 (もうすぐ本番ですね) fires on any skill-card change while Vi is 400 or more, not only on a 「基本」 change. 完全制覇でポン (なぜこんなところにッ！？) needs Da 700 or more, and each fire also grants one P-drink. A third card item, ふわふわでもこもこ (ふわふわでワクワク), grants two P-drinks on every Dance SP lesson end with no fire limit, so with it the drink count depends on where the lessons go.
  Evidence: the effects at the deck's levels in `src/data/fixtures/cards.v1.json` (2026-10-29).

- Observation: The DMM memory holds ワッペン (4 left), 完全制覇でポン (1 left) and 素敵なお仕事 (1 left), but not ふわふわでもこもこ. Its other P-items give no parameters: a カスタム item, the P-idol's own item (sunglasses), and two サポート items the card data does not list as counted (an H.I.F file and a lamp). The 編成 tab ends with three counts: スキルカード再抽選可能回数 残り2, スキルカード除去可能回数 残り0 and 相談リフレッシュ回数 残り1.
  Evidence: the two DMM screenshots in `temp/dmm/01/`. The サポート icons were matched by eye against the sibling's 48 × 48 icons `img_general_pitem_3-263` (coloured balls) and `img_general_pitem_3-352` (a clipboard). `img_general_pitem_2-004` (flowers in a glass) is not in the row. The user confirmed 完全制覇でポン's 1.

- Observation: The DMM memory is much closer to S5 than this plan first estimated: 73 short, not about 260. Its abilities add 569 rather than about 370. The P-drink count is what was underestimated: 12 drinks fire two +5 abilities for 120. Two other things add up: 4 SSR acquisitions on two +6 abilities, and 8 drink purchases on one +11. At its best placement, Da reaches 3208, so the cap takes 8.
  Evidence: `src/engine/total.test.ts`, which pins the total, the per-stat values and every ability line, each worked by hand in `Artifacts and Notes` before the code ran.


## Decision Log

The G-numbered decisions come from the design interview of 2026-10-28; the user's own words are summarised, and agent decisions are marked as such.

- Decision G1: The verdict is a best-case upper bound: the highest Vo+Da+Vi total the memory can still reach in 本戦. It assumes every remaining lesson is an SP lesson on the best stat, both 授業 go to the best stat, every remaining support ability and P-item fire happens, and the per-stat cap applies. The result is reachable or not reachable, with the margin.
  Rationale: It answers the player's real question, "is this memory worth playing 本戦 with?": if even the best case falls short, discard the memory. It also follows the maximum-performance convention of the sibling site (its ADR 0001).
  Date/Author: 2026-10-28, user.

- Decision G2: The required total is computed per memory, not fixed at 7044. Required = the smallest integer P with floor(2P + 7.5 × S_final) + 5500 + 7400 − 2000 ≥ the rank's 評価値. S_final is the memory's best-case final スター性 (see Milestone 1), and both rounds are assumed at their rating caps. It equals 7044 when S_final is 1335. The arithmetic is shown on the page.
  Rationale: A memory whose スター性 cannot reach 1335 needs more parameters: each missing point of スター性 costs 3.75. A memory at 760 tops out at 1285 and needs 7232.
  Date/Author: 2026-10-28, user.

- Decision G3: A capped support ability's remaining 本戦 fires default to cap − min(cap, the count of its occasion in 選抜). This assumes 選抜 used every fire it could. A panel lists every capped ability with its remaining fires for the player to correct. Uncapped abilities fire on every 本戦 occasion. A P-item's remaining fires come from the screenshot.
  Rationale: The two screenshots do not show used fires. Refunding them would make the bound meaninglessly loose. The user's example: in the DMM sample, もうすぐ本番ですね's 「基本」-card チェンジ ability (cap 3, Vi+39 at Lv60) has 1 fire left.
  Date/Author: 2026-10-28, user.

- Decision G4: 本戦 occasion counts come from one shipped 本戦 route profile in the sibling's counting model (occasions, filters, conditions; see `Context and Orientation`). The schedule fixes some counts, and the player's typical 本戦 play sets the rest. Every count is adjustable in the same panel as G3. Day 3 (差し入れ or おでかけ) is chosen per deck as whichever gives more.
  Rationale: Purchases, deletions and acquisitions vary with play; one profile with an adjustable panel keeps the default simple and the bound honest.
  Date/Author: 2026-10-28, user.

- Decision G5: Card data and art are shared with gakumas-supportcards at runtime, not copied. Recorded as `docs/adr/0001-card-data-and-art-are-shared-with-gakumas-supportcards-at-runtime.md`.
  Rationale: New support cards enter 選抜 decks the day they release; a copy would go stale.
  Date/Author: 2026-10-28, user.

- Decision G6: Screenshots only pre-fill an editable form, and the form is what gets computed. The form works with no screenshots at all, and the result recomputes live.
  Rationale: Recognition will sometimes be wrong (two thin art-match margins already in the samples). A misread must be visible and cheap to fix, not silently skew the verdict.
  Date/Author: 2026-10-28, user.

- Decision G7: Screenshot reading supports portrait phones and DMM (PC), i.e. layouts that scale with the image width (aspect ratios from 9:16 to about 9:20). Each screenshot is located by one anchor, with all positions measured as fractions of the width. Any other aspect ratio is detected and refused (the form is then filled by hand), never misread. Tablets come later and only with samples.
  Date/Author: 2026-10-28, user.

- Decision G8: The 本戦 parameter cap is a form selector, 「H.I.Fボーナス 上限Lv」, Lv0–6 mapping to 3000/3050/3080/3110/3140/3170/3200 per stat. It is remembered in the browser (localStorage) and defaults to Lv6, 3200.
  Rationale: The cap comes from an account-level bonus no screenshot shows. 3200 is the best case and gakumas-tools' `MAX_PARAMS`.
  Date/Author: 2026-10-28, user.

- Decision G9: The random サブ stat of each 本戦 lesson (fixed when 本戦 starts, unknown when the memory is saved) is assumed to land on whichever other stat gains the most. Both lessons are assumed SP regardless of the memory's SP rates, which are shown for information only.
  Rationale: Follows from G1.
  Date/Author: 2026-10-28, agent.

- Decision G10: The result lists every rank from S5 down (S5 35000, S4+ 30000, S4 26000, SSS+ 23000, SSS 20000, SS+ 18000, SS 16000, S+ 14500, S 13000, A+ 11500, A 10000). Each line shows the rank's required total and the best-case margin, with S5 first and the best reachable rank highlighted.
  Rationale: Same computation, no extra input; a memory that misses S5 still says whether it is an S4+ candidate.
  Date/Author: 2026-10-28, user.

- Decision G11: Skill cards are out of scope: not read and not modelled. A condition on how many skill cards are held (e.g. もうすぐ本番ですね's 所持スキルカード15枚以上 at 試験終了) counts as met under G1 and is adjustable in the panel like any condition.
  Rationale: Skill cards give no parameters; modelling them is complicated for no gain in this bound.
  Date/Author: 2026-10-28, user.

- Decision G12: A deck support card that the sibling holds back (its ADR 0005: an ability whose trigger or effect type cannot be counted) is still published in the shared card data, with its countable abilities and a list of the uncounted ones. The panel lists each uncounted ability as 「未計上」 with a manual points field. A "not reachable" verdict reads 「暫定」 (provisional) until every uncounted ability has a value, 0 included.
  Rationale: A best-case "not reachable" is only true if nothing that could add parameters was left out.
  Date/Author: 2026-10-28, user.

- Decision G13: P-items are recognised against a small candidate set: the items the six deck cards can grant, plus H.I.Fワッペン. The rest of the item catalogue is not searched. P-idol, custom (カスタム) and unknown items are listed as not counted, since they give no parameters. The custom pouch's acquisitions, changes and drinks enter through the 本戦 profile counts (G4). A drink-granting item's remaining fires add to the 本戦 Pドリンク獲得 count, as in the sibling's ADR 0009.
  Date/Author: 2026-10-28, agent, following G1, G5 and G11.

- Decision G14: The page serves the shared card data at its own origin as `/data/cards.json`: this app's Worker fetches the sibling's published file server-side and caches it. The sibling's Worker therefore needs no CORS change, and the sibling's update job gains no new R2 write path.
  Date/Author: 2026-10-28, agent; revisit in Milestone 2 if the sibling prefers another route.

- Decision G15: Excluded from the 本戦 bound, because they cannot fire again or are already inside the memory's numbers:
  - abilities on プロデュース開始 (`ProduceStart`), which fired in 選抜;
  - パラメータボーナス+ abilities, which are already in the memory's bonus percentages;
  - サポートイベント rewards. Which events have happened is not visible, and the wiki reports an unseen event can still occur in 本戦 only at a low rate.
  Date/Author: 2026-10-28, agent.

- Decision G16: Until open item O5 is answered, a memory below 親愛度 Lv37 uses its own level for the two lessons. Every later スター性 gain (each ワッペン fire, round 1 and round 2) uses Lv36, or the memory's level if higher. Lv36 and Lv37 both give +50%, so every gain after the lessons gets +50% whatever the memory's level. "36 after winning" is read as winning round 1.
  Rationale: The level rises during 本戦 (34 after day 6, 35 after the recovery event before round 1, 36 after winning round 1), but it is not known which rise comes before which gain. A ワッペン fire can also come from a card bought at the インターバル, after the last rise. An upper bound must never come out below what the memory can reach, so every uncertain gain takes the highest level that can be in force. Once O5 is answered, change `LATE_AFFECTION_FLOOR` and its use in `src/engine/star.ts`; the Lv37 results do not move.
  Date/Author: 2026-10-29, agent.

- Decision G17: `requiredTotal` never goes below 0. A rank that the capped rounds and the final スター性 reach on their own needs a total of 0; for example rank A (10000) at スター性 1335.
  Rationale: A negative required total means nothing to the player. The margin is then simply the best total.
  Date/Author: 2026-10-29, agent.

- Decision G18: Every multiplication the engine floors is done in integers. A lesson gain is floor(base × (1000 + bonus‰) / 1000), a スター性 gain is floor(base × (100 + bonus%) / 100), and floor(スター性 × 7.5) is computed as floor(スター性 × 15 / 2).
  Rationale: Floating-point floors give wrong answers for real inputs (`Surprises & Discoveries`). Integer arithmetic gives the exact value the game's floor needs. Whether the game floors at all is still open item O4.
  Limit: JavaScript numbers hold integers exactly only up to 2^53 (about 9 × 10^15). Every product here stays below 10^7 for game values (parameters up to 3200, スター性 up to about 1400, ratings up to 35000), so the engine adds no range guard. A Codex review on 2026-10-29 showed `requiredTotal` going wrong for inputs near 10^15. That is outside any game value, so it was answered with this note rather than with a code change.
  Date/Author: 2026-10-29, agent.

- Decision G19: Milestone 1 adopts only the `test`, `type-check` and `lint` scripts and the tools they run. The `dev`, `build` and `preview` scripts, Vite, Preact and the tsconfig JSX settings come in Milestone 4, the first milestone that uses them. This revises the first draft's Milestone 1 list, which also copied `dev` and `build`.
  Rationale: Before the page exists, a `dev` script would have nothing to serve, and the dependencies would be installed with nothing importing them.
  Date/Author: 2026-10-29, agent.

- Decision G20: Each milestone is one issue on the board `tia-tools` project 1, on its own branch from `develop`. The pull request that merges the branch into `develop` closes the issue. Milestone 1 is #4. Progress, decisions and discoveries stay in this plan, not on the issue.
  Rationale: The project's `task-board` workflow sizes an issue to one branch, and only the branch holding the claim may close it. This plan already gives each milestone its own branch.
  Date/Author: 2026-10-29, agent.

- Decision G21: Milestone 2's change to gakumas-supportcards is made by a coding-agent session opened in that repository, not by a session of this one. This repository's half starts once the sibling's pull request is merged and its build writes the file.
  Rationale: A session here runs in a sandbox that can write only this repository. A write probe in the sibling's checkout was refused with "Operation not permitted". Working there from here would need every build, test and git command run outside the sandbox. A session in the sibling also loads that repository's own `CLAUDE.md` rules, which its change has to follow.
  Date/Author: 2026-10-29, user (chose this over working there unsandboxed, or writing this repository's half first against a guessed format).

- Decision G22: The loader's test fixture `src/data/fixtures/cards.v1.json` is the sibling's whole published file (210 cards, 1.57 MB, 45 KB gzipped), not a trimmed subset. It was regenerated from the sibling's merged data, and its SHA-256 matched the sibling's own build output. Refresh it the same way (`Concrete Steps`) when the sibling bumps the format, or when a later milestone needs newer cards.
  Rationale: Checking the whole file proves the loader accepts every real card and drops no field: the test requires the parsed data to equal the file exactly. Milestone 3's DMM breakdown can also take its six deck cards from the same fixture. A trimmed copy would need a trimming script and would prove less.
  Date/Author: 2026-10-29, agent.

- Decision G23: `parseCardData` is all or nothing. One value that does not match the contract refuses the whole file, and the error names its path (e.g. `cards[0].breakpoints[0].effects[0].stat: expected vocal | dance | visual`). An empty card list is refused too. A field the contract does not name is dropped, not refused.
  Rationale: `Idempotence and Recovery` requires that the page never computes with a partial card list; a refused file sends it to the manual form instead. Unknown fields are dropped because the sibling's ADR 0010 makes every change to the shape bump the format version. A new field without a bump would break that rule, and refusing the file would take the card pickers down for something the computation does not read.
  Date/Author: 2026-10-29, agent.

- Decision G24: The 本戦 play counts, as the user gave them (open item O1 for 本戦). Every count is a default the panel can change (G25).
  - P-drinks bought at the day-6 相談: 4 per lineup, and 4 more per remaining 相談リフレッシュ (shown on the 編成 tab as 相談リフレッシュ回数 残りN). That is 8 with 1 left, 4 with none.
  - P-drinks acquired: 1 on day 3, plus the 相談 purchases, plus 2 at the インターバル, plus the drinks of each drink-granting P-item's fires (G13). For the DMM memory: 1 + 8 + 2 + 1 = 12.
  - Skill cards deleted: 0, or 2 at the 相談 when the memory's first P-item, the P-idol's own, is メダルもじゃ.
  - Skill cards acquired: as many as the remaining capped acquisition triggers can use, and at least 1 (the day-3 差し入れ card). Those triggers are ワッペン's remaining fires (to fill スター性) and each capped acquisition ability or P-item; one card can fire them all. Skill-card changes work the same way: the two 授業 changes, or more if a capped change trigger has more fires left, made at the インターバル. So do the インターバル's other actions: card purchases, upgrades and customisations, with 0 when nothing calls for them.
  - Uncapped abilities fire only on these counts. The bound never adds actions just to fire an uncapped ability more.
  - Day 3 is usually 差し入れ; G4's per-deck choice stays.
  Rationale: the user's answers of 2026-10-29: "the choice leans to a) fulfilling the スター性 acquiring as cap, b) trying to achieve the supportcard ability as possible"; "mostly all 8 p-drinks will be purchased … since 1 相談 has 4 drinks, and refresh add 4"; at the インターバル "mostly 2 P-drinks, and buy cards that satisfy remaining P-items trigger"; deletions "mostly no, unless the first P-item is メダルもじゃ, in 相談 2 times"; "Don't try to infinitely satisfy any uncapped ability, since that's impossible."
  Date/Author: 2026-10-29, user.

- Decision G25: Every count the bound uses is derived, shown in the panel, and adjustable there: each occasion's count, each filter's count (for example how many of the acquired cards are SSR), each condition, and each ability's remaining fires. A filter's count defaults to its occasion's count, as if every occurrence were the kind the trigger asks for; this is the upper bound, and the player lowers it where it is wrong. A condition defaults to met every time.
  Rationale: the user, 2026-10-29: "Since this is a simulation, we can only provide a rough number, so the derived parameters should be shown to the user and adjustable by the user."
  Date/Author: 2026-10-29, user.

- Decision G26: The page follows one layout rule: "Avoid unnecessary secondary labels and descriptions. Let the layout do the explaining." Milestone 4 applies it to the form, the panel, the rank table and the breakdown.
  Date/Author: 2026-10-29, user.

- Decision G27: Until the user gives 選抜 counts, G3's "fires used in 選抜" come from a stopgap profile. It takes the sibling's whole-run 汎用コンテ育成 profile and subtracts the 本戦 part that profile's own choices imply (本戦 day 3 差し入れ, 2 P-drinks at the インターバル, 2 授業 changes, the H.I.F応援棒 item). The result:
  - EndLesson 6, all SP, any stat;
  - EndStepEventSchool 4, EndAudition 3, EndBeforeAuditionRefresh 3;
  - StartPresent 3, EndStepEventActivity 1, StartShop 3;
  - GetProduceCard 19 (SSR 7, mental 13, active 7, effect groups 10 unless named: 好印象 14, 元気 12);
  - DeleteProduceCard 9, ChangeProduceCard 2 (「基本」 2), CustomizeProduceCard 2;
  - GetProduceDrink 4, GetProduceItem 5;
  - every other occasion 0.
  As G3 assumes, 選抜 is taken to have used every fire it could: a lesson-stat filter counts all 6 lessons. With this profile, the DMM deck's 「基本」-change ability has 3 − 2 = 1 fire left, as the user reported, and ふわふわでワクワク's exam-end ability (cap 2) has none, as observed.
  Rationale: The plan allowed this stopgap until 選抜 counts are given, and only capped abilities use it. Every result is shown and adjustable (G25).
  Date/Author: 2026-10-29, agent.

- Decision G28: Smaller choices made while building Milestone 3, each visible and adjustable in the panel where it sets a count:
  - A held P-item's fires left are the digit on its icon. If a capped item has no digit read, its cap is used. An item's effects and its P-drinks share one fires-left value, and one panel entry.
  - ワッペン fires as often as skill cards are acquired, up to its remaining fires. Lowering the acquisitions in the panel therefore lowers スター性 and raises every rank's required total. A ワッペン held without a digit read counts its full 20 fires per run, like any capped item.
  - A trigger restricted to a scenario fires only if that scenario is H.I.F. (the sibling's id `hif`). No trigger in today's data is restricted (O6).
  - A day-3 おでかけ is counted like 差し入れ, with the same 1 card and 1 P-drink; only the 差し入れ and おでかけ triggers differ. On a tie, 差し入れ wins, as the user usually chooses it.
  - Each reason a held deck card gives (G12) is one 「未計上」 entry, with the player's points on the stat they choose. 「暫定」 stays until every reason has a value, 0 included. The reasons cannot tell an effect left out of the card from one kept in it and counted here (`Surprises & Discoveries`). So every reason is listed, and the player enters 0 for one whose effect is already counted. A held card whose reason list is empty still gets one entry. A first version took one entry per card, on one stat. The Codex review of 2026-10-29 found that a card with uncounted abilities on two stats would then lose points to one stat's cap, putting the bound too low.
  - An unknown card id refuses the computation rather than dropping the card, because dropping it would lower the bound silently.
  Date/Author: 2026-10-29, agent.


## Outcomes & Retrospective

Milestone 1 (2026-10-29) delivered the arithmetic that needs no card data, in `src/engine/`. The DMM sample's figures in `Artifacts and Notes` now come from code, not only from hand arithmetic: best final スター性 1335, S5 needs 7044, schedule-only best total 6410. A memory at スター性 760 needs 7232. Two things are still provisional. Results below 親愛度 Lv37 use the interim reading of decision G16 until O5 is answered, and lesson gains are floored until O4 confirms the game floors. One lesson from this milestone: a floor over a floating-point product is wrong on ordinary inputs (120 at +2.5%), so every floored product in the remaining milestones must be computed in integers as well (decision G18).

Milestone 2 (2026-10-29) made the sibling's card data readable here. gakumas-supportcards publishes `/data/cards.v1.json` (its pull request #57 and ADR 0010). `src/data/load.ts` reads the file whole against the copied contract and refuses anything that does not match, naming where. Its fixture is the real file, and the DMM sample's six deck cards are in it. Two things remain outside this milestone. The file is not live until the sibling releases its `develop` into `main`, which Milestone 4's Worker needs. And held cards are only parsed here: what their reasons mean for the bound is Milestone 3's job, guided by the discovery in `Surprises & Discoveries` on what a held card's entry leaves out. One lesson: a plan's guess at another repository's format (a per-card `uncounted` field) was wrong in its field name and its placement. The contract was copied from the merged code, not from the plan.

Milestone 3 (2026-10-29) completed the bound. `bestTotal` scores each of the 324 placements, on both day-3 choices, with the deck's abilities and P-items under 本戦's counts. Those counts are decision G24's play counts and G27's stopgap for 選抜; the panel can change every one (G25). The result is the best placement, its ability lines, the capped stats and every rank's margin. The DMM memory comes to 6971: S5 is out of reach by 73, and S4+ is clear by 2427. The user checked that breakdown line by line and confirmed it, which was this milestone's acceptance. One lesson: two of the hand-worked test expectations were wrong at first, both by forgetting that lowering a capped stat frees what the cap held. The tests caught the arithmetic, and the expectations were corrected by hand, not copied from the code's output.


## Context and Orientation

This repository is new. It holds the scaffold:
- `CLAUDE.md`, the project snapshot for coding agents;
- `docs/PLANS.md`, the ExecPlan method this plan follows;
- `docs/adr/README.md`, how durable decisions are recorded, and ADR 0001;
- this plan.

Since Milestone 1 it also holds the toolchain and the first engine modules:
- `package.json` and `bun.lock`: the scripts `test`, `type-check` and `lint` with their tools, TypeScript 7, Oxlint and oxlint-tsgolint;
- `tsconfig.json`;
- `oxlint.config.ts`, the lint rules, adopted from the sibling on 2026-10-29;
- `src/engine/types.ts`, `rating.ts`, `star.ts` and `schedule.ts`, each with a co-located `*.test.ts`. `Interfaces and Dependencies` lists what each exports.

The user keeps sample screenshots in `temp/`, untracked; see open item O2 before committing any of them.

The sibling project gakumas-supportcards (checkout at `~/Developer/gakumas-supportcards`, GitHub `tia-tools/gakumas-supportcards`, live at `https://gakumas-supportcards.tia.run`) supplies the support card data and art. Its own `CLAUDE.md` describes it; the parts this plan relies on are repeated here.

Terms used throughout:

- A **support card** (サポートカード) is one of six cards in a deck. Each has abilities: an effect value, a trigger, and optionally a per-run cap (`cap`, the most times it may fire in one produce run). Effect values depend on the card's level. The **level limit** per 凸 (limit-break count 0–4) is SSR 40/45/50/55/60, SR 30/35/40/45/50 and R 20/25/30/35/40.
- A **trigger** is read by the sibling as an occasion, filters and conditions. The **occasion** is the game's phase type, such as `EndLesson` (a lesson ends) or `GetProduceCard` (a skill card is acquired). **Filters** narrow which occurrences count, such as only Dance lessons or only SP lessons. **Conditions** are a state that must hold, such as Vo ≥ 400 or 15 or more skill cards held.
- A **route profile** says how many times each occasion happens in a run, with counts per filter member and condition.
- **パラメータボーナス** (parameter bonus) is a per-stat percentage that multiplies lesson gains.
- **スター性** (star quality) is an H.I.F.-specific value that raises both exam scores and the final rating.
- **親愛度** (affection level) is a per-idol level from 28 to 37. It multiplies スター性 gains: Lv28 +5%, 29 +10%, 30 +15%, 31 +20%, 32 +25%, 33 +30%, 34 +35%, 35 +40%, 36 +50%, 37 +50%. Each gain is floored after multiplying.

The sibling's generated card data is `data/cards.generated.ts` (206 cards on 2026-10-05). Each card has these fields:
- `id` and `name`;
- `assetId`, e.g. `csprt-3-0099`, whose art is `img_general_<assetId>_full.webp`;
- `type`: vocal, dance, visual or assist;
- `rarity`: r, sr or ssr;
- `breakpoints`: a list of `{ minLevel, effects[] }`, where the effects apply from that level up;
- `items`: the P-items the card's events grant, with `itemId`, `itemName`, `assetId` (icon) and `cap`.

Each effect has these fields:
- `stat` and `value` (flat points; tenths of a percent when `bonus` is true);
- `kind`: skill, event or item;
- optional `cap`;
- `trigger` as `{ occasion, filters?, conditions?, scenario? }`.

Its engine `src/engine/count.ts` turns a trigger into occurrences per run: the occasion's count, narrowed by each filter and condition, then capped. Its H.I.F. route profiles live in `data/scenarios/hif.ts` and use these occasion names:
- `ProduceStart`, `EndLesson`, `EndStepEventSchool` (授業 end), `EndAudition` (exam end);
- `EndBeforeAuditionRefresh` (the rest before an exam), `StartPresent` (差し入れ), `EndStepEventActivity` (おでかけ end), `StartShop` (相談), `StartRefresh`, `StartCustomize`;
- `GetProduceCard`, `DeleteProduceCard`, `UpgradeProduceCard`, `ChangeProduceCard`, `CustomizeProduceCard`;
- `BuyShopItemProduceCard`, `GetProduceDrink`, `BuyShopItemProduceDrink`, `GetProduceItem`.

Cards whose ability cannot be counted are listed in `data/held.generated.ts` with reasons; the card stays in the data with that ability left out. Art lives in the Cloudflare R2 bucket `tia-assets`: 192 × 108 webp thumbnails under `w192/` and 48 × 48 P-item icons (with transparency) under `w48/`. The sibling's Worker serves them as `/img/w192/*` and `/img/w48/*`. Only items granted by support cards have icons there; H.I.Fワッペン's icon is not among them.

H.I.F. facts this plan depends on come from the community wikis (wikiwiki `HIF/基本情報`, seesaawiki `H.I.F`) and gakumas-tools (`gakumas-tools/gakumas-tools`, BSD-3-Clause, file `gakumas-tools/utils/hif.js`), all read on 2026-10-28.

The rating is 評価値 = floor(Σparams × 2 + スター性 × 7.5) + R1評価点 + R2評価点 − 2000.
- **R1評価点**: the round-1 score is first divided by 1.2 (the round's first-place bonus). The result maps piecewise: 0 up to 300000, then 0.01 per point up to 700000 (rating 4000), 0.003 up to 1000000 (4900), 0.002 up to 1200000 (5300), 0.001 up to 1400000 (5500), and flat 5500 above.
- **R2評価点**: 0 up to 600000, then 0.004 per point up to 900000 (1200), 0.008 up to 1500000 (6000), 0.002 up to 2000000 (7000), 0.001 up to 2400000 (7400), and flat 7400 above.
- **Rank thresholds** are as listed in decision G10.

スター性 in 本戦 can still grow from four sources, each multiplied by the 親愛度 bonus:
- the two lessons (+30 on day 2, +10 on day 5 when SP);
- round 1 (up to +120, reached at about 491667 points);
- round 2 (up to +150, at about 986667);
- the P-item H.I.Fワッペン: +10 per skill card acquired, 20 times per run, its remaining fires shown on its icon.

gakumas-tools caps スター性 at 1110 before round 2, and the maximum after round 2 is 1335 (1110 + floor(150 × 1.5)).

The 本戦 schedule is:
1. Day 1 and day 4: 授業 (class), +180 to one stat the player picks, not multiplied by the bonus; each also offers a セレクトチェンジ of a skill card.
2. Day 2 and day 5: 公開レッスン (public lessons) on a stat the player picks. The main stat gains 120 and 140 when SP (110 and 120 otherwise). One other stat (the サブ stat, random, fixed when 本戦 starts) gains 20 and 80 when SP (10 and 50 otherwise). Both gains are multiplied by that stat's bonus.
3. Day 3: 差し入れ (P80, a P-drink, a skill card) or おでかけ (−50 P, a drink, cards, a trouble card).
4. Day 6: 相談 (shop).
5. Round 1 (9 turns), an インターバル (a shop; 相談 triggers do not fire there, customisation does), round 2 (12 turns). The rounds give no parameters.

The parameter cap in 本戦 is 3000 plus the account bonus of decision G8.

The memory carries into 本戦:
- the parameters and the bonus percentages;
- the P-items held, with their growth;
- 親愛度;
- the support-card and memory formation;
- the support abilities already fired in 選抜;
- the remaining 再抽選 and 除去 counts, and the 相談 counts.

It does not carry P points, P-drinks or current stamina.

The two screenshots show the following.
- **基本情報 tab**:
  - rank badge, idol, 親愛度 as "37/37";
  - スター性 next to a pyramid icon;
  - Vo/Da/Vi with the bonus percentage under each, and stamina;
  - a 「Pアイテム」 row of square icons, each with a remaining-fires digit at its bottom right (a カスタム item also has a green growth digit);
  - a 「スキルカード」 grid, ignored per G11.
- **編成 tab**:
  - 「編成中サポートカード／メモリー」: six support tiles in a 2 × 3 grid. Each tile shows a zoomed crop of the card art, "Lv" with the level, × marks counting 凸, and a type icon.
  - four memory tiles;
  - 「発動中効果」 with the SP rate per stat;
  - removed cards and remaining counts.

Prior art for reading screenshots: gakumas-tools reads a different memory screen (contest memory) in the browser. It runs Tesseract.js OCR to find the parameter line and the 「Pアイテム」 label, uses them as anchors, measures every box as a fraction of the content width from there, and classifies icons with ONNX models. Its approach to anchoring is the one this plan follows; its models do not cover support-card art.


## Plan of Work

The work runs in six milestones. The first three are pure TypeScript with no DOM, tested with `bun test`. The fourth adds the page and its Worker. The fifth adds screenshot reading, and can be prototyped in parallel (in a separate git worktree) once Milestone 4's form exists. The sixth deploys. Before writing TypeScript, read the user-level stack note `~/.claude/docs/typescript.md`, and copy the toolchain from the sibling rather than inventing one (the `adopt-from-sibling` skill): Bun, Vite, Preact, TypeScript 7, and Oxlint with the sibling's rule set.

Milestone 1 sets up the toolchain and the arithmetic that needs no card data.
- The sibling's `package.json` scripts `test`, `type-check` and `lint`, its `tsconfig.json` and its `oxlint.config.ts` are copied in, with only the tools those scripts run (decision G19). The type check and the tests pass only once `src/` holds a module and a test (`Surprises & Discoveries`).
- `src/engine/rating.ts` exports the rank table, `rating(params, star, r1Rating, r2Rating)`, and `requiredTotal(rankRating, finalStar)`: the smallest integer P meeting G2's inequality, never below 0 (G17).
- `src/engine/star.ts` exports `bestFinalStar({ star, affection, wappenLeft })`:
  - It adds floor(30 × m) and floor(10 × m) for the lessons, floor(10 × m) per remaining ワッペン fire and floor(120 × m) for round 1, then caps at 1110.
  - It then adds floor(150 × m) for round 2. Here m = 1 + the 親愛度 bonus, applied in integers (G18).
  - For 親愛度 below 37, the level rises during 本戦: 34 after day 6, 35 after the recovery event before round 1, 36 after winning round 1. Which rise comes before which gain is open item O5. Until it is answered, the lessons use the memory's level and every later gain uses Lv36 or above (G16). Only the 37 case is confirmed by the 1335 figure.
- `src/engine/schedule.ts` exports `bestScheduleGain(memory, cap)`:
  - It tries every placement of the two lessons (3 × 3), the two 授業 (3 × 3) and each lesson's サブ stat (2 × 2), 324 in all, and keeps the highest total. On a tie it keeps the first placement, trying the stats in the order Vo, Da, Vi.
  - Each lesson gain is floor(base × (1 + bonus)), computed in integers (G18); see open item O4.
  - Each stat is capped at the end (all gains are positive, so capping once at the end equals capping at each gain).
  - `PLACEMENTS` and `applySchedule(memory, placement, cap)` are exported, so Milestone 3 can score every placement with the abilities added.
- The milestone ends when the tests below pass and print the expected numbers.

Milestone 2 makes the sibling's card data available here.
- In the sibling repository, on a feature branch from its `develop`:
  - Its build writes `dist/data/cards.v1.json`, containing `formatVersion: 1`, `levelLimits`, every card from `CARDS` as generated (held cards included), and the held cards with their reasons from `HELD`.
  - It is deterministic, with no timestamps, as the sibling's generated files are.
  - The sibling's update workflow deploys on every data change, so the file stays current.
  - Follow the sibling's own `CLAUDE.md` rules, add a test that the file round-trips the generated data, and open its pull request into `develop`.
  - Done as the sibling's pull request #57. The file's actual shape is in `Surprises & Discoveries`. The sibling's `data/card-data-file.ts` writes it, and its `docs/adr/0010` sets the versioning rule: any change to the shape of the file, or of a type it carries, bumps `CARD_DATA_FORMAT_VERSION`. The file name changes with it (`cards.v2.json`), so a new format is published beside the old one.
- In this repository:
  - `src/data/contract.ts` copies the sibling's `Card`, `ClassifiedEffect`, `ParsedTrigger`, `ItemGrant`, `LevelLimits` and `HeldCard` types (the contract of ADR 0001) from its `src/engine/types.ts`. It also copies the types those carry: `Breakpoint`, `FilterRef`, `ConditionRef`, `FilterFamily` with `FILTER_FAMILIES`, `CardType`, `Rarity`, `Plan` and `EffectKind`. The sibling's `Stat` is the same union as `src/engine/types.ts`'s, so the contract reuses that one.
  - `src/data/load.ts` parses the file `{ formatVersion, levelLimits, cards, held }` with type guards and rejects any `formatVersion` other than 1. No `as T` casts: the lint rules forbid them.
  - A test feeds it a fixture written from the sibling's real output, `src/data/fixtures/cards.v1.json` (decision G22).
- The Worker route `/data/cards.json` (decision G14) is added in Milestone 4, where the Worker is created; until then the dev server serves a local copy.

Milestone 3 counts what the deck's support abilities and P-items add in 本戦 and combines it with Milestone 1.
- `src/engine/honsen-profile.ts` holds the 本戦 route profile (G4). It has two parts.
  - The schedule-fixed counts:
    - `EndLesson` 2, all SP, each on the stat the placement chose;
    - `EndStepEventSchool` 2;
    - `EndAudition` 2;
    - `EndBeforeAuditionRefresh` 1;
    - `StartShop` 1;
    - `StartPresent` and `EndStepEventActivity` 0 or 1 by the day-3 choice;
    - `ChangeProduceCard` at least 2 (the 授業);
    - `GetProduceItem` 1 (the H.I.F応援棒 item granted after round 1);
    - `ProduceStart` 0.
  - The play-dependent counts of decision G24: P-drinks bought and acquired, deletions, and the skill-card acquisitions, changes and インターバル actions that follow the deck's remaining capped triggers.
- The same file holds the 選抜 stopgap profile of decision G27, for G3's default "fires used in 選抜".
- `src/engine/abilities.ts` ports the counting rule of the sibling's `src/engine/count.ts`: occasion count, narrowed by filters, conditions at their maximum unless lowered, then capped.
  - It is applied to remaining fires, not to fresh caps: G3 for skills, the screenshot's digit for items.
  - It drops what G15 excludes.
  - It adds drink-granting items' remaining fires to `GetProduceDrink` (G13).
  - It returns per-ability lines `{ key, cardId, effect, fires, points }`. The page derives the label from `effect` (its trigger and, for an item, its name), so the engine holds no display text.
- `bestTotal(memory, deck, items, data, panel, cap)` runs the Milestone 1 placement search, now scoring each placement with the abilities included, because lesson-stat filters make abilities depend on placement. It returns the best placement, its lines, the per-stat totals after the cap, and, per rank, `requiredTotal` and the margin.
- The milestone ends with the DMM sample deck's breakdown, which the user checks line by line as they did for the sibling's golden cards.

Milestone 4 builds the page.
- `index.html` → `src/main.tsx` renders four parts:
  - The form (G6): stats, bonus percentages, スター性, 親愛度, the cap selector of G8, six support-card slots, and the P-item list.
    - Each support-card slot holds a card picker showing the thumbnail and a level field.
    - Each P-item has its remaining fires.
  - The panel (G3, G4, G12): remaining fires per capped ability, 本戦 counts, conditions, and manual points for uncounted abilities.
  - The rank table (G10).
  - The breakdown of the best placement.
- The state lives in the URL query (as the sibling does in `src/app/url-state.ts`) so a result can be shared; only the cap selector also persists in localStorage.
- `infra/worker/` holds a Cloudflare Worker that does three things:
  - serves `dist/`;
  - serves `/img/w192/*` and `/img/w48/*` from the R2 bucket `tia-assets`, read-only, never `master/`;
  - proxies `/data/cards.json` from the sibling (G14) with a cache lifetime of one hour.
- The dev server serves images from the sibling's local `scripts/images/out/` when present, as the sibling's own dev server does.

Milestone 5 reads the screenshots. It starts as a prototype, judged against the samples, and is promoted only if every sample field is read correctly or flagged as uncertain.
- `src/reader/` (pure functions over an `ImageData`, with the canvas only at the edge):
  - Classifies a screenshot as 基本情報 or 編成.
  - Finds one anchor per screenshot: the bright square 「SP」 badges of 発動中効果 on 編成, and the スター性 pyramid on 基本情報. Each is found by colour template, with a fallback to the 「Pアイテム」 heading.
  - Measures scale as image width ÷ 720 and refuses an aspect ratio outside the phone/DMM range (G7).
  - Reads the digits (stats, bonus percentages, スター性, 親愛度, Lv, item remaining fires) by matching segmented glyphs against digit templates cut from the samples, in the style of gakumas-tools' `glyphs.js`. No OCR library and no download of a language model.
  - Counts × marks per tile.
  - Matches each support tile against the w192 thumbnails with the zoom-and-offset search of `Surprises & Discoveries`, refined around the best candidates.
  - Matches each P-item icon against G13's candidate set.
- Every read value carries a confidence. A low-confidence value is highlighted in the form, and a support tile shows its top three candidates.
- Tests run the reader over the samples (per O2) and compare with hand-written expected values.

Milestone 6 deploys.
- `wrangler.toml` for `<O3>.tia.run` under the tia-tools Cloudflare account.
- `.github/workflows/check.yml` and `deploy.yml`, adopted from the sibling with the same pinned actions and a gate comment at the top of each.
- The GitHub ruleset via the user-level `protect-github.sh` (the repository is public).
- Acceptance: the live site gives the same verdict for the DMM samples as `bun run dev` does.


## Concrete Steps

All commands run in `~/Developer/gmks-hif-final-stats` unless stated. Branch per milestone from `develop` (Git-flow; create `develop` from `main` after the first commit), merge back with a merge commit.

Milestone 1, after copying the toolchain:

    bun install
    bun test src/engine
    bun run type-check
    bun run lint

Expected: all tests pass, and the type check and lint print nothing beyond the command line and exit 0. On 2026-10-29 the output was:

    $ bun test
     30 pass
     0 fail
     136 expect() calls
    Ran 30 tests across 3 files.
    $ bun run type-check
    $ tsc --noEmit
    $ bun run lint
    $ oxlint --deny-warnings

If `bun install` hangs at "Resolving dependencies", run it with `BUN_INSTALL_CACHE_DIR` set to an empty directory. Under the Claude Code sandbox, set it to a directory under `$TMPDIR` anyway, because the sandbox cannot write Bun's global cache in `~/.bun`.

The tests to write first, each shown failing before its code exists:
- `requiredTotal(35000, 1335) === 7044`
- `requiredTotal(30000, 1335) === 4544`
- `bestFinalStar({ star: 810, affection: 37, wappenLeft: 4 }) === 1335`
- `bestFinalStar({ star: 760, affection: 37, wappenLeft: 4 }) === 1285`, and with that, `requiredTotal(35000, 1285) === 7232`
- the DMM sample's schedule-only best total of 6410 (see `Artifacts and Notes`)

Milestone 2, in the sibling (`~/Developer/gakumas-supportcards`): `bun run build`, then `jq '.formatVersion, (.cards | length)' dist/data/cards.v1.json` prints `1` and the card count (210 on 2026-10-29). Back here, `bun test src/data` passes.

To refresh the fixture from a session here, whose sandbox cannot write the sibling, generate the file with the sibling's own function. Write this script to `$TMPDIR/gen-cards.ts`, with `S` set to the sibling's checkout path, on its merged `develop`:

    import { cardDataJson } from "<S>/data/card-data-file.ts";
    import { CARDS } from "<S>/data/cards.generated.ts";
    import { HELD } from "<S>/data/held.generated.ts";
    import { LEVEL_LIMITS } from "<S>/data/levelLimits.generated.ts";
    await Bun.write(process.argv[2] ?? "", cardDataJson(CARDS, HELD, LEVEL_LIMITS));

Then run it, and compare the result with the sibling's own build output where one exists:

    cd "$TMPDIR" && bun gen-cards.ts "$TMPDIR/cards.v1.json"
    shasum -a 256 "$TMPDIR/cards.v1.json" <S>/dist/data/cards.v1.json   # same hash
    cp "$TMPDIR/cards.v1.json" src/data/fixtures/cards.v1.json            # from this repository's root

On 2026-10-29 both hashes were `b989a77e…0d8881`, and `bun test src/data` printed `16 pass, 0 fail`.

Milestone 3: `bun test src/engine` passes, and `src/engine/total.test.ts` pins the DMM breakdown in `Artifacts and Notes` line by line; the user confirms that breakdown. On 2026-10-29 `bun test` printed `94 pass, 0 fail`.

Milestone 4: `bun run dev`, open `http://localhost:5173`, and enter the DMM sample by hand. The S5 line shows "not reachable" with the shortfall, matching Milestone 3's number.

Milestone 5: `bun test src/reader` passes over the samples; in the page, dropping the two DMM screenshots fills the same form as the hand entry.

Milestone 6: push to `main` via a release merge; open the live URL and repeat Milestone 5's check.


## Validation and Acceptance

The plan is accepted when a person can open the live page, drop the two screenshots of any of the four sample sets, see every field filled (or highlighted where uncertain), correct nothing for the DMM set, and read a rank table whose S5 line agrees with the hand-checked Milestone 3 breakdown. A memory whose スター性 cannot reach 1335 must show a required total above 7044. A deck with a held support card must show 「暫定」 on a "not reachable" line until its uncounted ability is given a value.


## Idempotence and Recovery

Everything here is additive. The sibling change in Milestone 2 adds one output file and touches no published score: its snapshot check (`bun scripts/check-score-stability.ts`) must stay green. If the shared JSON is unreachable at runtime, the page still works as a manual form without card pickers and says so; it never computes with a partial card list.


## Artifacts and Notes

Worked example, the DMM sample (`temp/dmm/`), schedule part only, bonus applied with floor per gain:

    memory: Vo 1982 (37.1%)  Da 2468 (59.8%)  Vi 1050 (28.8%)  total 5500, スター性 810, 親愛度 37, ワッペン 4 left
    lessons on Da:  floor(120 × 1.598) = 191, floor(140 × 1.598) = 223          → Da 2882
    サブ on Vo:     floor(20 × 1.371) = 27,  floor(80 × 1.371) = 109           → +136
    授業 × 2:       180 + 180 to Vo or Vi (no bonus)                             → +360
    best schedule-only total: 5500 + 414 + 136 + 360 = 6410
    best final スター性: 810 + 45 + 15 + 4 × 15 + 180 → 1110, + 225 = 1335   → S5 needs 7044

The deck read from the 編成 sample (art matched, levels read by eye):
- もうすぐ本番ですね (csprt-3-0099), Lv60;
- よくやったな、倉本。 (csprt-3-0062), Lv60;
- ふわふわでワクワク (csprt-2-0007, SR), Lv50;
- なぜこんなところにッ！？ (csprt-3-0082), Lv60;
- 放っておけない気になる子 (csprt-3-0066), Lv60;
- いつまでも続けばいいのに (csprt-3-0069), Lv60.

Their 本戦-relevant abilities, from the sibling's data:
- four Dance SP-lesson-end abilities, +17, +13, +17 and +17, uncapped;
- もうすぐ本番ですね: 試験終了 Vi+37 (cap 5, condition 15+ skill cards held) and 「基本」-card チェンジ Vi+39 (cap 3; the user reports 1 left);
- ふわふわでワクワク: 試験終了 Da+17, cap 2, spent in 選抜;
- Pドリンク獲得 +5 on two cards;
- SSR card acquisition +6 on two cards;
- 放っておけない気になる子: 差し入れ +17, 相談 drink purchase +11, deletion +11;
- the items 素敵なお仕事 (Vi+25 per skill-card change while Vi ≥ 400, cap 3, 1 left) and 完全制覇でポン (Da+30 per 全力 card acquired while Da ≥ 700, cap 2, 1 left, and one P-drink per fire). This line first said 素敵なお仕事 fired on 「基本」 changes; the card data says otherwise (`Surprises & Discoveries`).

A rough total is 6410 + about 370, short of 7044. Milestone 3 replaces this estimate with the exact figure.

Milestone 1's tests were each seen to fail before the code existed, as missing modules. Each guard was then checked another way: it was broken on purpose, `bun test` ran, and the file was restored. Results, 2026-10-29:

    1110 cap removed                         RED   caps at 1110 before round 2, not after
    スター性 floor in floating point            RED   100 at +15% is 115
    later gains at the memory's own level    RED   below Lv37 … (O5)
    ワッペン limit raised to 99                RED   refuses a ワッペン count outside its 20 fires
    lesson floor in floating point           RED   120 at 2.5% is 123
    Da not capped                            RED   3 tests (near the cap, at the cap, lower cap)
    ties keep the last placement             RED   DMM sample's schedule-only best total
    サブ allowed on the main stat              RED   3 tests (324 placements, サブ ≠ main, DMM)
    requiredTotal not clamped at 0           RED   is 0, never negative
    requiredTotal floor instead of ceil      RED   4 tests (1285 → 7232, 1334 → 7048, …)
    floor(スター性 × 7.5) dropped               RED   2 rating tests
    requiredTotal round instead of ceil      green: an equivalent change. The value halved is an integer, so the result is whole or ends in .5, where Math.round and Math.ceil agree

Milestone 2's loader was written before its tests ran, so the tests were first run with `src/data/load.ts` moved aside ("Cannot find module './load.ts'"), and then with each guard broken in turn. Results, 2026-10-29:

    optional field (drinks) dropped           RED   the parsed data equals the file
    format-version check removed              RED   2 tests (another version, no version)
    empty card list allowed                   RED   refuses an empty card list
    stat read as any string                   RED   names the path of a bad value
    integer accepts NaN                       RED   refuses a fractional or non-finite number
    level row length unchecked                RED   refuses a level-limit row that is not five levels
    optional fields written as undefined      RED   the parsed data equals the file
    filter family read as any string          RED   refuses a filter family the contract does not know
    held list ignored                         RED   reads a held card with its reasons
    card keeps unknown fields                 RED   drops a field the contract does not name
    rarity not required                       RED   refuses a missing required field
    object check disabled                     RED   names a value that should be an object (added after this mutant first survived)
    integer accepts fractions                 RED   refuses a fractional or non-finite number (1.5 added after the Codex review)
    scenario dropped from triggers            RED   keeps a trigger's scenario (added after the Codex review: no real card has one)

The DMM sample's full bound, worked by hand from the card data and decisions G24 and G27 before `bestTotal` ran, and pinned by `src/engine/total.test.ts`:

    本戦 counts: 4 skill cards acquired (ワッペン 4 left), 2 changes, 12 P-drinks acquired (1 + 8 + 2 + 1 from 完全制覇でポン), 8 bought, 0 deleted, 差し入れ
    もうすぐ本番ですね      素敵なお仕事 Vi+25 × 1 (1 left)      「基本」 change Vi+39 × 1 (1 left)      exam end Vi+37 × 2 (2 left)    Vi +138
    よくやったな、倉本。     Dance SP lesson end Da+17 × 2          P-drink acquired Da+5 × 12                                            Da +94
    ふわふわでワクワク       exam end Da+17 × 0 (spent in 選抜)     Dance SP lesson end Da+13 × 2                                         Da +26
    なぜこんなところにッ！？  完全制覇でポン Da+30 × 1 (1 left)      Dance SP lesson end Da+17 × 2      SSR acquired Da+6 × 4             Da +88
    放っておけない気になる子  P-drink bought Vo+11 × 8               deletion Vo+11 × 0                 差し入れ Vo+17 × 1                Vo +105
    いつまでも続けばいいのに  Dance SP lesson end Da+17 × 2          SSR acquired Da+6 × 4              P-drink acquired Da+5 × 12        Da +118
    abilities: Vo +105, Da +326, Vi +138 = 569
    best placement: both lessons on Da (サブ on Vo), both 授業 on Vo
    Vo 1982 + 136 + 105 + 360 = 2583    Da 2468 + 414 + 326 = 3208 → 3200 (cap)    Vi 1050 + 138 = 1188
    total 6971; スター性 1335, so S5 needs 7044: not reachable, short by 73; S4+ needs 4544: reachable, 2427 to spare

Milestone 3's guards, each broken in turn under `bun test src/engine` (2026-10-29): all 22 went red.
- In the counting rule: the scenario restriction, the lesson-stat filter, the family default, stated conditions and fires left.
- In the profiles: the refresh-based drink count, the インターバル drinks, メダルもじゃ's deletions, the played-for needs, the no-normal-lesson filter and the 選抜 exam count.
- In the abilities: the パラメータボーナス+ exclusion, which first survived because every bonus effect in today's data is on プロデュース開始, and so gained its own test; unheld items, 選抜 use and ワッペン's need.
- In `bestTotal`: panel occasions, item drinks, ワッペン limited by acquisitions, the 「暫定」 mark, the tie order, manual points and the day-3 override.

After the Codex review moved the 「未計上」 entries from one per card to one per reason, two shortcuts were put back one at a time, and both went red: 「暫定」 judged by a card's first reason only, and only a card's first entry counted. The second review found two more cases, and both fixes went red when undone: a held card with an empty reason list counted as settled, and a ワッペン without a digit counted 0 fires.


## Interfaces and Dependencies

Runtime: Preact for the page; no OCR library and no ML runtime (Milestone 5 matches templates and pixels itself). Build and test: Bun, Vite, TypeScript 7, Oxlint (the sibling's configuration, per its ADR 0007). Hosting: a Cloudflare Worker with an R2 binding to `tia-assets` (read-only by code) under the tia-tools account.

Milestone 1 built these, in `src/engine/`:

    // types.ts
    export type Stat = "vocal" | "dance" | "visual";
    export const STATS: readonly Stat[];                 // Vo, Da, Vi: the order every search tries
    export interface Memory { params; bonusPermil; star; affection }   // as below
    export function sumStats(values: Record<Stat, number>): number;
    // rating.ts
    export interface Rank { rank: string; rating: number }
    export const RANKS: readonly Rank[];                 // G10, S5 first
    export const R1_RATING_CAP = 5500, R2_RATING_CAP = 7400;
    export function rating(params: Record<Stat, number>, star: number, r1Rating: number, r2Rating: number): number;
    export function requiredTotal(rankRating: number, finalStar: number): number;
    // star.ts
    export function affectionBonusPercent(level: number): number;    // RangeError outside integer 28–37
    export function boostedStar(base: number, level: number): number;
    export function bestFinalStar(input: { star: number; affection: number; wappenLeft: number }): number;   // RangeError unless wappenLeft is an integer 0–20
    // schedule.ts
    export interface LessonPlacement { main: Stat; sub: Stat }
    export interface Placement { lessons: readonly [LessonPlacement, LessonPlacement]; classes: readonly [Stat, Stat] }
    export interface ScheduleResult { placement: Placement; params: Record<Stat, number>; total: number }
    export const PLACEMENTS: readonly Placement[];       // all 324
    export function lessonGain(base: number, bonusPermil: number): number;
    export function applySchedule(memory: Memory, placement: Placement, cap: number): Record<Stat, number>;
    export function bestScheduleGain(memory: Memory, cap: number): ScheduleResult;

Milestone 2 built these, in `src/data/`:

    // contract.ts: copied from gakumas-supportcards' src/engine/types.ts at d08f3de
    export type CardType, Rarity, Plan, EffectKind;
    export const FILTER_FAMILIES; export type FilterFamily;
    export interface FilterRef, ConditionRef, ParsedTrigger, ClassifiedEffect, HeldCard, Breakpoint, ItemGrant, Card;
    export type LevelLimits = Record<Rarity, readonly [number, number, number, number, number]>;
    export const CARD_DATA_FORMAT_VERSION = 1;
    export interface CardDataFile { formatVersion: 1; levelLimits: LevelLimits; cards: readonly Card[]; held: readonly HeldCard[] }
    // load.ts
    export class CardDataError extends Error {}           // the message names the path of the first bad value
    export function parseCardData(json: unknown): CardDataFile;   // all or nothing (decision G23)

Milestone 3 built these, in `src/engine/` (the Milestone 1 exports above stand, `Memory` extended):

    // types.ts
    export interface Memory { params; bonusPermil; star; affection;
      refreshesLeft: number;               // 相談リフレッシュ回数 残り (G24)
      medalMoja: boolean }                 // the first P-item is メダルもじゃ (G24)
    export interface DeckSlot { cardId: string; level: number }
    export const WAPPEN = "wappen";
    export interface HeldItem { itemId: string; remaining?: number }   // remaining absent: the item's cap if it has one, else no limit
    export interface RankLine { rank: string; rating: number; required: number; margin: number; provisional: boolean }
    // schedule.ts (added)
    export function scheduleGains(memory: Memory, placement: Placement): Record<Stat, number>;   // before the cap
    export function capped(params: Record<Stat, number>, gains: Record<Stat, number>, cap: number): Record<Stat, number>;
    // count.ts
    export interface Counts { occasions; filters; conditions; lessons: Record<Stat, number> }   // filters: "occ.family.member" or "occ.family"
    export function conditionKey(occasion: string, c: ConditionRef): string;
    export function filterKey(occasion: string, f: FilterRef): string;
    export function occurrences(trigger: ParsedTrigger, counts: Counts, left?: number): number;
    // honsen-profile.ts
    export type Day3 = "present" | "activity";
    export const SENBATSU: Counts;                                   // G27
    export function honsenCounts(input: HonsenInput): Counts;        // G24: { refreshesLeft, medalMoja, day3, lessons, needs, itemDrinks }
    // abilities.ts
    export interface Source { key: string; cardId: string; trigger: ParsedTrigger; left?: number }
    export interface Ability extends Source { effect: ClassifiedEffect }
    export interface DrinkSource extends Source { itemId: string; perFire: number }
    export interface AbilityLine { key: string; cardId: string; effect: ClassifiedEffect; fires: number; points: number }
    export function effectsAt(card: Card, level: number): readonly ClassifiedEffect[];
    export function deckSources(deck, cards: ReadonlyMap<string, Card>, items, overrides): { abilities: Ability[]; drinks: DrinkSource[] };
    export function needs(sources: readonly Source[], wappenLeft: number): Record<string, number>;
    export function abilityLines(abilities: readonly Ability[], counts: Counts): AbilityLine[];
    export function itemDrinks(drinks: readonly DrinkSource[], counts: Counts): number;
    // total.ts
    export interface PanelState { occasions?; filters?; conditions?; left?; day3?: Day3; uncounted?: Record<string, { stat: Stat; points: number }> }   // uncounted keyed by uncountedKey
    export function uncountedKey(cardId: string, reason: number): string;   // "<cardId>#<reason index>"
    export interface BestResult { placement; day3; counts; lines: AbilityLine[]; params; total; finalStar; ranks: RankLine[]; held: HeldCard[] }
    export function bestTotal(memory: Memory, deck: readonly DeckSlot[], items: readonly HeldItem[], data: CardDataFile, panel: PanelState, cap: number): BestResult;

`src/test-support/dmm.ts` holds the DMM sample as engine input, with the card fixture, for the tests.

Open items, carried until answered:
- O1: answered for 本戦 on 2026-10-29 (decision G24). 選抜 counts are still open; decision G27's stopgap stands in for them.
- O7: reading メダルもじゃ, a P-idol item, in the first P-item slot (decision G24). The sibling's 48 × 48 icons cover only items that support cards grant, so Milestone 5 needs its own template for it.
- O2: whether the samples may be committed as fixtures (they show the user's deck and idol, nothing else personal), or must be cropped or kept local.
- O3: the subdomain.
- O4: whether the game floors, rounds or ceils base × (1 + bonus). Settle it with one in-game lesson result before trusting margins of a point or two.
- O5: the 親愛度 level in force at each 本戦 スター性 gain below Lv37. Until it is answered, decision G16's upper-bound reading applies.
- O6: whether any trigger names a scenario token that separates 選抜 (produce-007) from 本戦 (produce-008). The sibling's `count.ts` treats a trigger of another scenario as 0. As of 2026-10-29, no trigger in the published data carries `scenario` (`Surprises & Discoveries`).


Revision note (2026-10-28): first draft, written at the end of the design interview from its scratch log; decisions G1–G13 are the user's or follow from them as marked, G14–G15 are the agent's and open to revision.

Revision note (2026-10-29): Milestone 1 implemented. Changes:
- Added decisions G16–G20: the interim 親愛度 reading, the 0 floor on the required total, integer arithmetic, the narrowed toolchain, and one board issue per milestone.
- Added three discoveries (floating-point floors, the empty-`src/` checks, newer tool versions), the Milestone 1 outcome and the mutation record.
- Recorded the modules' actual exports.
- Revised Milestone 1's text to match what was built.

Revision note (2026-10-29, later): Milestone 1 merged (#5). Milestone 2 is split in Progress into the sibling's half and this repository's half. Decision G21 records that the sibling's half runs in a session in that repository.

Revision note (2026-10-29, after the sibling's report): the sibling's pull request #57 is open. Two discoveries record the file's actual shape: held cards in a separate `held` list with `reasons`, and what a held card's entry leaves out. Milestone 2's text now names every type to copy and the sibling's versioning rule (its ADR 0010).

Revision note (2026-10-29, Milestone 2 built): the sibling's pull request #57 merged, and this repository's half is built. Changes:
- Added decisions G22 (the whole real file as the fixture) and G23 (all-or-nothing loading, unknown fields dropped).
- Added a discovery partly answering O6: no trigger carries `scenario` today.
- Added the fixture-refresh steps, the Milestone 2 outcome, the loader's mutation record and the `src/data/` exports.

Revision note (2026-10-29, Milestone 3 started): Milestone 2 merged (#7). The user answered O1 for 本戦: decisions G24–G26 record the answers and the UI rule. Decision G27 records the 選抜 stopgap. Two discoveries correct the DMM item descriptions and record what the DMM memory holds. O7 is new.

Revision note (2026-10-29, Milestone 3 built): Milestone 3's code is in place. Changes:
- Added decision G28 (smaller implementation choices) and a discovery: the DMM memory is 73 short of S5, not about 260.
- Added the DMM breakdown worked by hand, the mutation record and the Milestone 3 outcome.
- Recorded the modules' exports, and corrected Milestone 3's line shape and `bestTotal` signature to what was built.
- Its acceptance, the user's line-by-line check, is still open.

Revision note (2026-10-29, Codex review of Milestone 3): G28's 「未計上」 bullet now gives one entry per reason, each on its own stat, after the review found the per-card entry could put the bound too low. The `HeldItem` and `PanelState` lines in Interfaces now match the code.

Revision note (2026-10-29, second Codex review of Milestone 3): two edge cases added to G28. A ワッペン without a digit counts its 20 fires, and a held card with an empty reason list still gets one 「未計上」 entry.
