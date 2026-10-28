import { TodoCategoryDto } from "@/model/todo/todo-category.dto"
import {
  TodoCategoryModel,
  initTodoCategory,
} from "@/model/todo/todo-category.model.ts"
import { userProfileSelector } from "@/recoil/user/user-selectors.ts"
import { updateTodoCategory } from "@/repository/todo/todo-category.repository"
import {
  deleteTodoCategoryService,
  getTodoCategoryListService,
  getTodoCategoryService,
  selectTodoCategoryService,
} from "@/service/todo/todo-category.service"
import { useCallback, useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useRecoilValue } from "recoil"

export const useTodoCategory = () => {
  const user = useRecoilValue(userProfileSelector)
  const userId = user?.id
  const [categoryList, setCategoryList] = useState<TodoCategoryModel[]>([])
  const [category, setCategory] = useState<TodoCategoryModel>()
  const [searchParams] = useSearchParams()
  const categoryId = searchParams.get("category_id")

  const fetchTodoCategoryList = useCallback(async () => {
    if (!userId) return
    const data = await getTodoCategoryListService(userId)
    if (!data) return
    setCategoryList(data)
  }, [userId])

  const fetchTodoCategory = useCallback(async () => {
    if (!categoryId) {
      setCategory(initTodoCategory())
      return
    }
    const data = await getTodoCategoryService(Number(categoryId))
    if (!data) return
    setCategory(data)
  }, [categoryId])

  const clickAddTodoCategory = async (name: string) => {
    if (!userId) return

    const category = {
      user_id: userId,
      name,
    }
    await selectTodoCategoryService(category)
    await fetchTodoCategoryList()
  }

  const clickDeleteTodoCategory = async (id: TodoCategoryDto["id"]) => {
    await deleteTodoCategoryService(id)
    await fetchTodoCategoryList()
  }

  const clickEditTodoCategoryName = async (
    id: TodoCategoryDto["id"],
    name: TodoCategoryDto["name"]
  ) => {
    const category = {
      name,
    }
    await updateTodoCategory(id, category)
    await fetchTodoCategoryList()
    await fetchTodoCategory()
  }

  useEffect(() => {
    fetchTodoCategoryList()
  }, [fetchTodoCategoryList])

  useEffect(() => {
    fetchTodoCategory()
  }, [fetchTodoCategory])

  return {
    categoryList,
    category,
    fetchTodoCategoryList,
    fetchTodoCategory,
    clickAddTodoCategory,
    clickDeleteTodoCategory,
    clickEditTodoCategoryName,
  }
}
