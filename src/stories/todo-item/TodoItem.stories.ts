import type { Meta, StoryObj } from "@storybook/react"

import DefaultTodoItem from "@/components/list-item/DefaultTodoItem/DefaultTodoItem"

const meta = {
  title: "DefaultTodoItem",
  component: DefaultTodoItem,
} satisfies Meta<typeof DefaultTodoItem>

export default meta

export const Default: StoryObj<typeof meta> = {
  args: {
    item: { id: 0, text: "꽃에 물 주기", checked: true, created_at: "" },
  },
}
