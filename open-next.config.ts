import { defineCloudflareConfig } from "@opennextjs/cloudflare";

export default defineCloudflareConfig({
  // Add an incremental cache (R2/KV/D1) here later for ISR/Data Cache.
  // See https://opennext.js.org/cloudflare/caching
});
