# gkms-hif-final-stats.tia.run Worker

One Cloudflare Worker serves the page: the built page (`bun run build` writes `dist/`) as static assets, for every path, with no code of its own and no binding. The card data and the card art and item icons come from gkms-library's address (`https://gkms-library.tia.run`), fetched by the browser (`docs/adr/0003`; `docs/plans/EXECPLAN_LIBRARY_DATA.md`, decision L5). Until 2026-11-27 the Worker also served `/img/*` from the R2 bucket `tia-assets` and passed gakumas-supportcards' `cards.v1.json` through as `/data/cards.json` (`docs/adr/0001`, now superseded). `wrangler.test.ts` pins that it has neither code nor binding.

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

The Worker keeps its name when it became assets only (2026-11-27), so the release that made it so updates the existing Worker under the same token; it is not a first deployment. If a deploy still fails with a permissions error, the message names the missing permission. Add that one, and record which.

By hand, for the first deployment or an emergency, with `bunx wrangler login` on the account that holds `tia.run`. Run from the repository root:

    bun run build
    cd infra/worker
    bunx wrangler deploy

The `custom_domain` route makes Cloudflare attach the Worker to `gkms-hif-final-stats.tia.run` and manage its DNS record. Check a configuration change without logging in or deploying:

    bunx wrangler deploy --dry-run --outdir "$TMPDIR/wrangler-out"

It prints the assets it read and `No bindings found.` Under the Claude Code sandbox on macOS it also reports two harmless refusals: it cannot write its log under `~/Library/Preferences/.wrangler`, and its telemetry host is refused. The log is Wrangler's own; the sandbox allows no write there.

## Verify

    curl -sI https://gkms-hif-final-stats.tia.run/ | head -3
    # -> HTTP/2 200, content-type: text/html
    curl -s -o /dev/null -w '%{http_code} %{content_type}\n' https://gkms-hif-final-stats.tia.run/data/cards.json
    # -> 404: no data route any more, and the assets have no such file
    curl -s https://gkms-library.tia.run/data/latest.v1.json | jq '.files[] | select(.format == "support-cards") | .path'
    # -> the release the page will fetch

Open the page with the browser's network panel: the card data (`latest.v1.json`, then `data/support-cards/v1/<release>.json`) and every image come from `gkms-library.tia.run`, and no request names `gakumas-supportcards.tia.run`. Then open the page, drop the DMM sample's two screenshots (`src/reader/fixtures/dmm-01-kihon.png` and `dmm-01-hensei.png`), and check that it reads 6971, S5 short by 73, as `bun run dev` does (the acceptance of Milestone 6 in `docs/plans/EXECPLAN_HIF_FINAL_STATS.md`).

## Tests

`bun test` at the repository root runs:
- `wrangler.test.ts` over this directory's `wrangler.toml`;
- `../workflows.test.ts` over the two workflows.

The workflows cannot run locally. That test pins their triggers and their read-only permissions, that every action is pinned to a commit hash and that CI runs the local Bun, and that the deploy runs every gate before it deploys.
