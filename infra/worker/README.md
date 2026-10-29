# gkms-hif-final-stats.tia.run Worker

One Cloudflare Worker serves the whole page: the built page as static assets, card thumbnails and P-item icons from the R2 bucket `tia-assets`, read only, and the sibling's card data at this origin (`docs/adr/0001`; `docs/plans/EXECPLAN_HIF_FINAL_STATS.md`, decisions G14, G31 and G34). `wrangler.toml` runs the Worker's code only for `/img/*` and `/data/cards.json` (`run_worker_first`); every other path is answered by the assets directly. `wrangler.test.ts` keeps that list equal to the paths `worker.ts` answers.

| Route | Serves |
|---|---|
| `https://gkms-hif-final-stats.tia.run/` | the page built by `bun run build` (`dist/`) |
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
| Workers, only the Worker `gkms-hif-final-stats` | **Editor** | the script and the static assets |
| Zone, only `tia.run` | **Workers Routes: Write** | the custom domain in `wrangler.toml` |

Editor can deploy and update an existing Worker but cannot create one: creating a Worker needs **Admin** at the Workers product level, and a token can name a Worker only once it exists. So the first deployment is either:
- by hand (below), by an account member with that access;
- or by `deploy.yml`, under a token that first holds product-level Workers Admin and is narrowed to Editor on this Worker after.

Changing `name` in `wrangler.toml` does not rename the deployed Worker: the next deploy creates a new one. That is a first deployment again, done in this order:
1. **Deploy the new name by hand,** as below, before anything reaches `main`. Otherwise `deploy.yml` passes every gate and then fails at `wrangler deploy`, because its token is Editor only on the old Worker and cannot create one. The new domain then stays undeployed, and the old Worker keeps serving.
2. **Move the token** to Editor on the new Worker.
3. **Release** into `main`: `deploy.yml` now deploys the new Worker.
4. **Delete the old Worker** in the dashboard. Its custom domain and DNS record go with it.

This happened once, when `gmks-hif-final-stats` became `gkms-hif-final-stats` on 2026-10-29 (issue #27).

Binding the R2 bucket needs no R2 permission: deploying a Worker never needs permissions on the resources it binds. Source: Cloudflare's [Workers roles and permissions](https://developers.cloudflare.com/workers/authorization/workers/), read 2026-10-29. If a deploy still fails with a permissions error, the message names the missing permission. Add that one, and record which.

By hand, for the first deployment or an emergency, with `bunx wrangler login` on the account that holds `tia.run`. Run from the repository root:

    bun run build
    cd infra/worker
    bunx wrangler deploy

The `custom_domain` route makes Cloudflare attach the Worker to `gkms-hif-final-stats.tia.run` and manage its DNS record. Check a configuration change without logging in or deploying:

    bunx wrangler deploy --dry-run --outdir "$TMPDIR/wrangler-out"

It prints the bindings (`env.IMAGES (tia-assets)`, `env.ASSETS`). Under the Claude Code sandbox on macOS it also reports two harmless refusals: it cannot write its log under `~/Library/Preferences/.wrangler`, and its telemetry host is refused. The log is Wrangler's own; the sandbox allows no write there.

## Verify

    curl -sI https://gkms-hif-final-stats.tia.run/ | head -3
    # -> HTTP/2 200, content-type: text/html
    curl -s https://gkms-hif-final-stats.tia.run/data/cards.json | jq '.formatVersion, (.cards | length)'
    # -> 1, then the number of cards the sibling publishes
    curl -sI https://gkms-hif-final-stats.tia.run/img/w192/img_general_csprt-3-0099_full.webp
    # -> HTTP/2 200, content-type: image/webp, cache-control: public, max-age=31536000, immutable
    curl -sI https://gkms-hif-final-stats.tia.run/img/master/img_general_csprt-3-0099_full.webp
    # -> HTTP/2 404, cache-control: no-store   (a master must be refused even where it exists)

Then open the page, drop the DMM sample's two screenshots (`src/reader/fixtures/dmm-01-kihon.png` and `dmm-01-hensei.png`), and check that it reads 6971, S5 short by 73, as `bun run dev` does (Milestone 6's acceptance).

## Tests

`bun test` at the repository root runs:
- `img.test.ts` against a fake bucket;
- `data.test.ts` and `worker.test.ts` against a fake upstream;
- `wrangler.test.ts` over this directory's `wrangler.toml`;
- `../workflows.test.ts` over the two workflows.

The workflows cannot run locally. That test pins their triggers and their read-only permissions, that every action is pinned to a commit hash and that CI runs the local Bun, and that the deploy runs every gate before it deploys.
