import type { Meta, StoryObj } from "@storybook/react"
import { Button } from "@/components/ui/button"
const meta = {
  title: "UI/Button",
  component: Button,
  parameters: { layout: "centered" },
} satisfies Meta<typeof Button>
export default meta
export const Primary: StoryObj<typeof meta> = {
  args: { children: "할 일 추가" },
}
export const Secondary: StoryObj<typeof meta> = {
  args: { children: "취소", variant: "secondary" },
}
