import { HIGHCHARTS_TYPE } from "@/constants/chart/chart-type.constants"
import { TodoCategoryDto } from "@/model/todo/todo-category.dto"
import { TodoItemModel } from "@/model/todo/todo-item.model"
import { parseDateToFormat } from "@/utils/date.utils"

export const checkTodoListOptionsService = async (
  todoList: TodoItemModel[]
) => {
  const todoListSize = todoList.length

  const checkedList = todoList.filter((item) => item.checked)
  const checkedListSize = checkedList.length
  const uncheckedListSize = todoListSize - checkedListSize

  const checkPercentage = (checkedListSize / todoListSize) * 100
  const uncheckedPercent = (uncheckedListSize / todoListSize) * 100

  const data = [
    {
      name: "완료",
      y: Number(checkPercentage.toFixed(2)),
    },
    {
      name: "미완료",
      y: Number(uncheckedPercent.toFixed(2)),
    },
  ]
  const series = [
    {
      type: HIGHCHARTS_TYPE.pie,
      name: "할일 통계",
      data,
    },
  ]
  return {
    series,
  }
}

export const dateTodoListOptionsService = async (todoList: TodoItemModel[]) => {
  const dateList = todoList.map((item) => parseDateToFormat(item.created_at))
  const deduplicationList = dateList.filter(
    (item, index) => dateList.indexOf(item) === index
  )

  const unCheckedList = deduplicationList.map((date) => {
    let count = 0
    todoList
      .filter((item) => !item.checked)
      .forEach((item) => {
        const parsedDate = parseDateToFormat(item.created_at)
        if (date === parsedDate) ++count
      })
    return count
  })

  const checkedList = deduplicationList.map((date) => {
    let count = 0
    todoList
      .filter((item) => item.checked)
      .forEach((item) => {
        const parsedDate = parseDateToFormat(item.created_at)
        if (date === parsedDate) ++count
      })
    return count
  })

  const series = [
    {
      type: HIGHCHARTS_TYPE.column,
      name: "완료",
      data: checkedList,
    },
    {
      type: HIGHCHARTS_TYPE.column,
      name: "미완료",
      data: unCheckedList,
    },
  ]

  const xAxis = {
    categories: deduplicationList,
  }
  return {
    series,
    xAxis,
  }
}

export const categoryTodoListOptionsService = async (
  todoList: TodoItemModel[],
  categoryList: TodoCategoryDto[]
) => {
  const categoryNameList = categoryList?.map((item) => item.name)

  const checkedList = categoryList?.map((item) => {
    const parsedTodoList = todoList
      .filter((todo) => item.id === todo.category_id)
      .filter((todo) => todo.checked)
    return parsedTodoList.length
  })

  const unCheckedList = categoryList?.map((item) => {
    const parsedTodoList = todoList
      .filter((todo) => item.id === todo.category_id)
      .filter((todo) => !todo.checked)
    return parsedTodoList.length
  })

  const series = [
    {
      type: HIGHCHARTS_TYPE.column,
      name: "완료",
      data: checkedList,
    },
    {
      type: HIGHCHARTS_TYPE.column,
      name: "미완료",
      data: unCheckedList,
    },
  ]

  const xAxis = {
    categories: categoryNameList,
  }

  return {
    series,
    xAxis,
  }
}
