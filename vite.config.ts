import { createReadStream, existsSync } from "node:fs";
import { join } from "node:path";
import preact from "@preact/preset-vite";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";
import { CARD_DATA_ROUTE } from "./infra/worker/data.ts";
import { imageKey } from "./infra/worker/img.ts";

/** The gakumas-supportcards checkout the dev server borrows from; by default beside this one. */
const SIBLING = process.env["SUPPORTCARDS_DIR"] ?? join(import.meta.dirname, "../gakumas-supportcards");

/**
 * What the Worker answers in production, from local files: the card data from the sibling's
 * built file when there is one, else this repository's fixture, and `/img/*` from the sibling's
 * extracted image library, under the Worker's own `imageKey` rule.
 */
function localFile(path: string): { file: string; type: string } | null {
  if (path === CARD_DATA_ROUTE) {
    const built = join(SIBLING, "dist/data/cards.v1.json");
    return { file: existsSync(built) ? built : join(import.meta.dirname, "src/data/fixtures/cards.v1.json"), type: "application/json; charset=utf-8" };
  }
  const key = imageKey(path);
  const file = key === null ? null : join(SIBLING, "scripts/images/out", key);
  return file !== null && existsSync(file) ? { file, type: "image/webp" } : null;
}

/** Dev server only: the Worker's routes from local files (infra/worker/worker.ts in production). */
function localWorker(): Plugin {
  return {
    name: "local-worker",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const found = localFile((req.url ?? "").split("?")[0] ?? "");
        if (found === null) return next();
        res.setHeader("Content-Type", found.type);
        createReadStream(found.file).pipe(res);
      });
    },
  };
}

export default defineConfig({
  plugins: [preact(), tailwindcss(), localWorker()],
});
