import { describe, expect, test } from "bun:test";

const config: unknown = Bun.TOML.parse(await Bun.file(new URL("./wrangler.toml", import.meta.url)).text());

function table(value: unknown): Record<string, unknown> {
  if (typeof value !== "object" || value === null || Array.isArray(value)) throw new Error("not a table");
  return Object.fromEntries(Object.entries(value));
}

const root = table(config);

describe("wrangler.toml", () => {
  test("deploys the Worker on its own tia.run subdomain (G34)", () => {
    expect(root["name"]).toBe("gkms-hif-final-stats");
    expect(root["routes"]).toEqual([{ pattern: "gkms-hif-final-stats.tia.run", custom_domain: true }]);
  });

  test("serves dist/ for every path, with no code of its own and no binding (the library plan's L5)", () => {
    expect(root["main"]).toBeUndefined();
    expect(table(root["assets"])).toEqual({ directory: "../../dist" });
    expect(root["r2_buckets"]).toBeUndefined();
  });

  // An [env.*] table inherits the top-level routes, custom domain included: deployed, it would offer
  // to move the production hostname onto itself (the TypeScript stack note, § Cloudflare Workers
  // deployment). Every environment must declare its own routes.
  test("every environment, if one is added, declares its own routes", () => {
    for (const [name, env] of Object.entries(table(root["env"] ?? {}))) expect({ name, routes: "routes" in table(env) }).toEqual({ name, routes: true });
  });
});
