import DepsTodoList from "@/components/todo-item/DepsTodoList/DepsTodoList"
import "./TodoDashboard.scoped.scss"
import { useMemo } from "react"
import { useTodoCategory } from "@/hooks/todo/useTodoCategory"

export default function TodoDashboard() {
  const { category } = useTodoCategory()
  const categoryName = useMemo(() => category?.name || "전체", [category])

  return (
    <div className="todo-dash-board">
      <p>{categoryName}</p>
      <div className="todo-list-container">
        <DepsTodoList />
      </div>
    </div>
  )
}
