import { describe, expect, test } from "bun:test";
import { CARD_DATA_CACHE, CARD_DATA_SOURCE, serveCardData } from "./data.ts";

const PAGE = "https://example.tia.run/data/cards.json";

function upstream(response: () => Response): ((url: string) => Promise<Response>) & { urls: string[] } {
  const urls: string[] = [];
  return Object.assign(async (url: string) => (urls.push(url), response()), { urls });
}

describe("serveCardData", () => {
  test("GET passes the sibling's file through as JSON, cacheable for an hour", async () => {
    const fetchUpstream = upstream(() => new Response('{"formatVersion":1}', { status: 200 }));
    const res = await serveCardData(new Request(PAGE), fetchUpstream);
    expect(res.status).toBe(200);
    expect(res.headers.get("Content-Type")).toBe("application/json; charset=utf-8");
    expect(res.headers.get("Cache-Control")).toBe(CARD_DATA_CACHE);
    expect(await res.text()).toBe('{"formatVersion":1}');
    expect(fetchUpstream.urls).toEqual([CARD_DATA_SOURCE]);
  });

  test("HEAD answers the same headers without a body", async () => {
    const res = await serveCardData(new Request(PAGE, { method: "HEAD" }), upstream(() => new Response("{}")));
    expect([res.status, res.headers.get("Cache-Control"), await res.text()]).toEqual([200, CARD_DATA_CACHE, ""]);
  });

  test("an upstream failure is a 502 that is never cached, so the page falls back to the manual form", async () => {
    for (const fail of [() => new Response("gone", { status: 404 }), () => new Response("oops", { status: 500 })]) {
      const res = await serveCardData(new Request(PAGE), upstream(fail));
      expect([res.status, res.headers.get("Cache-Control")]).toEqual([502, "no-store"]);
    }
  });

  test("an upstream that cannot be reached is a 502 too", async () => {
    const res = await serveCardData(new Request(PAGE), async () => {
      throw new TypeError("network down");
    });
    expect([res.status, res.headers.get("Cache-Control")]).toEqual([502, "no-store"]);
  });

  test("refuses anything but GET and HEAD without asking upstream", async () => {
    const fetchUpstream = upstream(() => new Response("{}"));
    const res = await serveCardData(new Request(PAGE, { method: "POST", body: "x" }), fetchUpstream);
    expect([res.status, res.headers.get("Allow")]).toEqual([405, "GET, HEAD"]);
    expect(fetchUpstream.urls).toEqual([]);
  });
});
