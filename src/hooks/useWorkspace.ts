import { useCallback, useEffect, useRef, useState } from "react"
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
  const userId = profile?.id
  const requestId = useRef(0)
  const mounted = useRef(true)
  const mutating = useRef(false)
  const reload = useCallback(async () => {
    const currentRequest = ++requestId.current
    if (!userId) return
    try {
      const [items, categoryList] = await Promise.all([
        getTodoListService(userId, null),
        getTodoCategoryListService(userId),
      ])
      if (!mounted.current || currentRequest !== requestId.current) return
      setTodos(items)
      setCategories(categoryList)
      setError("")
    } catch (error) {
      if (mounted.current && currentRequest === requestId.current) throw error
    }
  }, [userId])
  useEffect(() => {
    let active = true
    mounted.current = true
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
      mounted.current = false
    }
  }, [reload])
  const mutate = async (action: () => Promise<void>) => {
    if (mutating.current || !mounted.current) return false
    mutating.current = true
    setBusy(true)
    setError("")
    try {
      await action()
      if (!mounted.current) return false
      try {
        await reload()
      } catch {
        if (mounted.current)
          setError(
            "저장했지만 목록을 불러오지 못했어요. 다시 불러와 결과를 확인해 주세요."
          )
      }
      return true
    } catch {
      if (!mounted.current) return false
      // Separate REST writes can partially succeed; show the persisted state.
      try {
        await reload()
      } catch {
        // Keep the last snapshot and the failure message when recovery also fails.
      }
      if (mounted.current)
        setError(
          "변경을 완료하지 못했어요. 목록을 확인한 뒤 다시 시도해 주세요."
        )
      return false
    } finally {
      mutating.current = false
      if (mounted.current) setBusy(false)
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
