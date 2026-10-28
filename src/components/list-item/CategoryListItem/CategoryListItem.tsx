import DefaultButton from "@/components/button/DefaultButton/DefaultButton"
import MuIcon from "@/components/icon/MuIcon"
import TodoInput from "@/components/input/TodoInput/TodoInput"
import { TodoCategoryDto } from "@/model/todo/todo-category.dto"
import { TodoCategoryModel } from "@/model/todo/todo-category.model"
import { MouseEvent, useState } from "react"
import "./CategoryListItem.scoped.scss"

type CategoryListItemProps = {
  item: TodoCategoryModel
  clickCategory: (item: TodoCategoryModel) => void
  clickDeleteButton: (e: MouseEvent, id: TodoCategoryModel["id"]) => void
  clickEditName: (
    id: TodoCategoryModel["id"],
    category: TodoCategoryModel["name"]
  ) => void
}

export default function CategoryListItem({
  item,
  clickCategory,
  clickDeleteButton,
  clickEditName,
}: CategoryListItemProps) {
  const [isEditCategoryName, setIsEditCategoryName] = useState(false)

  const handleSetEditCategoryName = (text: TodoCategoryDto["name"]) => {
    clickEditName(item.id, text)
    setIsEditCategoryName(false)
  }

  const handleClickEditCategoryName = (e: MouseEvent) => {
    e.stopPropagation()
    setIsEditCategoryName(true)
  }

  const handleCancelEditCategoryName = () => {
    setIsEditCategoryName(false)
  }

  return (
    <>
      {!isEditCategoryName ? (
        <li
          className="category-list-item"
          key={item.id}
          onClick={() => clickCategory(item)}
        >
          {item.name}
          <div className="control-button">
            <div className="edit-icon" onClick={handleClickEditCategoryName}>
              <MuIcon icon="edit" cursor="pointer" />
            </div>
            <div
              className="delete-icon"
              onClick={(e: MouseEvent) => clickDeleteButton(e, item.id)}
            >
              <MuIcon icon="delete" cursor="pointer" />
            </div>
          </div>
        </li>
      ) : (
        <div className="category-edit-area">
          <div className="todo-input-wrapper">
            <TodoInput
              buttonText="수정"
              defaultInputValue={item.name}
              setTodoItemValue={handleSetEditCategoryName}
            />
          </div>
          <DefaultButton
            text="취소"
            onClickButton={handleCancelEditCategoryName}
          />
        </div>
      )}
    </>
  )
}
