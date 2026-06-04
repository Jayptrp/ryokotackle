import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { SUPABASE_PUBLISHABLE_KEY } from "@/lib/supabase/client";
import type { Database } from "@/lib/database.types";

/**
 * Cookieless Supabase client for public, read-only catalog data (published rows
 * via RLS). Safe to use in `generateStaticParams` and statically-rendered pages
 * because it does not touch request cookies.
 */
export function createPublicClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    SUPABASE_PUBLISHABLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false } },
  );
}
