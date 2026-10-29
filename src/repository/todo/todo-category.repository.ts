import { DB_TABLE_NAME } from "@/constants/db-table.constants"
import {
  TodoCategoryDto,
  TodoCategoryReqDto,
} from "@/model/todo/todo-category.dto"
import supabase from "@/supabase/init"
import { fetchAllRows } from "@/repository/query"
export const selectTodoCategoryList = async (userId: string) => {
  return fetchAllRows<TodoCategoryDto>((from, to) =>
    supabase
      .from(DB_TABLE_NAME.todoCategory)
      .select()
      .eq("user_id", userId)
      .order("created_at")
      .order("id")
      .range(from, to)
      .returns<TodoCategoryDto[]>()
      .throwOnError()
  )
}
export const insertTodoCategory = async (category: TodoCategoryReqDto) => {
  const { data } = await supabase
    .from(DB_TABLE_NAME.todoCategory)
    .insert(category)
    .select()
    .single<TodoCategoryDto>()
    .throwOnError()
  return data
}
export const updateTodoCategory = async (
  id: number | null,
  category: TodoCategoryReqDto
) => {
  await supabase
    .from(DB_TABLE_NAME.todoCategory)
    .update(category)
    .eq("id", id)
    .throwOnError()
}
export const deleteTodoCategory = async (id: number | null) => {
  const items = await fetchAllRows<{ id: number }>((from, to) =>
    supabase
      .from(DB_TABLE_NAME.todoItem)
      .select("id")
      .eq("category_id", id)
      .order("id")
      .range(from, to)
      .returns<{ id: number }[]>()
      .throwOnError()
  )
  for (let start = 0; start < items.length; start += 100) {
    // Older children may have no category_id; remove them by their parent too.
    await supabase
      .from(DB_TABLE_NAME.todoItem)
      .delete()
      .in(
        "sub_id",
        items.slice(start, start + 100).map((item) => item.id)
      )
      .throwOnError()
  }
  await supabase
    .from(DB_TABLE_NAME.todoItem)
    .delete()
    .eq("category_id", id)
    .throwOnError()
  await supabase
    .from(DB_TABLE_NAME.todoCategory)
    .delete()
    .eq("id", id)
    .throwOnError()
}
