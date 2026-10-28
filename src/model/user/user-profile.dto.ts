export type UserProfileDto = {
  id: string
  created_at?: string
  user_name: string
  user_image: string | null
}

export type UserProfileReqDto = Partial<
  Pick<UserProfileDto, "user_name" | "user_image">
>
