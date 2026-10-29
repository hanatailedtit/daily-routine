import { DB_TABLE_NAME } from "@/constants/db-table.constants"
import { TodoItemDto, TodoItemReqDto } from "@/model/todo/todo-item.dto"
import supabase from "@/supabase/init"
import { fetchAllRows } from "@/repository/query"
export const getTodoList = async (
  userId: string,
  categoryId?: string | null
) => {
  return fetchAllRows<TodoItemDto>((from, to) => {
    let request = supabase
      .from(DB_TABLE_NAME.todoItem)
      .select()
      .eq("user_id", userId)
    if (categoryId) request = request.eq("category_id", Number(categoryId))
    return request
      .order("order")
      .order("id")
      .range(from, to)
      .returns<TodoItemDto[]>()
      .throwOnError()
  })
}
export const getTodoSubList = async (id: number | null | undefined) => {
  return fetchAllRows<TodoItemDto>((from, to) =>
    supabase
      .from(DB_TABLE_NAME.todoItem)
      .select()
      .eq("sub_id", id)
      .order("id")
      .range(from, to)
      .returns<TodoItemDto[]>()
      .throwOnError()
  )
}
export const addTodoItem = async (item: TodoItemReqDto) => {
  await supabase.from(DB_TABLE_NAME.todoItem).insert(item).throwOnError()
}
export const updateTodoItem = async (id: number, item: TodoItemReqDto) => {
  await supabase
    .from(DB_TABLE_NAME.todoItem)
    .update(item)
    .eq("id", id)
    .throwOnError()
}
export const deleteTodoItem = async (id: number) => {
  await supabase
    .from(DB_TABLE_NAME.todoItem)
    .delete()
    .eq("sub_id", id)
    .throwOnError()
  await supabase
    .from(DB_TABLE_NAME.todoItem)
    .delete()
    .eq("id", id)
    .throwOnError()
}
