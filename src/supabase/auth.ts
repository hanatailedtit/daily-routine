import supabase from "@/supabase/init"
export const signInWithGoogle = async () => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: "google",
    options: {
      redirectTo: new URL(
        "/todo-page",
        import.meta.env.VITE_SUPABASE_REDIRECT_URL || window.location.origin
      ).href,
    },
  })
  if (error) throw error
}
export const singOutForSite = async () => {
  const { error } = await supabase.auth.signOut()
  if (error) throw error
}
