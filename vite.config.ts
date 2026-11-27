import { createReadStream } from "node:fs";
import { join } from "node:path";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { CARD_DATA_ROUTE } from "./infra/worker/data.ts";

/** The library release this repository's tests read (src/data/fixtures/), served for the card data route. */
const CARD_DATA_FIXTURE = join(import.meta.dirname, "src/data/fixtures/support-cards.v1.json");

/**
 * Dev server only: what the Worker answers at `/data/cards.json` in production, from the fixture.
 * Images come from gkms-library's address in both (src/app/images.ts).
 */
function localWorker(): Plugin {
  return {
    name: "local-worker",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        if ((req.url ?? "").split("?")[0] !== CARD_DATA_ROUTE) return next();
        res.setHeader("Content-Type", "application/json; charset=utf-8");
        createReadStream(CARD_DATA_FIXTURE).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [preact(), tailwindcss(), localWorker()],
});
