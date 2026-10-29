import DOMPurify from "dompurify"
import { TodoItemModel } from "@/model/todo/todo-item.model"
import { TodoCategoryDto } from "@/model/todo/todo-category.dto"

export const sanitizeTodo = (html: string) =>
  DOMPurify.sanitize(html, {
    ADD_DATA_URI_TAGS: ["img"],
    FORBID_TAGS: [
      "style",
      "form",
      "input",
      "button",
      "iframe",
      "video",
      "audio",
    ],
  })
export function hasTodoContent(html: string) {
  const document = new DOMParser().parseFromString(
    sanitizeTodo(html),
    "text/html"
  )
  return Boolean(
    document.body.textContent?.trim() || document.querySelector("img")
  )
}
export function getStats(todos: TodoItemModel[]) {
  const complete = todos.filter((todo) => todo.checked).length
  return {
    total: todos.length,
    complete,
    pending: todos.length - complete,
    percent: todos.length
      ? Math.round((complete / todos.length) * 1000) / 10
      : 0,
  }
}
export function getBreakdown(
  todos: TodoItemModel[],
  categories: TodoCategoryDto[]
) {
  const days = new Map<string, TodoItemModel[]>()
  todos.forEach((todo) => {
    const key = new Date(todo.created_at).toLocaleDateString("sv-SE")
    days.set(key, [...(days.get(key) || []), todo])
  })
  return {
    dates: [...days]
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([label, items]) => ({ label, ...getStats(items) })),
    categories: [
      ...categories.map((category) => ({
        label: category.name,
        ...getStats(todos.filter((todo) => todo.category_id === category.id)),
      })),
      ...(todos.some((todo) => !todo.category_id)
        ? [
            {
              label: "미분류",
              ...getStats(todos.filter((todo) => !todo.category_id)),
            },
          ]
        : []),
    ],
  }
}
