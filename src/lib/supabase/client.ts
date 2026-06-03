import { createBrowserClient } from "@supabase/ssr";

/**
 * Supabase publishable key (new `sb_publishable_...` format). Falls back to the
 * legacy `anon` JWT key during migration. Both are public, RLS-enforced keys
 * and safe to expose in the browser.
 * @see https://supabase.com/docs/guides/api/api-keys
 */
export const SUPABASE_PUBLISHABLE_KEY =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** Supabase client for use in Client Components (browser). */
export function createClient() {
  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_PUBLISHABLE_KEY,
  );
}
