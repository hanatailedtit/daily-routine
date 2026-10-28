import { CHART_TYPE } from "@/constants/chart/chart-type.constants"
import { TodoCategoryDto } from "@/model/todo/todo-category.dto"
import { TodoItemModel } from "@/model/todo/todo-item.model"
import {
  categoryTodoListOptionsService,
  checkTodoListOptionsService,
  dateTodoListOptionsService,
} from "@/service/chart/chart.service"
import supabaseAdmin from "@/supabase/init"
import { SeriesOptionsType, XAxisOptions } from "highcharts"
import { useCallback, useEffect, useState } from "react"

export const useChartSeries = (
  type: string,
  todoList: TodoItemModel[],
  categoryList: TodoCategoryDto[]
) => {
  const [series, setSeries] = useState<SeriesOptionsType[]>([])
  const [xAxis, setXAxis] = useState<XAxisOptions>({})

  const fetchChartData = useCallback(async () => {
    const { data } = await supabaseAdmin.auth.getSession()
    if (!data.session) return
    switch (type) {
      case CHART_TYPE.checkTodo: {
        const { series } = await checkTodoListOptionsService(todoList)
        setSeries(series)
        break
      }
      case CHART_TYPE.dateTodo: {
        const { series, xAxis } = await dateTodoListOptionsService(todoList)
        setSeries(series)
        setXAxis(xAxis)
        break
      }
      case CHART_TYPE.categoryTodo: {
        const { series, xAxis } = await categoryTodoListOptionsService(
          todoList,
          categoryList
        )
        setSeries(series)
        setXAxis(xAxis)
        break
      }
    }
  }, [type, todoList, categoryList])

  useEffect(() => {
    fetchChartData()
  }, [fetchChartData])

  return {
    series,
    xAxis,
  }
}
