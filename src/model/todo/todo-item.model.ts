export type TodoItemModel = {
  id: number
  text: string
  checked: boolean
  sub_item?: TodoItemModel[] | null
  sub_id?: number | null
  category_id?: number | null
  order?: number
  created_at: string
}
