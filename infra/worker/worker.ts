/**
 * The page's Worker: the built page from the static assets, card thumbnails and P-item icons from
 * R2 (img.ts), and the sibling's card data at this origin (data.ts). Only `/img/*` and
 * `/data/cards.json` need this code; the routing of wrangler.toml, added with the deployment in
 * Milestone 6, sends just those here.
 */

import { CARD_DATA_ROUTE, serveCardData } from "./data.ts";
import { serveImage, type ImageBucket } from "./img.ts";

export interface Env {
  ASSETS: { fetch(request: Request): Promise<Response> };
  IMAGES: ImageBucket;
}

/** Cloudflare's own fetch option: keep the sibling's file in this Worker's edge cache for an hour too. */
const EDGE_CACHE: RequestInit & { cf: { cacheTtl: number } } = { cf: { cacheTtl: 3600 } };

export function route(request: Request, env: Env, fetchUpstream: (url: string) => Promise<Response>): Promise<Response> {
  const { pathname } = new URL(request.url);
  if (pathname.startsWith("/img/")) return serveImage(request, env.IMAGES);
  if (pathname === CARD_DATA_ROUTE) return serveCardData(request, fetchUpstream);
  return env.ASSETS.fetch(request);
}

export default {
  fetch(request: Request, env: Env): Promise<Response> {
    return route(request, env, (url) => fetch(url, EDGE_CACHE));
  },
};
