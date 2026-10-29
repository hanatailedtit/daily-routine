import { useEffect, useRef, useState } from "react"
import type { Session, User } from "@supabase/supabase-js"
import {
  Link,
  Navigate,
  Outlet,
  useLocation,
  useNavigate,
} from "react-router-dom"
import { useRecoilRefresher_UNSTABLE, useRecoilValueLoadable } from "recoil"
import {
  Folder,
  LayoutGrid,
  ChartNoAxesColumn,
  LogOut,
  Menu,
  Plus,
} from "lucide-react"
import { userProfileSelector } from "@/recoil/user/user-selectors"
import supabase, { isSupabaseConfigured } from "@/supabase/init"
import { singOutForSite } from "@/supabase/auth"
import { useWorkspaceData } from "@/hooks/useWorkspace"
import { selectTodoCategoryService } from "@/service/todo/todo-category.service"
import Brand from "@/components/shared/Brand"
import Avatar from "@/components/shared/Avatar"
import Loading from "@/components/shared/Loading"
import AuthHeader from "@/components/shared/AuthHeader"
import CategoryForm from "@/components/shared/CategoryForm"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export default function DefaultLayout() {
  const [user, setUser] = useState<User | null>()
  const currentUserId = useRef<string | null>()
  const refresh = useRecoilRefresher_UNSTABLE(userProfileSelector)
  const navigate = useNavigate()
  const authCode = new URLSearchParams(useLocation().search).get("code")
  useEffect(() => {
    let active = true
    const applySession = (session: Session | null) => {
      if (!active) return
      const nextUser = session?.user || null
      if (currentUserId.current !== nextUser?.id) {
        currentUserId.current = nextUser?.id
        refresh()
      }
      setUser(nextUser)
    }
    if (!isSupabaseConfigured) {
      setUser(null)
      return
    }
    supabase.auth
      .getSession()
      .then(({ data, error }) => {
        if (!active) return
        if (error) throw error
        if (data.session && authCode) {
          const callback = new URL(window.location.href)
          callback.searchParams.delete("code")
          navigate(`${callback.pathname}${callback.search}${callback.hash}`, {
            replace: true,
          })
        }
        applySession(data.session)
      })
      .catch(() => {
        if (active) applySession(null)
      })
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      applySession(session)
    })
    return () => {
      active = false
      data.subscription.unsubscribe()
    }
  }, [refresh, navigate, authCode])
  if (user === undefined) return <Loading />
  if (!user) return <Navigate to="/" replace />
  return <ProfileGate key={user.id} user={user} />
}

function ProfileGate({ user }: { user: User }) {
  const profile = useRecoilValueLoadable(userProfileSelector)
  const refresh = useRecoilRefresher_UNSTABLE(userProfileSelector)
  const { pathname } = useLocation()
  if (profile.state === "loading") return <Loading />
  if (profile.state === "hasError")
    return (
      <div className="min-h-dvh">
        <AuthHeader />
        <main className="mx-auto max-w-lg px-6 py-16 text-center">
          <h1 className="page-title">프로필을 불러오지 못했어요</h1>
          <p className="page-description">
            연결을 확인하고 다시 시도해 주세요.
          </p>
          <Button className="mt-6" onClick={refresh}>
            다시 시도
          </Button>
        </main>
      </div>
    )
  if (!profile.contents)
    return pathname === "/sign-up" ? (
      <Outlet context={user} />
    ) : (
      <Navigate to="/sign-up" replace />
    )
  return pathname === "/sign-up" ? (
    <Navigate to="/todo-page" replace />
  ) : (
    <WorkspaceLayout />
  )
}

