import { UserProfileModel } from "@/model/user/user-profile.model"
import { getUserProfile } from "@/repository/user/profile.repository"
import supabase from "@/supabase/init.ts"
import { selector } from "recoil"

export const userProfileSelector = selector<UserProfileModel | null>({
  key: "userProfileSelector",
  get: async () => {
    const { data, error } = await supabase.auth.getSession()
    if (error) throw error
    return data.session ? getUserProfile(data.session.user.id) : null
  },
})
