import {
  TodoItemDto,
  TodoItemReqDto,
  toTodoItemModel,
} from "@/model/todo/todo-item.dto"
import { TodoItemModel } from "@/model/todo/todo-item.model"
import {
  addTodoItem,
  deleteTodoItem,
  getTodoItem,
  getTodoList,
  getTodoSubList,
  updateTodoItem,
} from "@/repository/todo/todo-item.repository"

export const getTodoListService = async (
  userId: TodoItemDto["user_id"],
  categoryId: string | null
) => {
  const data = await getTodoList(userId, categoryId)
  const subData = data.filter((item) => item.sub_id)

  const todoList = data.map((item) => {
    const subList = subData
      .filter((sub) => sub.sub_id === item.id)
      .map((item) => toTodoItemModel(item))

    return {
      ...toTodoItemModel(item),
      sub_item: subList.length > 0 ? subList : null,
    }
  })

  return todoList.filter((item) => !item.sub_id)
}

export const getTodoListItemService = async (id: TodoItemDto["id"]) => {
  const data = await getTodoItem(id)
  if (!data) return
  return toTodoItemModel(data)
}

export const getTodoSubListService = async (subId: TodoItemDto["sub_id"]) => {
  const data = await getTodoSubList(subId)
  return data.map((item) => toTodoItemModel(item))
}

export const addTodoListSerivce = async (
  text: string,
  itemId: TodoItemDto["id"] | null,
  userId: TodoItemDto["user_id"],
  categoryId: string | null
) => {
  const todoReq: TodoItemReqDto = {
    todo_text: text,
    user_id: userId,
    sub_id: itemId,
  }
  if (categoryId) todoReq["category_id"] = Number(categoryId)
  await addTodoItem(todoReq)
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
    await Promise.all(
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
  await Promise.all(
    next.map((todo, order) => updateTodoItemService(todo.id, { order }))
  )
}
