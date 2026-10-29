import { useEffect, useRef, useState } from "react"
import { useSearchParams } from "react-router-dom"
import {
  ArrowDown,
  ArrowUp,
  GripVertical,
  MoreHorizontal,
  Plus,
  Shuffle,
  Trash2,
  CornerDownRight,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import Stats from "@/components/shared/Stats"
import ConfirmAction from "@/components/shared/ConfirmAction"
import CategoryForm from "@/components/shared/CategoryForm"
import TodoEditor, { EditorState } from "@/components/todo-page/TodoEditor"
import { useWorkspace } from "@/hooks/useWorkspace"
import { TodoItemModel } from "@/model/todo/todo-item.model"
import { TodoCategoryDto } from "@/model/todo/todo-category.dto"
import { addTodoItem } from "@/repository/todo/todo-item.repository"
import {
  updateTodoItemService,
  removeTodoService,
  reorderTodoService,
  setTodoCheckedService,
} from "@/service/todo/todo-item.service"
import {
  deleteTodoCategoryService,
  updateTodoCategoryService,
  selectTodoCategoryService,
} from "@/service/todo/todo-category.service"
import { TODO_LIST } from "@/constants/todo-list-constants"
import { cn } from "@/lib/utils"
import { getStats, sanitizeTodo } from "@/lib/todo"

export default function TodoPage() {
  const { profile, todos, categories, busy, mutate } = useWorkspace()
  const [params, setParams] = useSearchParams()
  const categoryId = params.get("category_id")
  const category = categories.find((item) => String(item.id) === categoryId)
  const visible = categoryId
    ? todos.filter((todo) => String(todo.category_id) === categoryId)
    : todos
  const stats = getStats(visible)
  const editorParam = params.get("editor")
  const [mode, itemId] = (editorParam || "").split(":")
  const editorItem = todos
    .flatMap((item) => [item, ...(item.sub_item || [])])
    .find((item) => item.id === Number(itemId))
  const editor: EditorState | null =
    editorParam === "new"
      ? { mode: "new" }
      : editorItem &&
        (mode === "edit" || (mode === "child" && !editorItem.sub_id))
      ? { mode, item: editorItem }
      : null
  const listScroll = useRef(0)
  const editorTrigger = useRef<HTMLElement | null>(null)
  const previousEditor = useRef(editorParam)
  const previousCategory = useRef(categoryId)
  const [renaming, setRenaming] = useState(false)
  const [deletingCategory, setDeletingCategory] = useState(false)
  const [deleting, setDeleting] = useState<TodoItemModel | null>(null)
  const [dragged, setDragged] = useState<number | null>(null)
  useEffect(() => {
    if (
      previousEditor.current &&
      !editorParam &&
      previousCategory.current === categoryId
    ) {
      requestAnimationFrame(() => {
        const target = editorTrigger.current?.isConnected
          ? editorTrigger.current
          : document.getElementById("main-content")
        target?.focus({ preventScroll: true })
        window.scrollTo(0, listScroll.current)
      })
    }
    previousEditor.current = editorParam
    previousCategory.current = categoryId
  }, [editorParam, categoryId])
  const openEditor = (state: EditorState) => {
    if (!editor) {
      listScroll.current = window.scrollY
      const active = document.activeElement
      editorTrigger.current =
        active instanceof HTMLElement &&
        active !== document.body &&
        !active.closest("[role=menu]")
          ? active
          : document.querySelector(
              `[data-todo-id="${state.item?.id}"] button[aria-label="할 일 더보기"]`
            )
    }
    const next = new URLSearchParams(params)
    next.set(
      "editor",
      state.mode === "new" ? "new" : `${state.mode}:${state.item?.id}`
    )
    setParams(next, { replace: Boolean(editor) })
  }
  const closeEditor = () => {
    const next = new URLSearchParams(params)
    next.delete("editor")
    setParams(next, { replace: true })
  }
  const save = (html: string, selectedCategoryId: number | null) =>
    mutate(async () => {
      if (!profile || !editor) throw new Error("Session required")
      if (editor.mode === "edit" && editor.item)
        await updateTodoItemService(editor.item.id, { todo_text: html })
      else {
        const parent = editor.mode === "child" ? editor.item : undefined
        await addTodoItem({
          todo_text: html,
          user_id: profile.id,
          sub_id: parent?.id || null,
          category_id: parent ? parent.category_id ?? null : selectedCategoryId,
          order: Math.max(-1, ...todos.map((item) => item.order ?? 0)) + 1,
        })
        if (parent) await updateTodoItemService(parent.id, { checked: false })
      }
    })
  const createCategory = async (name: string) => {
    let created: TodoCategoryDto | null = null
    const saved = await mutate(async () => {
      if (!profile) throw new Error("Session required")
      created = await selectTodoCategoryService({ name, user_id: profile.id })
    })
    return saved ? created : null
  }
  const move = (id: number, target: number) =>
    mutate(() => reorderTodoService(todos, id, target))
  const random = () =>
    mutate(async () => {
      if (!profile) throw new Error("Session required")
      await addTodoItem({
        todo_text: TODO_LIST[Math.floor(Math.random() * TODO_LIST.length)],
        user_id: profile.id,
        sub_id: null,
        category_id: categoryId ? Number(categoryId) : undefined,
        order: Math.max(-1, ...todos.map((item) => item.order ?? 0)) + 1,
      })
    })
  if (categoryId && !category)
    return (
      <section className="panel text-center">
        <h1 className="page-title">카테고리를 찾을 수 없어요</h1>
        <Button className="mt-6" onClick={() => setParams({})}>
          전체 할 일로 이동
        </Button>
      </section>
    )
  const title = category?.name || "전체 할 일"
  const row = (item: TodoItemModel, index: number, child = false) => (
    <div
      data-todo-id={item.id}
      className={cn(
        "flex min-w-0 items-start gap-2 rounded-xl py-3 sm:items-center sm:gap-3 sm:py-2",
        editor?.item?.id === item.id && "bg-accent",
        !child && "px-2 sm:px-3"
      )}
    >
      {!child && (
        <span
          draggable={!busy}
          onDragStart={(event) => {
            setDragged(item.id)
            event.dataTransfer.setData("text/plain", String(item.id))
            event.dataTransfer.effectAllowed = "move"
          }}
          onDragEnd={() => setDragged(null)}
          title="끌어서 순서 변경"
          className="hidden min-h-10 w-6 shrink-0 cursor-grab items-center justify-center text-muted-foreground active:cursor-grabbing lg:flex"
        >
          <GripVertical size={18} aria-hidden="true" />
        </span>
      )}
      <label className="flex size-11 shrink-0 cursor-pointer items-center justify-center sm:size-10">
        <Checkbox
          checked={item.checked}
          disabled={busy}
          onCheckedChange={(checked) => {
            void mutate(() => setTodoCheckedService(item, checked === true))
          }}
          aria-label={`${item.checked ? "미완료로" : "완료로"} 변경`}
        />
      </label>
      <div className="min-w-0 flex-1">
        <div
          className={cn(
            "todo-content text-base sm:text-[17px]",
            child && "text-sm sm:text-[15px]",
            item.checked && "text-muted-foreground line-through"
          )}
          dangerouslySetInnerHTML={{ __html: sanitizeTodo(item.text) }}
        />
        {!child && (
          <p className="mt-1 text-[13px] text-muted-foreground md:hidden">
            {categories.find((category) => category.id === item.category_id)
              ?.name || "미분류"}
          </p>
        )}
      </div>
      <div className="flex shrink-0 items-center gap-1 self-start sm:self-center">
        {!child && !categoryId && (
          <span className="mr-2 hidden max-w-28 truncate rounded-sm bg-background px-4 py-1 text-[13px] text-muted-foreground md:inline">
            {categories.find((category) => category.id === item.category_id)
              ?.name || "미분류"}
          </span>
        )}
        <Button
          variant="ghost"
          size="sm"
          className="hidden text-[13px] text-muted-foreground sm:inline-flex"
          disabled={busy}
          onClick={() => openEditor({ mode: "edit", item })}
        >
          수정
        </Button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              disabled={busy}
              aria-label="할 일 더보기"
              className="size-11 sm:size-10"
            >
              <MoreHorizontal size={20} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onSelect={() => openEditor({ mode: "edit", item })}
            >
              내용 수정
            </DropdownMenuItem>
            {!child && (
              <>
                <DropdownMenuItem
                  onSelect={() => openEditor({ mode: "child", item })}
                >
                  <Plus />
                  하위 할 일 추가
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  disabled={index === 0}
                  onSelect={() => {
                    void move(item.id, visible[index - 1].id)
                  }}
                >
                  <ArrowUp />
                  위로 이동
                </DropdownMenuItem>
                <DropdownMenuItem
                  disabled={index === visible.length - 1}
                  onSelect={() => {
                    void move(item.id, visible[index + 1].id)
                  }}
                >
                  <ArrowDown />
                  아래로 이동
                </DropdownMenuItem>
              </>
            )}
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onSelect={() => setDeleting(item)}
            >
              <Trash2 />
              삭제
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </div>
  )
  return (
    <div className="todo-page space-y-6">
      <div className="todo-summary flex flex-wrap items-start justify-between gap-6">
        <div>
          <h1 className="page-title">{title}</h1>
          <p className="page-description">
            {category
              ? `${category.name} 카테고리의 할 일을 관리해요.`
              : "할 일을 정리하고 하나씩 완료해요."}
          </p>
        </div>
        <div className="flex w-full flex-wrap gap-3 sm:w-auto">
          {category ? (
            <>
              <Button
                variant="secondary"
                disabled={busy}
                className="flex-1 sm:flex-none"
                onClick={() => setRenaming(true)}
              >
                이름 수정
              </Button>
              <Button
                variant="secondary"
                disabled={busy}
                className="flex-1 sm:flex-none"
                onClick={() => setDeletingCategory(true)}
              >
                카테고리 삭제
              </Button>
            </>
          ) : (
            <>
              <Button
                variant="secondary"
                className="flex-1 px-3 sm:flex-none sm:px-6"
                disabled={busy}
                onClick={() => {
                  void random()
                }}
              >
                <Shuffle />
                랜덤 할 일 추가
              </Button>
              <Button
                disabled={busy}
                className="flex-1 px-3 sm:flex-none sm:px-6"
                variant={editor ? "secondary" : "default"}
                onClick={() => openEditor({ mode: "new" })}
              >
                <Plus />할 일 추가
              </Button>
            </>
          )}
        </div>
      </div>
      <Stats
        items={[
          {
            label: category ? "상위 할 일" : "전체 할 일",
            value: stats.total,
            unit: "개",
          },
          { label: "완료", value: stats.complete, unit: "개" },
          { label: "미완료", value: stats.pending, unit: "개" },
          ...(!category
            ? [{ label: "완료율", value: `${stats.percent}%` }]
            : []),
        ]}
      />
      <div className="todo-columns grid min-w-0 items-start gap-8">
        <section className="todo-list min-w-0">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
            <h2 className="text-xl font-bold">할 일 목록</h2>
            {category ? (
              <div className="flex gap-2">
                <Button
                  variant="ghost"
                  size="icon"
                  aria-label="랜덤 할 일 추가"
                  className="hidden sm:inline-flex"
                  disabled={busy}
                  onClick={() => {
                    void random()
                  }}
                >
                  <Shuffle size={19} />
                </Button>
                <Button
                  variant={editor ? "secondary" : "default"}
                  disabled={busy}
                  onClick={() => openEditor({ mode: "new" })}
                >
                  <Plus />할 일 추가
                </Button>
              </div>
            ) : (
              <p className="text-[13px] text-muted-foreground">
                상위 할 일 {visible.length}개 · 하위 할 일{" "}
                {visible.reduce(
                  (count, item) => count + (item.sub_item?.length || 0),
                  0
                )}
                개
              </p>
            )}
          </div>
          <div className="rounded-lg bg-white p-3 sm:p-4">
            {visible.length ? (
              <ul className="divide-y" aria-label="할 일 목록">
                {visible.map((item, index) => (
                  <li
                    key={item.id}
                    onDragOver={(event) => {
                      if (dragged !== null) event.preventDefault()
                    }}
                    onDrop={(event) => {
                      event.preventDefault()
                      if (dragged !== null && !busy) void move(dragged, item.id)
                      setDragged(null)
                    }}
                    className={cn(dragged === item.id && "opacity-40")}
                  >
                    {row(item, index)}
                    {Boolean(item.sub_item?.length) && (
                      <ul className="mb-3 ml-2 rounded-xl bg-background py-1 pl-2 sm:ml-12 sm:bg-muted sm:pl-4">
                        {item.sub_item?.map((child) => (
                          <li
                            key={child.id}
                            className="flex min-w-0 items-start gap-1"
                          >
                            <CornerDownRight
                              size={16}
                              className="mt-3 shrink-0 text-muted-foreground"
                            />
                            <div className="min-w-0 flex-1">
                              {row(child, index, true)}
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <div className="px-5 py-16 text-center">
                <h3 className="text-lg font-semibold">아직 할 일이 없어요</h3>
                <p className="mt-2 text-muted-foreground">
                  첫 할 일을 추가하고 나만의 루틴을 시작해요.
                </p>
                <Button
                  className="mt-6"
                  onClick={() => openEditor({ mode: "new" })}
                  variant={editor ? "secondary" : "default"}
                >
                  <Plus />할 일 추가
                </Button>
              </div>
            )}
          </div>
          {category && (
            <Button
              variant="secondary"
              className="mt-6 w-full justify-start sm:hidden"
              disabled={busy}
              onClick={() => {
                void random()
              }}
            >
              <Shuffle />
              랜덤 할 일 추가
            </Button>
          )}
        </section>
        {editor && (
          <TodoEditor
            key={`${editor.mode}-${editor.item?.id || "new"}`}
            state={editor}
            categories={categories}
            initialCategoryId={
              editor.mode === "new"
                ? category?.id ?? null
                : editor.item?.category_id ?? null
            }
            onCreateCategory={createCategory}
            onClose={closeEditor}
            onSave={save}
          />
        )}
      </div>
      {renaming && category && (
        <CategoryForm
          name={category.name}
          onClose={() => setRenaming(false)}
          onSave={(name) =>
            mutate(() => updateTodoCategoryService(category.id, { name }))
          }
        />
      )}
      {deletingCategory && category && (
        <ConfirmAction
          title="카테고리를 삭제할까요?"
          description="카테고리 안의 상위·하위 할 일도 모두 삭제돼요. 삭제한 내용은 복구할 수 없어요."
          onClose={() => setDeletingCategory(false)}
          onConfirm={async () => {
            if (!(await mutate(() => deleteTodoCategoryService(category.id))))
              throw new Error("Delete failed")
            setParams({})
          }}
        />
      )}
      {deleting && (
        <ConfirmAction
          title="할 일을 삭제할까요?"
          description={
            deleting.sub_item?.length
              ? "하위 할 일도 함께 삭제돼요. 삭제한 내용은 복구할 수 없어요."
              : "삭제한 내용은 복구할 수 없어요."
          }
          onClose={() => setDeleting(null)}
          onConfirm={async () => {
            if (!(await mutate(() => removeTodoService(deleting))))
              throw new Error("Delete failed")
            if (editor?.item?.id === deleting.id) closeEditor()
          }}
        />
      )}
    </div>
  )
}
