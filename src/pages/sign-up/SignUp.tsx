import { FormEvent, useRef, useState } from "react"
import type { User } from "@supabase/supabase-js"
import { useNavigate, useOutletContext } from "react-router-dom"
import { useRecoilRefresher_UNSTABLE } from "recoil"
import { Check, CircleAlert, UserRound } from "lucide-react"
import AuthHeader from "@/components/shared/AuthHeader"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { readProfileImage } from "@/lib/profile-image"
import { cn } from "@/lib/utils"
import { userProfileSelector } from "@/recoil/user/user-selectors"
import { createUserProfileService } from "@/service/user/profile.service"

export default function SignUp() {
  const user = useOutletContext<User>()
  const navigate = useNavigate()
  const refreshProfile = useRecoilRefresher_UNSTABLE(userProfileSelector)
  const [name, setName] = useState("")
  const [image, setImage] = useState<string | null>(
    typeof user.user_metadata.avatar_url === "string"
      ? user.user_metadata.avatar_url || null
      : null
  )
  const [imageFailed, setImageFailed] = useState(false)
  const [nameError, setNameError] = useState("")
  const [photoError, setPhotoError] = useState("")
  const [saveError, setSaveError] = useState("")
  const [pending, setPending] = useState(false)
  const [uploading, setUploading] = useState(false)
  const nameInput = useRef<HTMLInputElement>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const submitting = useRef(false)
  const validateName = () => {
    const error = !name.trim()
      ? "닉네임을 입력해 주세요."
      : name.trim().length > 60
      ? "닉네임은 60자 이하로 입력해 주세요."
      : ""
    setNameError(error)
    return !error
  }
  const upload = async (file?: File) => {
    if (!file) return
    setPhotoError("")
    setUploading(true)
    try {
      const data = await readProfileImage(file)
      setImage(data)
      setImageFailed(false)
    } catch (error) {
      setPhotoError(
        error instanceof Error
          ? error.message
          : "이미지를 읽지 못했어요. 다시 선택해 주세요."
      )
    } finally {
      setUploading(false)
      if (fileInput.current) fileInput.current.value = ""
    }
  }
  const save = async (event: FormEvent) => {
    event.preventDefault()
    if (submitting.current || uploading) return
    if (!validateName()) {
      nameInput.current?.focus()
      return
    }
    submitting.current = true
    setPending(true)
    setSaveError("")
    try {
      await createUserProfileService(user.id, name, image)
      refreshProfile()
      navigate("/todo-page", { replace: true })
    } catch {
      setSaveError(
        "가입 정보를 저장하지 못했어요. 연결을 확인하고 다시 시도해 주세요."
      )
    } finally {
      submitting.current = false
      setPending(false)
    }
  }
  return (
    <div className="flex min-h-dvh flex-col bg-white lg:bg-background">
      <AuthHeader disabled={pending || uploading} />
      <main className="mx-auto w-full max-w-[1440px] lg:grid lg:grid-cols-[minmax(0,640px)_minmax(0,560px)] lg:items-stretch lg:gap-12 lg:px-12 lg:py-14 xl:gap-16">
        <aside
          className="hidden flex-col justify-center rounded-[32px] bg-accent p-8 lg:flex xl:px-14 xl:pb-20 xl:pt-12"
          aria-labelledby="welcome-title"
        >
          <p className="text-sm font-semibold text-primary">처음 시작하기</p>
          <h2
            id="welcome-title"
            className="mt-6 text-[32px] font-bold leading-[1.5] xl:text-[40px]"
          >
            나만의 루틴을
            <br />
            시작할 준비가 됐어요.
          </h2>
          <p className="mt-6 text-base leading-[1.75] text-muted-foreground xl:text-lg">
            사용할 닉네임만 알려 주세요.
            <br />
            프로필 사진은 나중에 바꿔도 괜찮아요.
          </p>
          <ol
            aria-label="가입 단계"
            className="mt-14 min-h-40 max-w-[472px] space-y-9 rounded-lg bg-white p-6"
          >
            <li className="relative flex items-center gap-5">
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full bg-completion text-white"
                aria-hidden="true"
              >
                <Check size={20} />
              </span>
              <span className="font-semibold">Google 계정 연결</span>
              <span className="ml-auto text-sm text-muted-foreground">
                완료
              </span>
              <span
                className="absolute left-4 top-10 h-5 w-px bg-completion"
                aria-hidden="true"
              />
            </li>
            <li
              className="flex items-center gap-5 text-primary"
              aria-current="step"
            >
              <span
                className="flex size-8 shrink-0 items-center justify-center rounded-full border border-primary font-semibold"
                aria-hidden="true"
              >
                2
              </span>
              <span className="font-semibold">회원 정보 입력</span>
              <span className="ml-auto text-sm">마지막 단계</span>
            </li>
          </ol>
        </aside>
        <section
          aria-labelledby="signup-title"
          className="min-w-0 px-4 pb-[max(40px,env(safe-area-inset-bottom))] pt-10 min-[375px]:px-6 lg:rounded-lg lg:bg-white lg:p-10"
        >
          <h1 id="signup-title" className="page-title leading-[36px]">
            회원가입
          </h1>
          <p className="mt-4 text-base leading-6 text-muted-foreground lg:mt-3">
            Google 인증을 완료했어요.
            <span className="block lg:hidden">
              사용할 닉네임을 알려 주세요.
            </span>
            <span className="hidden lg:inline">
              {" "}
              내 프로필을 마무리해 주세요.
            </span>
          </p>
          <div className="mt-4 flex min-h-[76px] items-center gap-3 rounded-2xl bg-background px-4 py-[14px] lg:mt-7 lg:min-h-20 lg:py-4">
            <span
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent text-primary"
              aria-hidden="true"
            >
              <Check size={20} />
            </span>
            <div className="min-w-0">
              <p className="text-[13px] text-muted-foreground">
                Google로 인증한 계정
              </p>
              <p className="mt-1 break-words text-base font-semibold [overflow-wrap:anywhere]">
                {user.email || "연결된 Google 계정"}
              </p>
            </div>
          </div>
          <form
            noValidate
            onSubmit={save}
            className="mt-6 lg:mt-9"
            aria-busy={pending}
          >
            <fieldset disabled={pending || uploading}>
              <legend className="sr-only">회원 정보 입력</legend>
              <div className="flex items-center gap-5 lg:gap-6">
                <span
                  role="img"
                  aria-label="프로필 사진 미리보기"
                  className="flex size-16 shrink-0 items-center justify-center overflow-hidden rounded-full bg-accent text-primary lg:size-20"
                >
                  {image && !imageFailed ? (
                    <img
                      src={image}
                      alt=""
                      className="size-full object-cover"
                      onError={() => setImageFailed(true)}
                    />
                  ) : (
                    <UserRound
                      className="size-8 lg:size-10"
                      aria-hidden="true"
                    />
                  )}
                </span>
                <div className="min-w-0">
                  <p className="text-base font-semibold">
                    프로필 사진{" "}
                    <span className="ml-3 text-[13px] font-normal text-muted-foreground">
                      선택
                    </span>
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-4">
                    <Button
                      type="button"
                      variant="secondary"
                      className="h-11 rounded-xl px-6 text-base"
                      onClick={() => fileInput.current?.click()}
                    >
                      {uploading ? "사진 읽는 중…" : "사진 선택"}
                    </Button>
                    <p className="hidden text-[13px] text-muted-foreground lg:block">
                      PNG, JPG, WebP, GIF · 최대 5MB
                    </p>
                  </div>
                </div>
              </div>
              <p
                id="photo-help"
                className="mt-4 text-[13px] text-muted-foreground lg:hidden"
              >
                PNG, JPG, WebP, GIF · 최대 5MB
              </p>
              <input
                ref={fileInput}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                className="sr-only"
                tabIndex={-1}
                aria-label="프로필 사진 선택"
                aria-describedby={photoError ? "photo-error" : "photo-help"}
                onChange={(event) => void upload(event.target.files?.[0])}
              />
              {photoError && (
                <p
                  id="photo-error"
                  role="alert"
                  className="mt-3 text-sm text-destructive"
                >
                  {photoError}
                </p>
              )}
              <div className="mt-6 lg:mt-9">
                <div className="flex items-center justify-between gap-3">
                  <label
                    htmlFor="signup-name"
                    className="text-base font-semibold"
                  >
                    닉네임{" "}
                    <span className="ml-3 text-[13px] font-normal text-primary">
                      필수
                    </span>
                  </label>
                  <span
                    className="text-[13px] text-muted-foreground"
                    aria-hidden="true"
                  >
                    {name.length}/60
                  </span>
                </div>
                <Input
                  id="signup-name"
                  ref={nameInput}
                  value={name}
                  required
                  maxLength={60}
                  autoComplete="nickname"
                  placeholder="사용할 닉네임을 입력해 주세요"
                  aria-invalid={Boolean(nameError)}
                  aria-describedby={
                    nameError ? "name-error name-help" : "name-help"
                  }
                  className={cn(
                    "mt-2 h-14 rounded-md border-control px-4 text-base md:text-base",
                    nameError && "border-error-border border-[1.5px]"
                  )}
                  onBlur={validateName}
                  onChange={(event) => {
                    setName(event.target.value)
                    setNameError("")
                    setSaveError("")
                  }}
                />
                {nameError && (
                  <p
                    id="name-error"
                    role="alert"
                    className="mt-3 flex items-center gap-2 text-sm text-destructive"
                  >
                    <CircleAlert size={16} aria-hidden="true" />
                    {nameError}
                  </p>
                )}
                <p
                  id="name-help"
                  className="mt-3 text-sm text-muted-foreground"
                >
                  1~60자, 나중에 변경할 수 있어요.
                </p>
              </div>
              {saveError && (
                <p
                  role="alert"
                  className="mt-6 flex items-start gap-2 text-sm text-destructive"
                >
                  <CircleAlert
                    size={18}
                    className="mt-0.5 shrink-0"
                    aria-hidden="true"
                  />
                  {saveError}
                </p>
              )}
              <Button
                type="submit"
                size="lg"
                className={cn(
                  "mt-[60px] w-full font-bold lg:mt-11",
                  pending && "disabled:opacity-100",
                  saveError && "mt-6 lg:mt-6"
                )}
                aria-busy={pending}
              >
                {pending && (
                  <span aria-hidden="true" className="mr-2 flex gap-1">
                    {[0, 1, 2].map((i) => (
                      <span
                        key={i}
                        className="size-1 animate-pulse rounded-full bg-current"
                        style={{ animationDelay: `${i * 150}ms` }}
                      />
                    ))}
                  </span>
                )}
                {pending
                  ? "가입하는 중…"
                  : saveError
                  ? "다시 시도"
                  : "가입 완료하고 시작하기"}
              </Button>
            </fieldset>
            <p role="status" className="sr-only">
              {pending
                ? "가입 정보를 저장하고 있어요."
                : uploading
                ? "사진을 읽고 있어요."
                : ""}
            </p>
          </form>
          <p className="mt-7 text-center text-sm text-muted-foreground lg:mt-6">
            가입하면 나의 할 일로 이동해요.
          </p>
        </section>
      </main>
      <footer className="mt-auto hidden pb-10 pt-16 text-center text-sm text-muted-foreground lg:block">
        Daily Routine · 나의 하루를 차근차근
      </footer>
    </div>
  )
}
