import { useCallback, useEffect, useState } from "react"
import { useRecoilRefresher_UNSTABLE, useRecoilValue } from "recoil"
import { useOutletContext } from "react-router-dom"
import { userProfileSelector } from "@/recoil/user/user-selectors"
import { getTodoListService } from "@/service/todo/todo-item.service"
import { getTodoCategoryListService } from "@/service/todo/todo-category.service"
import { TodoItemModel } from "@/model/todo/todo-item.model"
import { TodoCategoryDto } from "@/model/todo/todo-category.dto"

export function useWorkspaceData() {
  const profile = useRecoilValue(userProfileSelector)
  const refreshProfile = useRecoilRefresher_UNSTABLE(userProfileSelector)
  const [todos, setTodos] = useState<TodoItemModel[]>([])
  const [categories, setCategories] = useState<TodoCategoryDto[]>([])
  const [loading, setLoading] = useState(true)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState("")
  const reload = useCallback(async () => {
    if (!profile) return
    const [items, categoryList] = await Promise.all([
      getTodoListService(profile.id, null),
      getTodoCategoryListService(profile.id),
    ])
    setTodos(items)
    setCategories(categoryList || [])
  }, [profile])
  useEffect(() => {
    let active = true
    setLoading(true)
    reload()
      .catch(() => {
        if (active)
          setError(
            "할 일을 불러오지 못했어요. 연결을 확인하고 다시 시도해 주세요."
          )
      })
      .finally(() => {
        if (active) setLoading(false)
      })
    return () => {
      active = false
    }
  }, [reload])
  const mutate = async (action: () => Promise<void>) => {
    if (busy) return false
    setBusy(true)
    setError("")
    try {
      await action()
      try {
        await reload()
      } catch {
        setError(
          "저장했지만 목록을 불러오지 못했어요. 다시 불러와 결과를 확인해 주세요."
        )
      }
      return true
    } catch {
      setError("변경하지 못했어요. 연결을 확인한 뒤 다시 시도해 주세요.")
      return false
    } finally {
      setBusy(false)
    }
  }
  return {
    profile,
    refreshProfile,
    todos,
    categories,
    loading,
    busy,
    error,
    setError,
    reload,
    mutate,
  }
}
export type Workspace = ReturnType<typeof useWorkspaceData>
export const useWorkspace = () => useOutletContext<Workspace>()
