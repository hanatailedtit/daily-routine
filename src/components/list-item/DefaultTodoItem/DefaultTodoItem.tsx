import checkImage from "@/assets/images/todo-item/check-image.webp"
import MuIcon from "@/components/icon/MuIcon.tsx"
import EditorInputWrapper from "@/components/input/EditorInputWrapper/EditorInputWrapper"
import { TodoItemModel } from "@/model/todo/todo-item.model.ts"
import { useState } from "react"
import "./DefaultTodoItem.scoped.scss"

type DefaultTodoItemProps = {
  item: TodoItemModel
  clickCheckbox: (id: number, checked: boolean) => void
  editTodoItem: (id: number, text: string) => void
  clickDelete: (id: number) => void
  enterTodoItem?: (text: string, itemId?: TodoItemModel["id"]) => void
  isShowAddButton?: boolean
}

export default function DefaultTodoItem({
  item,
  clickCheckbox,
  clickDelete,
  editTodoItem,
  enterTodoItem,
  isShowAddButton = true,
}: DefaultTodoItemProps) {
  const [isClickEdit, setIsClickEdit] = useState(false)
  const [isClickAdd, setIsClickAdd] = useState(false)
  const [editorValue, setEditorValue] = useState("")
  const [editEditorValue, setEditEditorValue] = useState(item.text)

  const handleClickCheckbox = () => {
    clickCheckbox(item.id, !item.checked)
  }

  const handleClickDeleteButton = () => {
    clickDelete(item.id)
  }

  const handleClickEditButton = () => {
    setIsClickEdit(!isClickEdit)
  }

  const handleEditValue = () => {
    editTodoItem(item.id, editEditorValue)
    setIsClickEdit(false)
  }

  const handleSetEditorValue = (value: string) => {
    setEditEditorValue(value)
  }

  const handleCancelEdit = () => {
    setIsClickEdit(false)
  }

  const handleClickSubmitButton = () => {
    if (!enterTodoItem) return
    enterTodoItem(editorValue, item.id)
    setIsClickAdd(false)
    setEditorValue("")
  }

  const handleClickAddButton = () => {
    setIsClickAdd(true)
  }

  const handleClickCancelButton = () => {
    setEditorValue("")
    setIsClickAdd(false)
  }

  return (
    <>
      <div className="default-todo-item">
        <div className="default-todo-item-inner">
          {!isClickEdit ? (
            <>
              <div className="todo-item">
                <div className="check-box" onClick={handleClickCheckbox}>
                  {item.checked && (
                    <img
                      className="check-image"
                      src={checkImage}
                      alt="check-image"
                    />
                  )}
                </div>
                <div
                  className="todo-text"
                  dangerouslySetInnerHTML={{ __html: item.text }}
                />
              </div>
            </>
          ) : (
            <div className="todo-item-edit-input">
              <div className="input-area">
                <EditorInputWrapper
                  editorValue={editEditorValue}
                  setEditorValue={handleSetEditorValue}
                  clickCancelButton={handleCancelEdit}
                  clickSubmitButton={handleEditValue}
                />
              </div>
            </div>
          )}
          {!isClickEdit && (
            <div className="control-todo-item">
              {isShowAddButton && (
                <MuIcon
                  icon="add"
                  cursor="pointer"
                  clickIcon={handleClickAddButton}
                />
              )}
              <MuIcon
                icon="edit"
                cursor="pointer"
                clickIcon={handleClickEditButton}
              />
              <MuIcon
                icon="delete"
                cursor="pointer"
                clickIcon={handleClickDeleteButton}
              />
            </div>
          )}
        </div>
      </div>

      {isClickAdd && (
        <div className="editor-container">
          <EditorInputWrapper
            editorValue={editorValue}
            setEditorValue={setEditorValue}
            clickSubmitButton={handleClickSubmitButton}
            clickCancelButton={handleClickCancelButton}
          />
        </div>
      )}
    </>
  )
}
