import { lazy, Suspense, useEffect, useRef, useState } from "react"
import { ArrowLeft, ChevronDown, Plus, X } from "lucide-react"
import { useBlocker, useBeforeUnload } from "react-router-dom"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import CategoryForm from "@/components/shared/CategoryForm"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog"
import Loading from "@/components/shared/Loading"
import { hasTodoContent, sanitizeTodo } from "@/lib/todo"
import { TodoItemModel } from "@/model/todo/todo-item.model"
import { TodoCategoryDto } from "@/model/todo/todo-category.dto"
const EditorInput = lazy(
  () => import("@/components/input/EditorInput/EditorInput")
)
export type EditorState = {
  mode: "new" | "edit" | "child"
  item?: TodoItemModel
}

export default function TodoEditor({
  state,
  categories,
  initialCategoryId,
  onCreateCategory,
  onClose,
  onSave,
}: {
  state: EditorState
  categories: TodoCategoryDto[]
  initialCategoryId: number | null
  onCreateCategory: (name: string) => Promise<TodoCategoryDto | null>
  onClose: () => void
  onSave: (html: string, categoryId: number | null) => Promise<boolean>
}) {
  const initial = state.mode === "edit" ? state.item?.text || "" : ""
  const [value, setValue] = useState(initial)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const [selectedCategoryId, setSelectedCategoryId] =
    useState(initialCategoryId)
  const [createdCategories, setCreatedCategories] = useState<TodoCategoryDto[]>(
    []
  )
  const [addingCategory, setAddingCategory] = useState(false)
  const [categoryPending, setCategoryPending] = useState(false)
  const addCategoryButton = useRef<HTMLButtonElement>(null)
  const availableCategories = [
    ...categories,
    ...createdCategories.filter(
      (created) => !categories.some((category) => category.id === created.id)
    ),
  ]
  const categoryName =
    availableCategories.find((category) => category.id === selectedCategoryId)
      ?.name || "미분류"
  const busy = pending || categoryPending
  const [mobile, setMobile] = useState(
    () => window.matchMedia("(max-width: 1023px)").matches
  )
  const [viewport, setViewport] = useState(() => ({
    height: window.visualViewport?.height || window.innerHeight,
    top: window.visualViewport?.offsetTop || 0,
  }))
  const allowExit = useRef(false)
  const title = useRef<HTMLHeadingElement>(null)
  const content = useRef<HTMLDivElement>(null)
  const dirty =
    value !== initial ||
    (state.mode === "new" && selectedCategoryId !== initialCategoryId)
  const blocker = useBlocker(() => !allowExit.current && (dirty || busy))
  useBeforeUnload((event) => {
    if (dirty || busy) {
      event.preventDefault()
      event.returnValue = ""
    }
  })
  useEffect(() => {
    const update = () => {
      setMobile(window.matchMedia("(max-width: 1023px)").matches)
      setViewport({
        height: window.visualViewport?.height || window.innerHeight,
        top: window.visualViewport?.offsetTop || 0,
      })
    }
    window.addEventListener("resize", update)
    window.visualViewport?.addEventListener("resize", update)
    window.visualViewport?.addEventListener("scroll", update)
    return () => {
      window.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("resize", update)
      window.visualViewport?.removeEventListener("scroll", update)
    }
  }, [])
  useEffect(() => {
    if (blocker.state !== "blocked") return
    if (busy) blocker.reset()
    else if (window.confirm("저장하지 않은 변경 내용을 버리고 이동할까요?"))
      blocker.proceed()
    else blocker.reset()
  }, [blocker, busy])
  const close = () => {
    if (
      busy ||
      (dirty && !window.confirm("저장하지 않은 변경 내용을 버릴까요?"))
    )
      return
    allowExit.current = true
    onClose()
  }
  const save = async () => {
    if (busy) return
    if (!hasTodoContent(value)) {
      setError("할 일 내용을 입력해 주세요.")
      return
    }
    setPending(true)
    setError("")
    try {
      if (await onSave(sanitizeTodo(value), selectedCategoryId)) {
        allowExit.current = true
        onClose()
      } else setError("저장하지 못했어요. 작성한 내용은 유지되어 있어요.")
    } finally {
      setPending(false)
    }
  }
  const Heading = mobile ? "h1" : "h2"
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open) close()
      }}
    >
      <DialogContent
        ref={content}
        showCloseButton={false}
        aria-modal="true"
        className="todo-editor flex max-h-[calc(100dvh-3rem)] w-[calc(100vw-3rem)] max-w-[760px] flex-col gap-0 rounded-lg p-0 shadow-none sm:rounded-lg"
        onOpenAutoFocus={(event) => {
          event.preventDefault()
          title.current?.focus({ preventScroll: true })
        }}
        onCloseAutoFocus={(event) => event.preventDefault()}
        onEscapeKeyDown={(event) => {
          if (content.current?.querySelector(".tox-dialog, .tox-menu"))
            event.preventDefault()
        }}
        style={
          mobile ? { height: viewport.height, top: viewport.top } : undefined
        }
      >
        <div className="editor-heading flex shrink-0 items-center justify-between gap-2 border-b px-6 py-5">
          <Button
            variant="ghost"
            size="icon"
            className="size-11 lg:hidden"
            aria-label="목록으로 돌아가기"
            onClick={close}
            disabled={busy}
          >
            <ArrowLeft size={22} />
          </Button>
          <DialogTitle asChild>
            <Heading
              ref={title}
              tabIndex={-1}
              className="min-w-0 flex-1 text-xl font-bold outline-none lg:text-2xl"
            >
              {state.mode === "edit"
                ? "할 일 수정"
                : state.mode === "child"
                ? "하위 할 일 추가"
                : "할 일 추가"}
            </Heading>
          </DialogTitle>
          <Button
            variant="ghost"
            size="icon"
            className="size-11"
            aria-label="에디터 닫기"
            onClick={close}
            disabled={busy}
          >
            <X size={22} />
          </Button>
        </div>
        <div className="editor-content min-h-0 overflow-y-auto overscroll-contain px-6 py-6">
          <div className="mb-6 space-y-2">
            <p
              id="todo-category-label"
              className="text-[13px] font-semibold text-muted-foreground"
            >
              카테고리
            </p>
            {state.mode === "new" ? (
              <>
                <div className="flex flex-wrap gap-2">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button
                        variant="outline"
                        className="min-w-0 flex-1 justify-between border-control bg-white px-4"
                        disabled={busy}
                        aria-label={`카테고리 선택: ${categoryName}`}
                      >
                        <span className="truncate">{categoryName}</span>
                        <ChevronDown className="shrink-0" aria-hidden="true" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent
                      align="start"
                      className="w-[var(--radix-dropdown-menu-trigger-width)]"
                      aria-labelledby="todo-category-label"
                    >
                      <DropdownMenuRadioGroup
                        value={
                          selectedCategoryId === null
                            ? "none"
                            : String(selectedCategoryId)
                        }
                        onValueChange={(value) =>
                          setSelectedCategoryId(
                            value === "none" ? null : Number(value)
                          )
                        }
                      >
                        <DropdownMenuRadioItem
                          value="none"
                          className="min-h-11"
                        >
                          미분류
                        </DropdownMenuRadioItem>
                        {availableCategories.length > 0 && (
                          <DropdownMenuSeparator />
                        )}
                        {availableCategories
                          .filter((category) => category.id !== null)
                          .map((category) => (
                            <DropdownMenuRadioItem
                              key={category.id}
                              value={String(category.id)}
                              className="min-h-11 break-all"
                            >
                              {category.name}
                            </DropdownMenuRadioItem>
                          ))}
                      </DropdownMenuRadioGroup>
                    </DropdownMenuContent>
                  </DropdownMenu>
                  <Button
                    ref={addCategoryButton}
                    variant="secondary"
                    className="shrink-0 px-3"
                    disabled={busy}
                    onClick={() => setAddingCategory(true)}
                  >
                    <Plus aria-hidden="true" />새 카테고리
                  </Button>
                </div>
                {availableCategories.length === 0 && (
                  <p className="text-[13px] text-muted-foreground">
                    카테고리가 없어요. 새 카테고리를 추가하거나 미분류로 저장할
                    수 있어요.
                  </p>
                )}
              </>
            ) : (
              <>
                <span className="inline-flex rounded-sm bg-accent px-4 py-1 text-[13px] font-medium text-primary">
                  {categoryName}
                </span>
                {(state.mode === "child" || state.item?.sub_id) && (
                  <p className="text-[13px] text-muted-foreground">
                    하위 할 일은 상위 할 일의 카테고리를 따라요.
                  </p>
                )}
              </>
            )}
          </div>
          <p className="mb-3 font-semibold" id="editor-label">
            할 일 내용{" "}
            <span className="float-right text-[13px] font-normal text-muted-foreground">
              필수
            </span>
          </p>
          <div role="group" aria-labelledby="editor-label">
            <Suspense fallback={<Loading />}>
              <EditorInput
                value={value}
                setValue={setValue}
                disabled={busy}
                onEscape={close}
              />
            </Suspense>
          </div>
          {error && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {error}
            </p>
          )}
          <DialogDescription className="mt-5 text-[13px] text-muted-foreground">
            서식과 이미지를 포함한 내용을 그대로 저장해요.
          </DialogDescription>
        </div>
        <div className="editor-actions flex shrink-0 justify-end gap-3 border-t px-6 py-5">
          <Button variant="secondary" onClick={close} disabled={busy}>
            취소
          </Button>
          <Button onClick={save} disabled={busy}>
            {pending
              ? "저장 중…"
              : state.mode === "edit"
              ? "변경 저장"
              : "할 일 추가"}
          </Button>
        </div>
        {addingCategory && (
          <CategoryForm
            onClose={() => {
              setAddingCategory(false)
              requestAnimationFrame(() => addCategoryButton.current?.focus())
            }}
            onSave={async (name) => {
              setCategoryPending(true)
              try {
                const created = await onCreateCategory(name)
                if (!created || created.id === null) return false
                setCreatedCategories((previous) => [...previous, created])
                setSelectedCategoryId(created.id)
                return true
              } finally {
                setCategoryPending(false)
              }
            }}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}
