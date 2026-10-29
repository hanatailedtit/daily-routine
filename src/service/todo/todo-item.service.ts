import {
  TodoItemDto,
  TodoItemReqDto,
  toTodoItemModel,
} from "@/model/todo/todo-item.dto"
import { TodoItemModel } from "@/model/todo/todo-item.model"
import {
  deleteTodoItem,
  getTodoList,
  getTodoSubList,
  updateTodoItem,
} from "@/repository/todo/todo-item.repository"

export const getTodoListService = async (
  userId: TodoItemDto["user_id"],
  categoryId: string | null
) => {
  const data = await getTodoList(userId, categoryId)
  const parents: TodoItemModel[] = []
  const children = new Map<number, TodoItemModel[]>()
  for (const item of data) {
    const model = toTodoItemModel(item)
    if (item.sub_id == null) parents.push(model)
    else {
      const siblings = children.get(item.sub_id)
      if (siblings) siblings.push(model)
      else children.set(item.sub_id, [model])
    }
  }
  return parents.map((item) => ({
    ...item,
    sub_item: children.get(item.id) || null,
  }))
}

async function waitForWrites(writes: Promise<void>[]) {
  // Keep the mutation locked until every started request has settled.
  const results = await Promise.allSettled(writes)
  const failure = results.find((result) => result.status === "rejected")
  if (failure?.status === "rejected") throw failure.reason
}

export const getTodoSubListService = async (subId: TodoItemDto["sub_id"]) => {
  const data = await getTodoSubList(subId)
  return data.map((item) => toTodoItemModel(item))
}

export const updateTodoItemService = async (
  id: number,
  todoItem: TodoItemReqDto
) => {
  await updateTodoItem(id, todoItem)
}

export const deleteTodoItemService = async (id: TodoItemModel["id"]) => {
  await deleteTodoItem(id)
}

export const setTodoCheckedService = async (
  item: TodoItemModel,
  checked: boolean
) => {
  if (item.sub_item?.length)
    await waitForWrites(
      item.sub_item.map((child) => updateTodoItemService(child.id, { checked }))
    )
  await updateTodoItemService(item.id, { checked })
  if (item.sub_id) {
    const children = await getTodoSubListService(item.sub_id)
    await updateTodoItemService(item.sub_id, {
      checked: children.length > 0 && children.every((child) => child.checked),
    })
  }
}

export const removeTodoService = async (item: TodoItemModel) => {
  await deleteTodoItemService(item.id)
  if (item.sub_id) {
    const siblings = await getTodoSubListService(item.sub_id)
    await updateTodoItemService(item.sub_id, {
      checked: siblings.length > 0 && siblings.every((child) => child.checked),
    })
  }
}

export const reorderTodoService = async (
  todos: TodoItemModel[],
  fromId: number,
  toId: number
) => {
  const next = [...todos]
  const from = next.findIndex((item) => item.id === fromId)
  const to = next.findIndex((item) => item.id === toId)
  if (from < 0 || to < 0 || from === to) return
  const [item] = next.splice(from, 1)
  next.splice(to, 0, item)
  // shortcut: ranks use separate REST writes; use a DB transaction if atomic ordering is required.
  await waitForWrites(
    next.map((todo, order) => updateTodoItemService(todo.id, { order }))
  )
}
