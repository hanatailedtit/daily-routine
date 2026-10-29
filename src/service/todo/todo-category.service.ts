import {
  TodoCategoryDto,
  TodoCategoryReqDto,
} from "@/model/todo/todo-category.dto"
import {
  deleteTodoCategory,
  insertTodoCategory,
  selectTodoCategory,
  selectTodoCategoryList,
  updateTodoCategory,
} from "@/repository/todo/todo-category.repository"

export const getTodoCategoryListService = async (
  userId: TodoCategoryDto["user_id"]
) => {
  return await selectTodoCategoryList(userId)
}

export const getTodoCategoryService = async (
  categoryId: TodoCategoryDto["id"]
) => {
  return await selectTodoCategory(Number(categoryId))
}

export const selectTodoCategoryService = async (
  category: TodoCategoryReqDto
) => {
  const name = category.name?.trim()
  if (!name || name.length > 60)
    throw new Error("카테고리 이름은 1~60자로 입력해 주세요.")
  return await insertTodoCategory({ ...category, name })
}

export const deleteTodoCategoryService = async (
  categoryId: TodoCategoryDto["id"]
) => {
  await deleteTodoCategory(categoryId)
}

export const updateTodoCategoryService = async (
  categoryId: TodoCategoryDto["id"],
  category: TodoCategoryReqDto
) => {
  await updateTodoCategory(categoryId, category)
}
