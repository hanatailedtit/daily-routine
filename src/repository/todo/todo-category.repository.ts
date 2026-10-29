import { DB_TABLE_NAME } from "@/constants/db-table.constants"
import {
  TodoCategoryDto,
  TodoCategoryReqDto,
} from "@/model/todo/todo-category.dto"
import supabase from "@/supabase/init"
export const selectTodoCategoryList = async (userId: string) => {
  const { data } = await supabase
    .from(DB_TABLE_NAME.todoCategory)
    .select()
    .eq("user_id", userId)
    .order("created_at")
    .returns<TodoCategoryDto[]>()
    .throwOnError()
  return data || []
}
export const selectTodoCategory = async (id: number | null) => {
  const { data } = await supabase
    .from(DB_TABLE_NAME.todoCategory)
    .select()
    .eq("id", id)
    .single<TodoCategoryDto>()
    .throwOnError()
  return data
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
  const { data: items } = await supabase
    .from(DB_TABLE_NAME.todoItem)
    .select("id")
    .eq("category_id", id)
    .returns<{ id: number }[]>()
    .throwOnError()
  if (items?.length) {
    // Older children may have no category_id; remove them by their parent too.
    await supabase
      .from(DB_TABLE_NAME.todoItem)
      .delete()
      .in(
        "sub_id",
        items.map((item) => item.id)
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
