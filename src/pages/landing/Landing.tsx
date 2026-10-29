import { useEffect, useState } from "react"
import { useNavigate } from "react-router-dom"
import { Check } from "lucide-react"
import googleLogo from "@/assets/images/logo/google-logo.png"
import Brand from "@/components/shared/Brand"
import { Button } from "@/components/ui/button"
import { signInWithGoogle } from "@/supabase/auth"
import supabase, { isSupabaseConfigured } from "@/supabase/init"

export default function Landing() {
  const navigate = useNavigate()
  const [pending, setPending] = useState(false)
  const [error, setError] = useState(() =>
    new URLSearchParams(window.location.hash.slice(1)).has("error") ||
    new URLSearchParams(window.location.search).has("error")
      ? "Google 인증을 완료하지 못했어요. 다시 시도해 주세요."
      : ""
  )
  useEffect(() => {
    if (!isSupabaseConfigured) return
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (error)
          setError("로그인 상태를 확인하지 못했어요. 다시 로그인해 주세요.")
        if (data.session) navigate("/todo-page", { replace: true })
      })
      .catch(() => setError("연결을 확인하고 다시 로그인해 주세요."))
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) navigate("/todo-page", { replace: true })
    })
    return () => data.subscription.unsubscribe()
  }, [navigate])
  const login = async () => {
    setPending(true)
    setError("")
    try {
      await signInWithGoogle()
    } catch {
      setError("Google 로그인에 연결하지 못했어요. 다시 시도해 주세요.")
      setPending(false)
    }
  }
  return (
    <main className="min-h-screen bg-white p-4 lg:p-8">
      <div className="relative mx-auto min-h-[calc(100dvh-2rem)] max-w-[1600px] lg:min-h-[calc(100dvh-4rem)]">
        <section className="flex flex-col px-2 lg:min-h-[calc(100dvh-4rem)] lg:w-1/2 lg:rounded-[32px] lg:bg-accent lg:px-12 lg:py-10">
          <div className="pt-3 lg:p-0">
            <Brand />
          </div>
          <div className="mt-10 lg:mt-16">
            <h1 className="text-[32px] font-bold leading-[1.3] tracking-[-0.02em] min-[390px]:text-[36px] lg:text-[56px]">
              작은 완료가
              <br />
              좋은 하루를<span className="lg:hidden"> </span>
              <br className="hidden lg:block" />
              만들어요.
            </h1>
            <p className="mt-5 text-base text-muted-foreground lg:mt-6 lg:text-[17px]">
              할 일을 나누고, 내 속도로 차근차근 이어가요.
            </p>
          </div>
          <section
            className="mt-9 flex flex-col justify-center lg:absolute lg:inset-y-0 lg:right-0 lg:mt-0 lg:w-1/2 lg:px-[7.5%] lg:py-16"
            aria-labelledby="login-title"
          >
            <div>
              <h2
                id="login-title"
                className="hidden text-[40px] font-bold leading-tight tracking-tight lg:block"
              >
                나의 루틴을
                <br />
                이어가요
              </h2>
              <p className="mt-8 hidden text-muted-foreground lg:block">
                Google 계정으로 로그인하고 할 일을 관리해요.
              </p>
              <Button
                variant="outline"
                className="h-14 w-full gap-4 lg:mt-12 rounded-2xl border-[#6b7684] bg-white text-[17px]"
                disabled={pending || !isSupabaseConfigured}
                onClick={login}
              >
                <img src={googleLogo} alt="" className="size-6" />
                {pending ? "Google로 연결 중…" : "Google로 계속하기"}
              </Button>
              {error && (
                <p role="alert" className="mt-4 text-sm text-destructive">
                  {error}
                </p>
              )}
              {!isSupabaseConfigured && (
                <p role="status" className="mt-4 text-sm text-muted-foreground">
                  로그인 연결 설정이 필요해요. .env.example을 참고해 Supabase
                  공개 키를 설정해 주세요.
                </p>
              )}
              <p className="mt-7 text-center text-[13px] text-muted-foreground">
                처음이라면 회원 정보를 입력한 뒤 시작해요.
              </p>
            </div>
            <p className="hidden font-semibold text-muted-foreground lg:absolute lg:bottom-10 lg:block">
              Daily Routine
            </p>
          </section>
          <div className="-mx-2 mt-9 rounded-lg lg:mx-0 bg-accent p-6 lg:mt-10 lg:bg-white lg:p-7">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold">나의 할 일</h2>
              <span className="rounded-sm bg-background px-5 py-1 text-[13px] text-muted-foreground">
                예시
              </span>
            </div>
            <p className="mt-6 text-muted-foreground">8개 중 3개 완료</p>
            <div className="mt-4 flex gap-2" aria-label="예시 완료율 37.5%">
              {Array.from({ length: 8 }, (_, i) => (
                <span
                  key={i}
                  className={`h-2 flex-1 rounded-full ${
                    i < 3 ? "bg-completion" : "bg-white lg:bg-background"
                  }`}
                />
              ))}
            </div>
            <ul className="mt-7 border-t">
              {[
                "서비스 화면 구조 정리",
                "책 20쪽 읽고 메모하기",
                "주간 회의 내용 정리",
              ].map((label, i) => (
                <li
                  key={label}
                  className="flex items-center gap-4 py-5 [&:not(:last-child)]:border-b"
                >
                  <span
                    aria-hidden="true"
                    className={`flex size-[22px] shrink-0 items-center justify-center rounded-[6px] border ${
                      i === 2
                        ? "border-completion bg-completion text-white"
                        : "border-[#6b7684]"
                    }`}
                  >
                    {i === 2 && <Check size={17} />}
                  </span>
                  <span
                    className={
                      i === 2
                        ? "text-muted-foreground line-through"
                        : "font-medium"
                    }
                  >
                    {label}
                  </span>
                </li>
              ))}
            </ul>
          </div>
          <p className="mt-9 pb-5 text-center text-sm text-muted-foreground lg:mt-auto lg:pb-0 lg:pt-10 lg:text-left lg:text-[15px]">
            할 일 관리 · 하위 할 일 · 통계
          </p>
        </section>
      </div>
    </main>
  )
}
