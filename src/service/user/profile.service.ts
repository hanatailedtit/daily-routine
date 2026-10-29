import {
  UserProfileDto,
  UserProfileReqDto,
} from "@/model/user/user-profile.dto"
import {
  getUserProfile,
  insertUserProfile,
  updateUserProfile,
} from "@/repository/user/profile.repository"

export const updateUserProfileService = async (
  id: UserProfileDto["id"],
  profile: UserProfileReqDto
) => {
  await updateUserProfile(
    id,
    profile.user_name === undefined
      ? profile
      : {
          ...profile,
          user_name: normalizeUserName(profile.user_name),
        }
  )
}

function normalizeUserName(name: string) {
  const value = name.trim()
  if (!value || value.length > 60)
    throw new Error("닉네임은 1~60자로 입력해 주세요.")
  return value
}

export const createUserProfileService = async (
  id: UserProfileDto["id"],
  name: string,
  image: string | null
) => {
  const userName = normalizeUserName(name)
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
