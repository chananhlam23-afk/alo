import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL ?? "";
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";

export const isSupabaseConfigured = Boolean(url && anonKey);

// Client-side (anon key, respects RLS) — returns null when not configured
export function createBrowserClient() {
  if (!isSupabaseConfigured) return null;
  return createClient(url, anonKey);
}

// Server-side only (service role, bypasses RLS — use with care)
export function createServiceClient() {
  if (!url || !serviceKey) return null;
  return createClient(url, serviceKey, {
    auth: { persistSession: false },
  });
}
