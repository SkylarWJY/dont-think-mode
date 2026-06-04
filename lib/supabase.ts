import { createClient, SupabaseClient } from "@supabase/supabase-js";

// Configured at build time via Vercel env vars. The anon key is public by
// design (Row-Level Security gates access). When unset, cloud sync is simply
// unavailable and the app stays fully local — nothing breaks.
const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

export const supabaseConfigured = !!(url && anon);

export const supabase: SupabaseClient | null = supabaseConfigured
  ? createClient(url as string, anon as string, {
      auth: { persistSession: true, autoRefreshToken: true },
    })
  : null;
