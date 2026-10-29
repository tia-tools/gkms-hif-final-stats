import { describe, expect, test } from "bun:test";
import { CARD_DATA_ROUTE } from "./data.ts";

const config: unknown = Bun.TOML.parse(await Bun.file(new URL("./wrangler.toml", import.meta.url)).text());

function table(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("not a table");
  return Object.fromEntries(Object.entries(value));
}

const root = table(config);

describe("wrangler.toml", () => {
  test("deploys the Worker on its own tia.run subdomain (G34)", () => {
    expect(root["name"]).toBe("gmks-hif-final-stats");
    expect(root["routes"]).toEqual([{ pattern: "gmks-hif-final-stats.tia.run", custom_domain: true }]);
  });

  test("runs the Worker first exactly on the paths worker.ts answers, and serves dist/ for the rest", () => {
    const assets = table(root["assets"]);
    expect(assets["directory"]).toBe("../../dist");
    expect(assets["binding"]).toBe("ASSETS");
    expect(assets["run_worker_first"]).toEqual(["/img/*", CARD_DATA_ROUTE]);
  });

  test("binds the sibling's bucket as IMAGES, the name the Worker's Env reads", () => {
    expect(root["r2_buckets"]).toEqual([{ binding: "IMAGES", bucket_name: "tia-assets" }]);
  });

  // An [env.*] table inherits the top-level routes, custom domain included: deployed, it would offer
  // to move the production hostname onto itself (the TypeScript stack note, § Cloudflare Workers
  // deployment). Every environment must declare its own routes.
  test("every environment, if one is added, declares its own routes", () => {
    for (const [name, env] of Object.entries(table(root["env"] ?? {}))) expect({ name, routes: "routes" in table(env) }).toEqual({ name, routes: true });
  });
});
