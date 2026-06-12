import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    // Product imagery is served from Google-hosted Stitch URLs. We render with
    // `unoptimized`, so no loader runs — these patterns are for completeness.
    remotePatterns: [
      { protocol: "https", hostname: "lh3.googleusercontent.com" },
      { protocol: "https", hostname: "images.unsplash.com" },
      // Admin-uploaded product media (Supabase Storage, product-media bucket).
      { protocol: "https", hostname: "*.supabase.co" },
      // YouTube video thumbnails (admin media manager + any YT-backed media).
      { protocol: "https", hostname: "img.youtube.com" },
    ],
  },
};

export default nextConfig;

// Enables Cloudflare bindings (env, R2, KV, …) during `next dev`.
import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";
void initOpenNextCloudflareForDev();