function WorkspaceLayout() {
  const workspace = useWorkspaceData()
  const {
    profile,
    todos,
    categories,
    error,
    loading,
    reload,
    setError,
    mutate,
    refreshProfile,
    busy,
  } = workspace
  const location = useLocation()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)
  const [adding, setAdding] = useState(false)
  const activeCategory = new URLSearchParams(location.search).get("category_id")
  const isMyPage = location.pathname === "/my-page"
  const navigationKey = `${location.pathname}:${activeCategory || ""}`
  useEffect(() => {
    setMobileOpen(false)
    document.getElementById("main-content")?.focus({ preventScroll: true })
    window.scrollTo(0, 0)
  }, [navigationKey])
  if (!profile) return null
  const linkStyle = (active: boolean) =>
    cn(
      "flex min-h-12 min-w-0 items-center gap-3 rounded-md px-3 text-muted-foreground transition-colors hover:bg-muted",
      active && "bg-accent font-semibold text-primary"
    )
  const navigation = (
    <div className="flex h-full flex-col bg-white p-4">
      <div className="px-2 pb-10 pt-3">
        <Brand />
      </div>
      <p className="mb-5 px-3 text-[13px] text-muted-foreground">
        나의 워크스페이스
      </p>
      <nav aria-label="주 메뉴" className="space-y-3">
        <Link
          to="/todo-page"
          className={linkStyle(!isMyPage && !activeCategory)}
          aria-current={!isMyPage && !activeCategory ? "page" : undefined}
        >
          <LayoutGrid size={22} />
          전체 할 일
          <span className="ml-auto rounded-sm bg-background px-2 text-[13px]">
            {todos.length}
          </span>
        </Link>
        <Link
          to="/my-page"
          aria-current={isMyPage ? "page" : undefined}
          className={linkStyle(isMyPage)}
        >
          <ChartNoAxesColumn size={22} />
          마이페이지
        </Link>
      </nav>
      <div className="mx-3 my-8 border-t" />
      <p className="mb-3 px-3 text-[13px] text-muted-foreground">카테고리</p>
      <nav
        aria-label="카테고리"
        className="max-h-[40vh] space-y-2 overflow-y-auto"
      >
        {categories.map((category) => (
          <Link
            key={category.id}
            to={`/todo-page?category_id=${category.id}`}
            aria-current={
              !isMyPage && activeCategory === String(category.id)
                ? "page"
                : undefined
            }
            className={linkStyle(
              !isMyPage && activeCategory === String(category.id)
            )}
          >
            <Folder size={22} />
            <span className="truncate">{category.name}</span>
            <span className="ml-auto text-[13px]">
              {todos.filter((todo) => todo.category_id === category.id).length}
            </span>
          </Link>
        ))}
      </nav>
      <Button
        variant="ghost"
        className="mt-3 justify-start gap-3 text-muted-foreground"
        onClick={() => setAdding(true)}
        disabled={busy}
      >
        <Plus size={20} />
        카테고리 추가
      </Button>
      <div className="mt-auto pt-12">
        <div className="mx-3 mb-6 border-t" />
        <Link
          to="/my-page"
          className="flex items-center gap-3 rounded-md px-3 py-2"
        >
          <Avatar
            key={profile.user_image}
            name={profile.user_name}
            src={profile.user_image}
          />
          <div className="min-w-0">
            <p className="truncate font-semibold">{profile.user_name}</p>
            <p className="text-xs text-muted-foreground">프로필 · 마이페이지</p>
          </div>
        </Link>
        <Button
          variant="ghost"
          className="mb-[env(safe-area-inset-bottom)] mt-6 w-full justify-start gap-3 text-muted-foreground"
          disabled={busy}
          onClick={async () => {
            try {
              await singOutForSite()
              refreshProfile()
              navigate("/", { replace: true })
            } catch {
              setError("로그아웃하지 못했어요. 다시 시도해 주세요.")
            }
          }}
        >
          <LogOut size={20} />
          로그아웃
        </Button>
      </div>
    </div>
  )
  return (
    <div className="workspace min-h-screen">
      <a
        href="#main-content"
        className="skip-link sr-only fixed left-4 top-4 z-50 rounded-md bg-white p-4 focus:not-sr-only"
      >
        본문으로 이동
      </a>
      <aside className="fixed inset-y-0 left-0 z-20 hidden w-60 border-r lg:block">
        {navigation}
      </aside>
      <Dialog open={mobileOpen} onOpenChange={setMobileOpen}>
        <DialogContent className="inset-y-0 left-0 h-dvh max-h-none w-[304px] max-w-[85vw] translate-x-0 translate-y-0 overflow-auto rounded-none p-0">
          <DialogTitle className="sr-only">메뉴</DialogTitle>
          <DialogDescription className="sr-only">
            페이지와 카테고리를 선택해요.
          </DialogDescription>
          {navigation}
        </DialogContent>
      </Dialog>
      <div className="lg:pl-60">
        <header className="workspace-header flex h-[72px] items-center justify-between border-b bg-white px-4 lg:h-20 lg:px-12">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              className="size-11 lg:hidden"
              aria-label="메뉴 열기"
              onClick={() => setMobileOpen(true)}
            >
              <Menu />
            </Button>
            <p className="text-muted-foreground">
              {isMyPage ? "마이페이지" : "할 일 관리"}
            </p>
          </div>
          <Link
            to="/my-page"
            aria-label="마이페이지"
            className="flex size-11 items-center justify-center"
          >
            <Avatar
              key={profile.user_image}
              name={profile.user_name}
              src={profile.user_image}
            />
          </Link>
        </header>
        <main
          id="main-content"
          tabIndex={-1}
          className="workspace-main mx-auto max-w-[1440px] px-4 py-6 outline-none sm:px-6 lg:px-12 lg:py-10"
        >
          {error && (
            <div
              role="alert"
              className="workspace-error mb-6 flex flex-wrap items-center justify-between gap-3 rounded-md border border-destructive/30 bg-white p-4"
            >
              <p className="text-destructive">{error}</p>
              <Button
                variant="secondary"
                onClick={() => {
                  setError("")
                  reload().catch(() =>
                    setError("다시 불러오지 못했어요. 연결을 확인해 주세요.")
                  )
                }}
              >
                다시 불러오기
              </Button>
            </div>
          )}
          {loading ? <Loading /> : <Outlet context={workspace} />}
        </main>
      </div>
      {adding && (
        <CategoryForm
          onClose={() => setAdding(false)}
          onSave={(name) =>
            mutate(async () => {
              await selectTodoCategoryService({ name, user_id: profile.id })
            })
          }
        />
      )}
    </div>
  )
}
