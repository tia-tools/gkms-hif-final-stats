/**
 * `/img/*`: card thumbnails and P-item icons, read from the R2 bucket `tia-assets` that
 * gakumas-supportcards fills (docs/adr/0001). This app only reads it. Pure request → response over
 * a bucket passed in, so it runs under `bun test` with a fake bucket. The bucket type is the slice
 * of Cloudflare's R2Bucket this handler uses, which keeps the Workers type package out of the
 * project. The code is gakumas-supportcards' infra/worker/img.ts at d08f3de, unchanged.
 */

export interface StoredImage {
  httpEtag: string;
  size: number;
}
export interface StoredImageBody extends StoredImage {
  body: ReadableStream;
}
export interface ImageBucket {
  head(key: string): Promise<StoredImage | null>;
  get(key: string): Promise<StoredImageBody | null>;
}

/**
 * Only the public renditions are ever looked up: card thumbnails under `w192/` and P-item icons
 * under `w48/`, file names the game's own (`img_general_{assetId}_full.webp` for a card,
 * `img_general_pitem_{r}-{nnn}.webp` for an item). The lossless originals sit in the same bucket
 * under `master/` and are never reachable from here (plan Milestone 4).
 */
const IMAGE_PATH = /^\/img\/((?:w192\/img_general_csprt-\d-\d{4}_full|w48\/img_general_pitem_\d-\d{3})\.webp)$/;

/** Filenames never change meaning, so a served image is cacheable forever. */
export const IMMUTABLE = "public, max-age=31536000, immutable";

/** The bucket key for a request path, or null when the path is not a library image. */
export function imageKey(pathname: string): string | null {
  return IMAGE_PATH.exec(pathname)?.[1] ?? null;
}

/** A miss is never cached, so an image the sibling uploads later shows at once. */
function notFound(): Response {
  return new Response("Not found", { status: 404, headers: { "Cache-Control": "no-store" } });
}

function imageHeaders(image: StoredImage): Headers {
  return new Headers({ "Content-Type": "image/webp", "Cache-Control": IMMUTABLE, ETag: image.httpEtag });
}

export async function serveImage(request: Request, bucket: ImageBucket): Promise<Response> {
  if (request.method !== "GET" && request.method !== "HEAD") {
    return new Response("Method not allowed", { status: 405, headers: { Allow: "GET, HEAD" } });
  }
  const key = imageKey(new URL(request.url).pathname);
  if (key === null) return notFound();

  if (request.method === "HEAD") {
    const meta = await bucket.head(key);
    if (meta === null) return notFound();
    const headers = imageHeaders(meta);
    headers.set("Content-Length", String(meta.size));
    return new Response(null, { status: 200, headers });
  }

  const object = await bucket.get(key);
  if (object === null) return notFound();
  const headers = imageHeaders(object);
  if (request.headers.get("If-None-Match") === object.httpEtag) return new Response(null, { status: 304, headers });
  return new Response(object.body, { status: 200, headers });
}
