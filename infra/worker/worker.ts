/**
 * The page's Worker: the built page from the static assets, and the card data at this origin
 * (data.ts). Only `/data/cards.json` needs this code; the routing of wrangler.toml sends just that
 * path here. Card art and item icons come from gkms-library's address, not from here
 * (docs/plans/EXECPLAN_LIBRARY_DATA.md, Milestone 3).
 */

import { CARD_DATA_ROUTE, serveCardData } from "./data.ts";

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
}

/** Cloudflare's own fetch option: keep the upstream file in this Worker's edge cache for an hour too. */
const EDGE_CACHE: RequestInit & { cf: { cacheTtl: number } } = { cf: { cacheTtl: 3600 } };

export function route(request: Request, env: Env, fetchUpstream: (url: string) => Promise<Response>): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname === CARD_DATA_ROUTE) return serveCardData(request, fetchUpstream);
  return env.ASSETS.fetch(request);
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return route(request, env, (url) => fetch(url, EDGE_CACHE));
  },
};
