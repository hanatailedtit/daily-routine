import { DB_TABLE_NAME } from "@/constants/db-table.constants"
import { TodoItemDto, TodoItemReqDto } from "@/model/todo/todo-item.dto"
import supabase from "@/supabase/init"
export const getTodoList = async (
  userId: string,
  categoryId?: string | null
) => {
  let request = supabase
    .from(DB_TABLE_NAME.todoItem)
    .select()
    .eq("user_id", userId)
  if (categoryId) request = request.eq("category_id", Number(categoryId))
  const { data } = await request
    .order("order")
    .order("id")
    .returns<TodoItemDto[]>()
    .throwOnError()
  return data || []
}
export const getTodoItem = async (id: number | undefined) => {
  const { data } = await supabase
    .from(DB_TABLE_NAME.todoItem)
    .select()
    .eq("id", id)
    .single<TodoItemDto>()
    .throwOnError()
  return data
}
export const getTodoSubList = async (id: number | null | undefined) => {
  const { data } = await supabase
    .from(DB_TABLE_NAME.todoItem)
    .select()
    .eq("sub_id", id)
    .returns<TodoItemDto[]>()
    .throwOnError()
  return data || []
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
