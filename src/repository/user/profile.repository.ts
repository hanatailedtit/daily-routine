import { DB_TABLE_NAME } from "@/constants/db-table.constants"
import {
  UserProfileDto,
  UserProfileReqDto,
} from "@/model/user/user-profile.dto"
import supabase from "@/supabase/init"
export const getUserProfile = async (id: string) => {
  const { data } = await supabase
    .from(DB_TABLE_NAME.profiles)
    .select()
    .eq("id", id)
    .maybeSingle<UserProfileDto>()
    .throwOnError()
  return data
}
export const insertUserProfile = async (
  id: string,
  name: string,
  thumbnail?: string | null
) => {
  await supabase
    .from(DB_TABLE_NAME.profiles)
    .insert({ id, user_name: name, user_image: thumbnail })
    .throwOnError()
}
export const updateUserProfile = async (
  id: string,
  profile: UserProfileReqDto
) => {
  await supabase
    .from(DB_TABLE_NAME.profiles)
    .update(profile)
    .eq("id", id)
    .throwOnError()
}
