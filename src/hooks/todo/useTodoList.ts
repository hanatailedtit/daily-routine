import { TODO_LIST } from "@/constants/todo-list-constants"
import { toTodoItemReqDto } from "@/model/todo/todo-item.dto"
import { TodoItemModel } from "@/model/todo/todo-item.model.ts"
import { userProfileSelector } from "@/recoil/user/user-selectors.ts"
import {
  addTodoListSerivce,
  deleteTodoItemService,
  getTodoListItemService,
  getTodoListService,
  getTodoSubListService,
  updateTodoItemService,
} from "@/service/todo/todo-item.service"
import { DragEvent, useCallback, useEffect, useState } from "react"
import { useSearchParams } from "react-router-dom"
import { useRecoilValue } from "recoil"

export const useTodoList = () => {
  const draggingClassName = "dragging"

  let topPosition = 0
  let itemId: number
  let draggedItem: TodoItemModel | null = null

  const [todoList, setTodoList] = useState<TodoItemModel[]>([])
  const [isDragging, setIsDragging] = useState(false)
  const userData = useRecoilValue(userProfileSelector)
  const userId = userData?.id
  const [searchParams] = useSearchParams()
  const categoryId = searchParams.get("category_id")

  const fetchTodoList = useCallback(async () => {
    if (!userId) return
    const data = await getTodoListService(userId, categoryId)
    setTodoList(data)
  }, [userId, categoryId])

  const enterTodoItem = async (
    text: TodoItemModel["text"],
    itemId?: TodoItemModel["id"]
  ) => {
    if (!userId) return
    await addTodoListSerivce(text, itemId || null, userId, categoryId)
    if (itemId) {
      await updateTodoItemService(itemId, {
        checked: false,
      })
    }

    await fetchTodoList()
  }

  const clickCheckboxButton = async (
    id: TodoItemModel["id"],
    checked: TodoItemModel["checked"]
  ) => {
    if (!userId) return

    const todoItem = {
      checked,
    }
    const targetUpperItem = todoList.find((item) => item.id === id)
    const targetItem = await getTodoListItemService(id)
    const targetSubId = targetItem?.sub_id || null
    const targetSubItem = targetUpperItem?.sub_item

    if (targetSubItem) {
      const updateSubItem = targetSubItem.map(async (item) => {
        await updateTodoItemService(item.id, todoItem)
      })
      await Promise.all(updateSubItem)
    }

    await updateTodoItemService(id, todoItem)

    if (targetSubId) {
      if (!checked)
        await updateTodoItemService(targetSubId, {
          checked: false,
        })

      const targetDepsItem = await getTodoSubListService(targetSubId)

      const isAllChecked = targetDepsItem?.every((item) => item.checked)
      if (isAllChecked)
        await updateTodoItemService(targetSubId, {
          checked: true,
        })
    }

    await fetchTodoList()
  }

  const clickDeleteButton = async (id: TodoItemModel["id"]) => {
    const targetItem = await getTodoListItemService(id)
    await deleteTodoItemService(id)

    const targetSubId = targetItem?.sub_id || null

    if (targetSubId) {
      const targetDepsItem = await getTodoSubListService(targetSubId)

      const isAllChecked = targetDepsItem?.every((item) => item.checked)
      if (isAllChecked)
        await updateTodoItemService(targetSubId, {
          checked: true,
        })
    }

    await fetchTodoList()
  }

  const editTodoItemValue = async (
    id: TodoItemModel["id"],
    text: TodoItemModel["text"]
  ) => {
    if (!userId) {
      const filteredTodoList = todoList.map((item) => {
        if (item.id === id) item.text = text
        return item
      })
      setTodoList(filteredTodoList)
      return
    }
    const todoItem = {
      todo_text: text,
    }
    await updateTodoItemService(id, todoItem)
    await fetchTodoList()
  }

  const dragStartTodoItem = (e: DragEvent, item: TodoItemModel) => {
    e.preventDefault()
    const element = document.getElementById(
      `todo-item-${item.id}`
    ) as HTMLDivElement

    if (!element) return
    setIsDragging(true)
    draggedItem = item
    topPosition = e.clientY - element.offsetTop
    itemId = item.id

    document.addEventListener("mousemove", mouseMoveItem)
    document.addEventListener("mouseup", mouseEndItem)

    element.classList.add(draggingClassName)
  }

  const mouseMoveItem = (e: MouseEvent) => {
    if (itemId === undefined) return
    const element = document.getElementById(`todo-item-${itemId}`)

    if (!element) return
    element.style.top = (e.clientY - topPosition).toString() + "px"
  }

  const mouseEndItem = async (e: MouseEvent) => {
    document.removeEventListener("mousemove", mouseMoveItem)
    document.removeEventListener("mouseup", mouseEndItem)
    setIsDragging(false)
    if (itemId === undefined) return
    const element = document.getElementById(`todo-item-${itemId}`)

    if (!element) return
    element.classList.remove(draggingClassName)
    element.style.top = "0px"
    const target = e.target as Element | null
    const targetId = target?.closest<HTMLElement>("[data-id]")?.dataset.id

    if (!targetId) return

    const targetItem = todoList.find((item) => item.id === Number(targetId))

    if (!draggedItem || !targetItem || draggedItem.id === targetItem.id) return

    const copyItem = { ...targetItem }

    targetItem.order = draggedItem.order
    draggedItem.order = copyItem.order

    await updateTodoItemService(targetItem.id, toTodoItemReqDto(targetItem))
    await updateTodoItemService(draggedItem.id, toTodoItemReqDto(draggedItem))

    fetchTodoList()
  }

  const dragEndTodoItem = (e: DragEvent) => {
    e.stopPropagation()
  }

  const clickRandomTodoListButton = async () => {
    const number = Math.floor(Math.random() * TODO_LIST.length)
    const randomItem = TODO_LIST[number]
    await enterTodoItem(randomItem)
  }

  const mouseOverItemWrapper = (e: React.MouseEvent) => {
    const element = e.currentTarget as HTMLDivElement
    const dataId = element.dataset?.id
    if (!isDragging || !dataId) return
    element.style.backgroundColor = "#efefef"
    element.style.cursor = "pointer"
  }

  const mouseOutItemWrapper = (e: React.MouseEvent) => {
    const element = e.currentTarget as HTMLDivElement
    const dataId = element.dataset?.id
    if (!dataId) return
    element.style.backgroundColor = "rgb(var(--white))"
    element.style.cursor = "default"
  }

  useEffect(() => {
    fetchTodoList()
  }, [fetchTodoList])

  return {
    fetchTodoList,
    todoList,
    enterTodoItem,
    clickCheckboxButton,
    clickDeleteButton,
    editTodoItemValue,
    dragStartTodoItem,
    dragEndTodoItem,
    clickRandomTodoListButton,
    mouseOverItemWrapper,
    mouseOutItemWrapper,
  }
}
