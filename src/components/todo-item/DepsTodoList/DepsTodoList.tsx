import AddButton from "@/components/button/AddButton/AddButton"
import MuIcon from "@/components/icon/MuIcon"
import EditorInputWrapper from "@/components/input/EditorInputWrapper/EditorInputWrapper"
import DefaultTodoItem from "@/components/list-item/DefaultTodoItem/DefaultTodoItem"
import { useTodoList } from "@/hooks/todo/useTodoList"
import { TodoItemModel } from "@/model/todo/todo-item.model"
import { DragEvent, useState, MouseEvent } from "react"
import "./DepsTodoList.scoped.scss"

export default function DepsTodoList() {
  const {
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
  } = useTodoList()

  const [editorValue, setEditorValue] = useState("")
  const [isClickAddButton, setIsClickAddButton] = useState(false)
  const handleClickSubmitButton = async () => {
    await enterTodoItem(editorValue)
    setEditorValue("")
    setIsClickAddButton(false)
  }

  const handleClickAddButton = () => {
    setIsClickAddButton(true)
  }

  const handleClickCancelButton = () => {
    setEditorValue("")
    setIsClickAddButton(false)
  }

  const handleDragStartTodoItem = (e: DragEvent, item: TodoItemModel) => {
    dragStartTodoItem(e, item)
  }

  const handleDragEndTodoItem = (e: DragEvent) => {
    dragEndTodoItem(e)
  }

  const handleMouseOverTodoWrapper = (e: MouseEvent) => {
    mouseOverItemWrapper(e)
  }

  const handleMouseOutTodoWrapper = (e: MouseEvent) => {
    mouseOutItemWrapper(e)
  }

  return (
    <div className="deps-todo-item">
      {todoList.map((item) => {
        const subItem = item.sub_item?.map((sub) => {
          return (
            <div className="two-deps-todo-item" key={sub.id}>
              <DefaultTodoItem
                item={sub}
                clickCheckbox={clickCheckboxButton}
                clickDelete={clickDeleteButton}
                editTodoItem={editTodoItemValue}
                isShowAddButton={false}
              />
            </div>
          )
        })
        return (
          <div
            key={item.id}
            data-id={String(item.id)}
            onMouseOver={handleMouseOverTodoWrapper}
            onMouseOut={handleMouseOutTodoWrapper}
            className="todo-drop-target"
          >
            <div
              onDragStart={(e) => handleDragStartTodoItem(e, item)}
              onDragEnd={handleDragEndTodoItem}
              draggable
              className="todo-drag-handle"
            >
              <MuIcon icon="drag_indicator" size={25} cursor="pointer" />
            </div>

            <div className="todo-item-position">
              <div className="one-deps-todo-item" id={`todo-item-${item.id}`}>
                <div className="todo-item-wrapper">
                  <DefaultTodoItem
                    item={item}
                    clickCheckbox={clickCheckboxButton}
                    clickDelete={clickDeleteButton}
                    editTodoItem={editTodoItemValue}
                    enterTodoItem={enterTodoItem}
                  />
                  <div className="two-deps-todo-item">{subItem}</div>
                </div>
              </div>
            </div>
          </div>
        )
      })}

      {isClickAddButton ? (
        <EditorInputWrapper
          editorValue={editorValue}
          clickCancelButton={handleClickCancelButton}
          clickSubmitButton={handleClickSubmitButton}
          setEditorValue={setEditorValue}
        />
      ) : (
        <div className="add-todo-list-area">
          <AddButton
            text="투두리스트 추가"
            clickAddButton={handleClickAddButton}
          />
          <AddButton
            text="랜덤 투두리스트 추가"
            clickAddButton={clickRandomTodoListButton}
            color="rgb(var(--theme))"
          />
        </div>
      )}
    </div>
  )
}
