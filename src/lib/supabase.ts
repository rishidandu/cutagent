import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let serviceClient: SupabaseClient | null = null;

/**
 * Get a Supabase client with service-role privileges (bypasses RLS).
 * Used in API routes where NextAuth handles auth separately.
 */
export function getServiceSupabase(): SupabaseClient {
  if (serviceClient) return serviceClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    throw new Error("Supabase not configured");
  }

  serviceClient = createClient(url, key, {
    auth: { persistSession: false },
  });
  return serviceClient;
}

/**
 * Check if Supabase is configured (env vars present).
 * Used for graceful degradation — when false, app falls back to localStorage.
 */
export function isSupabaseConfigured(): boolean {
  return !!(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
    process.env.SUPABASE_SERVICE_ROLE_KEY
  );
}
