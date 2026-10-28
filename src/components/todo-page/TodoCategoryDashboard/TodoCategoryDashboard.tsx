import CategoryInput from "@/components/input/CategoryInput/CategoryInput.tsx"
import CategoryListItem from "@/components/list-item/CategoryListItem/CategoryListItem"
import { useTodoCategory } from "@/hooks/todo/useTodoCategory"
import { useScrollLock } from "@/hooks/utils/useScrollLock"
import { TodoCategoryModel } from "@/model/todo/todo-category.model.ts"
import { modalState } from "@/recoil/modal/modal"
import { categoryNameState } from "@/recoil/todo/todo-category"
import "@/style/todo-item-viewer.scss"
import { getTodoListPage } from "@/utils/page.utils.ts"
import { MouseEvent } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { useRecoilState } from "recoil"
import "./TodoCategoryDashboard.scoped.scss"

export default function TodoCategoryDashboard() {
  const {
    categoryList,
    clickAddTodoCategory,
    clickDeleteTodoCategory,
    clickEditTodoCategoryName,
  } = useTodoCategory()

  const [, setSearchParams] = useSearchParams()
  const navigate = useNavigate()

  const [, setModal] = useRecoilState(modalState)
  const [, setCategoryName] = useRecoilState(categoryNameState)
  const { setScrollLock, offScrollLock } = useScrollLock()

  const handleCategoryValue = (text: string) => {
    clickAddTodoCategory(text)
  }

  const handleClickCategory = (item: TodoCategoryModel) => {
    setSearchParams({ category_id: String(item.id) })
    setCategoryName(item.name)
  }

  const handleClickAllCategory = () => {
    navigate(getTodoListPage())
    setCategoryName("전체")
  }

  const setCloseModal = () => {
    setModal((item) => {
      return {
        ...item,
        isOpenModal: false,
      }
    })
  }

  const handleDeleteCategory = async (id: TodoCategoryModel["id"]) => {
    await clickDeleteTodoCategory(id)
    navigate(getTodoListPage())
    setCategoryName("전체")
    setCloseModal()
    offScrollLock()
  }

  const handleClickCancelButton = () => {
    setCloseModal()
    offScrollLock()
  }

  const handleClickDeleteButton = async (
    e: MouseEvent,
    id: TodoCategoryModel["id"]
  ) => {
    e.stopPropagation()
    setScrollLock()
    setModal((item) => {
      return {
        ...item,
        text: "정말로 삭제하시겠습니까? 카테고리 안 투두 리스트가 전부 사라집니다.",
        isOpenModal: true,
        clickOkButton: () => handleDeleteCategory(id),
        clickCalcenButton: handleClickCancelButton,
      }
    })
  }

  const handleClickEditCategoryName = (
    id: TodoCategoryModel["id"],
    name: TodoCategoryModel["name"]
  ) => {
    clickEditTodoCategoryName(id, name)
  }

  return (
    <div className="todo-category-dashboard">
      <ul className="catetory-list">
        <li className="category-item" onClick={handleClickAllCategory}>
          전체
        </li>
        {categoryList.map((item) => {
          return (
            <CategoryListItem
              key={item.id}
              item={item}
              clickCategory={handleClickCategory}
              clickDeleteButton={handleClickDeleteButton}
              clickEditName={handleClickEditCategoryName}
            />
          )
        })}
      </ul>
      <CategoryInput setCategoryValue={handleCategoryValue} />
    </div>
  )
}
