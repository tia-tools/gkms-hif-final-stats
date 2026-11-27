---
status: accepted
---

# Card data and art come from gkms-library, fetched by the browser

The support card data and the images now come from gkms-library (`tia-tools/gkms-library`, `https://gkms-library.tia.run`), the service that publishes the game's data and images for every tia.run app. gakumas-supportcards no longer produces them for this app. The page fetches the library's pointer `data/latest.v1.json` and then the `support-cards` v1 release it names. It checks both with the library's own format files, copied verbatim into `src/data/` with their SHA-256 pinned in a test, and loads card art and item icons straight from the library's `img/w192/` and `img/w48/`. The library answers all of them with `access-control-allow-origin: *`, so `screenshots.ts` can still fetch and decode the images. This app's Worker therefore has no code left and serves only the built page.

The genuine alternative was to keep this Worker in between, fetching pointer and release and caching for an hour, with the images still served at this origin. It was rejected because the browser can do all of it: releases never change under their names, and the pointer may be kept five minutes. The reasons ADR 0001 gave for reading live instead of vendoring a copy still hold. The committed copies (`src/data/fixtures/support-cards.v1.json` and the image snapshot in `src/reader/fixtures/`) are read only by the tests.

Source: issue #34 and `docs/plans/EXECPLAN_LIBRARY_DATA.md` (decisions L1 and L5). Fetching in the browser was the user's choice in job #35 (answer A, 2026-11-27). The library's own plan has the step order (gkms-library `docs/plans/EXECPLAN_LIBRARY_ALONE.md`, decision L6). Checked on the dev server in Chrome on 2026-11-27: the pointer, the release and all 9 images came from the library, with no request to gakumas-supportcards.
