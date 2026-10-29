import { TodoItemModel } from "@/model/todo/todo-item.model.ts"

export type TodoItemDto = {
  id: number
  user_id: string
  todo_text: string
  checked: boolean
  created_at: string
  category_id: number | null
  sub_id: number | null
  order: number
}

export type TodoItemReqDto = Partial<TodoItemDto>

export const toTodoItemModel = (todoItem: TodoItemDto): TodoItemModel => {
  return {
    id: todoItem.id,
    text: todoItem.todo_text,
    checked: todoItem.checked,
    sub_item: null,
    sub_id: todoItem.sub_id,
    category_id: todoItem.category_id,
    order: todoItem.order,
    created_at: todoItem.created_at,
  }
}

export const toTodoItemReqDto = (todoItem: TodoItemModel): TodoItemReqDto => {
  return {
    todo_text: todoItem.text,
    checked: todoItem.checked,
    order: todoItem.order,
  }
}
