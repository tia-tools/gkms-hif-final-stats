/**
 * `/data/cards.json`: the card file gakumas-supportcards publishes, fetched server-side and passed
 * through at this app's own origin (decision G14), so the sibling's Worker needs no CORS change.
 * Pure request → response over an upstream fetcher passed in, so it runs under `bun test`.
 */

/** Where the page asks for the card data. */
export const CARD_DATA_ROUTE = "/data/cards.json";
/** The sibling's published file; its name carries the format version (its docs/adr/0010). */
export const CARD_DATA_SOURCE = "https://gakumas-supportcards.tia.run/data/cards.v1.json";
/** The sibling's data changes at most a few times a day; an hour keeps a new card's wait short. */
export const CARD_DATA_CACHE = "public, max-age=3600";

function unavailable(): Response {
  return new Response("Card data unavailable", { status: 502, headers: { "Cache-Control": "no-store" } });
}

export async function serveCardData(request: Request, fetchUpstream: (url: string) => Promise<Response>): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  let upstream: Response;
  try {
    upstream = await fetchUpstream(CARD_DATA_SOURCE);
  } catch {
    return unavailable();
  }
  if (!upstream.ok) return unavailable();
  const headers = { "Content-Type": "application/json; charset=utf-8", "Cache-Control": CARD_DATA_CACHE };
  return new Response(request.method === "HEAD" ? null : upstream.body, { status: 200, headers });
}
