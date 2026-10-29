import { FormEvent, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import Avatar from "@/components/shared/Avatar"
import Stats from "@/components/shared/Stats"
import { useWorkspace } from "@/hooks/useWorkspace"
import { updateUserProfileService } from "@/service/user/profile.service"
import { getStats, getBreakdown } from "@/lib/todo"
import { readProfileImage } from "@/lib/profile-image"

function Legend() {
  return (
    <div className="flex items-center gap-5 text-[13px] text-muted-foreground">
      <span className="flex items-center gap-2">
        <span className="size-3 rounded bg-completion" />
        완료
      </span>
      <span className="flex items-center gap-2">
        <span className="pending-pattern size-3 rounded" />
        미완료
      </span>
    </div>
  )
}

export default function MyPage() {
  const { profile, todos, categories, mutate, refreshProfile, busy } =
    useWorkspace()
  const [editing, setEditing] = useState(false)
  const [name, setName] = useState(profile?.user_name || "")
  const [error, setError] = useState("")
  const [uploading, setUploading] = useState(false)
  const input = useRef<HTMLInputElement>(null)
  const stats = getStats(todos)
  const breakdown = getBreakdown(todos, categories)
  const maximum = Math.max(1, ...breakdown.dates.map((day) => day.total))
  const maximumCategory = Math.max(
    1,
    ...breakdown.categories.map((category) => category.total)
  )
  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (!name.trim()) {
      setError("이름을 입력해 주세요.")
      return
    }
    if (
      profile &&
      (await mutate(() =>
        updateUserProfileService(profile.id, { user_name: name.trim() })
      ))
    ) {
      setEditing(false)
      refreshProfile()
    } else setError("이름을 저장하지 못했어요. 다시 시도해 주세요.")
  }
  const upload = async (file?: File) => {
    if (!profile || !file) return
    setError("")
    setUploading(true)
    try {
      const data = await readProfileImage(file)
      if (
        await mutate(() =>
          updateUserProfileService(profile.id, { user_image: data })
        )
      )
        refreshProfile()
      else setError("이미지를 저장하지 못했어요. 다시 선택해 주세요.")
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "이미지를 읽지 못했어요. 다시 선택해 주세요."
      )
    } finally {
      setUploading(false)
      if (input.current) input.current.value = ""
    }
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="page-title">나의 기록</h1>
        <p className="page-description">
          내가 쌓아 온 할 일과 완료 현황을 확인해요.
        </p>
      </div>
      <section
        className="panel flex flex-wrap items-center justify-between gap-6"
        aria-label="프로필"
      >
        <div className="flex min-w-0 items-center gap-6">
          <Avatar
            key={profile?.user_image}
            name={profile?.user_name || "나"}
            src={profile?.user_image}
            large
          />
          <div className="min-w-0">
            <p className="text-[13px] text-muted-foreground">프로필</p>
            <h2 className="mt-2 break-words text-2xl font-bold">
              {profile?.user_name}
            </h2>
          </div>
        </div>
        <div className="grid w-full grid-cols-2 gap-3 sm:flex sm:w-auto sm:flex-wrap">
          <input
            ref={input}
            type="file"
            className="sr-only"
            accept="image/png,image/jpeg,image/webp,image/gif"
            aria-label="프로필 이미지 선택"
            onChange={(e) => {
              void upload(e.target.files?.[0])
            }}
          />
          <Button
            variant="secondary"
            disabled={busy || uploading}
            onClick={() => input.current?.click()}
          >
            {uploading ? (
              "이미지 저장 중…"
            ) : (
              <>
                <span className="sm:hidden">이미지 변경</span>
                <span className="hidden sm:inline">프로필 이미지 변경</span>
              </>
            )}
          </Button>
          <Button
            variant="secondary"
            disabled={busy}
            onClick={() => {
              setName(profile?.user_name || "")
              setError("")
              setEditing(true)
            }}
          >
            이름 수정
          </Button>
        </div>
      </section>
      {error && !editing && (
        <p role="alert" className="text-destructive">
          {error}
        </p>
      )}
      <Stats
        items={[
          { label: "전체 상위 할 일", value: stats.total, unit: "개" },
          { label: "완료", value: stats.complete, unit: "개" },
          { label: "미완료", value: stats.pending, unit: "개" },
          { label: "카테고리", value: categories.length, unit: "개" },
        ]}
      />
      {stats.total === 0 ? (
        <section className="panel py-16 text-center">
          <h2 className="text-xl font-bold">아직 기록이 없어요</h2>
          <p className="mt-3 text-muted-foreground">
            할 일을 추가하면 완료 현황을 여기에서 볼 수 있어요.
          </p>
        </section>
      ) : (
        <>
          <div className="grid min-w-0 gap-6 xl:grid-cols-[1fr_2fr]">
            <section className="panel">
              <h2 className="text-xl font-bold">완료 현황</h2>
              <p className="mt-2 text-[13px] text-muted-foreground">
                상위 할 일 기준
              </p>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-7">
                <div className="relative size-36">
                  <svg
                    viewBox="0 0 144 144"
                    className="size-full -rotate-90"
                    role="img"
                    aria-label={`완료율 ${stats.percent}%, 완료 ${stats.complete}개, 미완료 ${stats.pending}개`}
                  >
                    <defs>
                      <pattern
                        id="donut-pending"
                        width="7"
                        height="7"
                        patternUnits="userSpaceOnUse"
                      >
                        <rect width="7" height="7" fill="#f2f4f6" />
                        <path d="M0 7 7 0" stroke="#8b95a1" />
                      </pattern>
                    </defs>
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      fill="none"
                      stroke="url(#donut-pending)"
                      strokeWidth="20"
                    />
                    <circle
                      cx="72"
                      cy="72"
                      r="60"
                      fill="none"
                      stroke="#3182f6"
                      strokeWidth="20"
                      strokeDasharray={`${
                        (stats.percent / 100) * 376.991
                      } 376.991`}
                    />
                  </svg>
                  <div
                    aria-hidden="true"
                    className="absolute inset-0 flex flex-col items-center justify-center"
                  >
                    <strong className="text-2xl tabular-nums">
                      {stats.percent}%
                    </strong>
                    <span className="text-[13px] text-muted-foreground">
                      완료율
                    </span>
                  </div>
                </div>
                <dl className="space-y-4 text-muted-foreground">
                  <div className="flex gap-3">
                    <dt className="flex items-center gap-2">
                      <span className="size-3 rounded bg-completion" />
                      완료
                    </dt>
                    <dd>{stats.complete}개</dd>
                  </div>
                  <div className="flex gap-3">
                    <dt className="flex items-center gap-2">
                      <span className="pending-pattern size-3 rounded" />
                      미완료
                    </dt>
                    <dd>{stats.pending}개</dd>
                  </div>
                </dl>
              </div>
            </section>
            <section className="panel min-w-0">
              <div className="flex flex-wrap justify-between gap-3">
                <h2 className="text-xl font-bold">생성일별 할 일 현황</h2>
                <Legend />
              </div>
              <p className="mt-2 text-[13px] text-muted-foreground">
                생성일로 묶은 현재 상태예요. 완료일 통계와는 달라요.
              </p>
              <div
                className="mt-8 overflow-x-auto"
                tabIndex={0}
                role="region"
                aria-label="생성일별 차트, 좌우로 이동할 수 있어요"
              >
                <div className="flex h-44 min-w-full gap-2 pb-1 sm:gap-6">
                  {breakdown.dates.map((day) => (
                    <div
                      key={day.label}
                      className="flex min-w-8 flex-1 flex-col justify-end text-center sm:min-w-12"
                    >
                      <span className="mb-2 text-[13px] font-semibold">
                        {day.total}
                      </span>
                      <div
                        className="mx-auto flex w-5 flex-col overflow-hidden rounded-t-md sm:w-8"
                        style={{ height: `${(day.total / maximum) * 112}px` }}
                        aria-label={`${day.label}: 완료 ${day.complete}개, 미완료 ${day.pending}개`}
                      >
                        <div
                          className="pending-pattern"
                          style={{ flex: day.pending }}
                        />
                        <div
                          className="bg-completion"
                          style={{ flex: day.complete }}
                        />
                      </div>
                      <span className="mt-3 text-xs text-muted-foreground sm:text-[13px]">
                        {day.label.slice(5).replace("-", ".")}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <details className="mt-4 text-[13px] text-muted-foreground">
                <summary className="cursor-pointer">
                  날짜별 데이터 표 보기
                </summary>
                <table className="mt-3 w-full text-left">
                  <caption className="sr-only">
                    생성일별 현재 할 일 상태
                  </caption>
                  <thead>
                    <tr>
                      <th>생성일</th>
                      <th>완료</th>
                      <th>미완료</th>
                      <th>합계</th>
                    </tr>
                  </thead>
                  <tbody>
                    {breakdown.dates.map((day) => (
                      <tr key={day.label}>
                        <th className="py-1 font-normal">{day.label}</th>
                        <td>{day.complete}</td>
                        <td>{day.pending}</td>
                        <td>{day.total}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </details>
            </section>
          </div>
          <section className="panel">
            <div className="mb-7 flex flex-wrap justify-between gap-3">
              <h2 className="text-xl font-bold">카테고리별 현황</h2>
              <Legend />
            </div>
            <ul className="space-y-5">
              {breakdown.categories.map((category) => (
                <li
                  key={category.label}
                  className="flex flex-wrap items-center gap-4"
                >
                  <span className="w-16 break-words font-semibold text-muted-foreground">
                    {category.label}
                  </span>
                  <div
                    className="flex h-[18px] min-w-16 flex-1"
                    aria-hidden="true"
                  >
                    <div
                      className="rounded-l-md bg-completion"
                      style={{
                        width: `${
                          (category.complete / maximumCategory) * 100
                        }%`,
                      }}
                    />
                    <div
                      className="pending-pattern rounded-r-md"
                      style={{
                        width: `${(category.pending / maximumCategory) * 100}%`,
                      }}
                    />
                  </div>
                  <p className="w-full text-[13px] text-muted-foreground sm:w-56 sm:text-right">
                    완료 {category.complete} / 미완료 {category.pending} / 합계{" "}
                    {category.total}
                  </p>
                </li>
              ))}
            </ul>
          </section>
        </>
      )}
      {editing && (
        <Dialog
          open
          onOpenChange={(open) => {
            if (!open && !busy) setEditing(false)
          }}
        >
          <DialogContent>
            <DialogHeader>
              <DialogTitle>이름 수정</DialogTitle>
              <DialogDescription>
                워크스페이스에 표시할 이름을 정해요.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-5">
              <div>
                <label
                  htmlFor="profile-name"
                  className="mb-2 block font-semibold"
                >
                  이름
                </label>
                <Input
                  id="profile-name"
                  value={name}
                  maxLength={60}
                  onChange={(e) => setName(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.nativeEvent.isComposing && e.key === "Enter")
                      e.preventDefault()
                  }}
                  aria-invalid={Boolean(error)}
                  aria-describedby={error ? "profile-error" : undefined}
                />
                {error && (
                  <p
                    id="profile-error"
                    role="alert"
                    className="mt-2 text-sm text-destructive"
                  >
                    {error}
                  </p>
                )}
              </div>
              <div className="flex justify-end gap-3">
                <Button
                  type="button"
                  variant="secondary"
                  disabled={busy}
                  onClick={() => setEditing(false)}
                >
                  취소
                </Button>
                <Button disabled={busy}>
                  {busy ? "저장 중…" : "변경 저장"}
                </Button>
              </div>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
