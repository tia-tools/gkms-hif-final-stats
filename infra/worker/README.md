# gmks-hif-final-stats.tia.run Worker

One Cloudflare Worker serves the whole page: the built page as static assets, card thumbnails and P-item icons from the R2 bucket `tia-assets`, read only, and the sibling's card data at this origin (`docs/adr/0001`; `docs/plans/EXECPLAN_HIF_FINAL_STATS.md`, decisions G14, G31 and G34). `wrangler.toml` runs the Worker's code only for `/img/*` and `/data/cards.json` (`run_worker_first`); every other path is answered by the assets directly. `wrangler.test.ts` keeps that list equal to the paths `worker.ts` answers.

| Route | Serves |
|---|---|
| `https://gmks-hif-final-stats.tia.run/` | the page built by `bun run build` (`dist/`) |
| `/img/w192/img_general_{assetId}_full.webp`, `/img/w48/img_general_pitem_{r}-{nnn}.webp` | a card thumbnail or a P-item icon from `tia-assets`, through `img.ts`, adopted unchanged from gakumas-supportcards; any other `/img/` path, the private `master/` prefix included, is a 404 marked `no-store` |
| `/data/cards.json` | gakumas-supportcards' `https://gakumas-supportcards.tia.run/data/cards.v1.json`, passed through with an hour's cache; a failure upstream is a 502 marked `no-store` (`data.ts`) |

Hostname policy (tia-tools convention): each app lives on its own single-level subdomain of `tia.run`. The zone's free Universal SSL certificate covers no second level.

## Deploy

Deployment is automatic: `.github/workflows/deploy.yml` runs on every push to `main` that touches the page or this directory, and on demand from the Actions tab. It runs the unit tests, the type check, the lint and the build, and deploys only when all of them pass. `main` is production; `develop` is development, and a release is a pull request from `develop` into `main`.

It needs two repository secrets, set once by a person in the repository's settings (Settings → Secrets and variables → Actions):
- `CLOUDFLARE_ACCOUNT_ID`, the tia-tools account's id;
- `CLOUDFLARE_API_TOKEN`, an **account-owned** API token (dashboard → Manage Account → Account API Tokens, on the account that holds `tia.run`). Being account-owned, it survives any person leaving. Give it the least `wrangler deploy` uses:

| Scope | Permission | Used by |
|---|---|---|
| Workers, only the Worker `gmks-hif-final-stats` | **Editor** | the script and the static assets |
| Zone, only `tia.run` | **Workers Routes: Edit** | the custom domain in `wrangler.toml` |

A Worker can be named in a token's scope only once it exists, so the first deployment is by hand (below), or the token starts with the account-wide Workers Editor and is narrowed after. This Worker only reads R2 through its binding, so no R2 permission should be needed: binding a bucket is part of the Worker's configuration. If a deploy fails with a permissions error, the message names the missing permission. Add that one, and record which.

By hand, for the first deployment or an emergency, with `bunx wrangler login` on the account that holds `tia.run`. Run from the repository root:

    bun run build
    cd infra/worker
    bunx wrangler deploy

The `custom_domain` route makes Cloudflare attach the Worker to `gmks-hif-final-stats.tia.run` and manage its DNS record. Check a configuration change without logging in or deploying:

    bunx wrangler deploy --dry-run --outdir "$TMPDIR/wrangler-out"

It prints the bindings (`env.IMAGES (tia-assets)`, `env.ASSETS`). Under the Claude Code sandbox it also reports, harmlessly, that it cannot write its log under `~/Library/Preferences/.wrangler` and that its telemetry host is refused.

## Verify

    curl -sI https://gmks-hif-final-stats.tia.run/ | head -3
    # -> HTTP/2 200, content-type: text/html
    curl -s https://gmks-hif-final-stats.tia.run/data/cards.json | jq '.formatVersion, (.cards | length)'
    # -> 1, then the number of cards the sibling publishes
    curl -sI https://gmks-hif-final-stats.tia.run/img/w192/img_general_csprt-3-0099_full.webp
    # -> HTTP/2 200, content-type: image/webp, cache-control: public, max-age=31536000, immutable
    curl -sI https://gmks-hif-final-stats.tia.run/img/master/img_general_csprt-3-0099_full.webp
    # -> HTTP/2 404, cache-control: no-store   (a master must be refused even where it exists)

Then open the page, drop the DMM sample's two screenshots (`src/reader/fixtures/dmm-01-kihon.png` and `dmm-01-hensei.png`), and check that it reads 6971, S5 short by 73, as `bun run dev` does (Milestone 6's acceptance).

## Tests

`bun test` at the repository root runs:
- `img.test.ts` against a fake bucket;
- `data.test.ts` and `worker.test.ts` against a fake upstream;
- `wrangler.test.ts` over this directory's `wrangler.toml`;
- `../workflows.test.ts` over the two workflows.

The workflows cannot run locally. That test pins their triggers and their read-only permissions, that every action is pinned to a commit hash and that CI runs the local Bun, and that the deploy runs every gate before it deploys.
