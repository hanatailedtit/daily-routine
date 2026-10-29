import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { useRecoilRefresher_UNSTABLE } from "recoil"
import Brand from "@/components/shared/Brand"
import { Button } from "@/components/ui/button"
import { userProfileSelector } from "@/recoil/user/user-selectors"
import { singOutForSite } from "@/supabase/auth"

export default function AuthHeader({
  disabled = false,
}: {
  disabled?: boolean
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const refresh = useRecoilRefresher_UNSTABLE(userProfileSelector)
  const navigate = useNavigate()
  return (
    <>
      <header className="flex h-[72px] items-center justify-between border-b bg-white px-5 lg:h-20 lg:px-16">
        <div
          onClickCapture={(event) => {
            if (disabled || pending) event.preventDefault()
          }}
        >
          <Brand />
        </div>
        <Button
          variant="secondary"
          className="h-11 rounded-xl px-4 text-sm lg:w-28"
          disabled={disabled || pending}
          onClick={async () => {
            setPending(true)
            setError("")
            try {
              await singOutForSite()
              refresh()
              navigate("/", { replace: true })
            } catch {
              setError("로그아웃하지 못했어요. 다시 시도해 주세요.")
            } finally {
              setPending(false)
            }
          }}
        >
          {pending ? "로그아웃 중…" : "로그아웃"}
        </Button>
      </header>
      {error && (
        <p role="alert" className="bg-white px-5 py-3 text-sm text-destructive">
          {error}
        </p>
      )}
    </>
  )
}
