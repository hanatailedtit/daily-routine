import TodoInput from "@/components/input/TodoInput/TodoInput.tsx"
import type { Meta, StoryObj } from "@storybook/react"

const meta = {
  title: "TodoInput",
  component: TodoInput,
} satisfies Meta<typeof TodoInput>

export default meta

export const Default: StoryObj<typeof meta> = {
  args: {
    buttonText: "입력",
  },
}
