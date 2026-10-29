import { createClient } from "@supabase/supabase-js"
const url = import.meta.env.VITE_SUPABASE_URL
const key =
  import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  import.meta.env.VITE_SUPABASE_ANON_KEY
export const isSupabaseConfigured = Boolean(url && key)
export default createClient(
  url || "https://not-configured.supabase.co",
  key || "missing-public-key",
  {
    auth: {
      // Keep the OAuth callback in the router history so Back can protect drafts.
      flowType: "pkce",
      persistSession: isSupabaseConfigured,
      detectSessionInUrl: isSupabaseConfigured,
    },
  }
)
