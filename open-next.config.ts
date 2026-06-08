import { defineCloudflareConfig } from "@opennextjs/cloudflare";
import kvIncrementalCache from "@opennextjs/cloudflare/overrides/incremental-cache/kv-incremental-cache";
import d1NextTagCache from "@opennextjs/cloudflare/overrides/tag-cache/d1-next-tag-cache";

export default defineCloudflareConfig({
  // Serve prerendered pages from Workers KV instead of re-rendering on every
  // request (binding: NEXT_INC_CACHE_KV). This is what stops the per-request
  // CPU blow-up from RSC prefetches re-rendering static pages.
  incrementalCache: kvIncrementalCache,

  // Tag cache (D1, binding: NEXT_TAG_CACHE_D1) — required so the admin panel's
  // on-demand `revalidatePath(...)` calls actually invalidate the KV cache.
  // No `queue` is configured on purpose: it's only needed for time-based ISR,
  // and this app uses on-demand revalidation only (keeps us off Durable Objects).
  tagCache: d1NextTagCache,
});
