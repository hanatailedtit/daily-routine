import {
  UserProfileDto,
  UserProfileReqDto,
} from "@/model/user/user-profile.dto"
import {
  getUserProfile,
  insertUserProfile,
  updateUserProfile,
} from "@/repository/user/profile.repository"

export const selectUserProfileService = async (id: UserProfileDto["id"]) => {
  const data = await getUserProfile(id)
  return data
}

export const updateUserProfileService = async (
  id: UserProfileDto["id"],
  profile: UserProfileReqDto
) => {
  await updateUserProfile(id, profile)
}

export const createUserProfileService = async (
  id: UserProfileDto["id"],
  name: string,
  image: string | null
) => {
  const userName = name.trim()
  if (!userName || userName.length > 60)
    throw new Error("닉네임은 1~60자로 입력해 주세요.")
  const existing = await getUserProfile(id)
  if (existing) return existing
  try {
    await insertUserProfile(id, userName, image)
  } catch (error) {
    // A lost response or another tab may have already created this profile.
    const saved = await getUserProfile(id)
    if (saved) return saved
    throw error
  }
  return { id, user_name: userName, user_image: image }
}
