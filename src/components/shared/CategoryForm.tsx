import { FormEvent, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
export default function CategoryForm({
  name = "",
  onSave,
  onClose,
}: {
  name?: string
  onSave: (name: string) => Promise<boolean>
  onClose: () => void
}) {
  const [value, setValue] = useState(name)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const save = async (e: FormEvent) => {
    e.preventDefault()
    if (pending) return
    if (!value.trim() || value.trim().length > 60) {
      setError(
        !value.trim()
          ? "카테고리 이름을 입력해 주세요."
          : "카테고리 이름은 60자 이하로 입력해 주세요."
      )
      return
    }
    setPending(true)
    setError("")
    try {
      if (await onSave(value.trim())) onClose()
      else setError("저장하지 못했어요. 다시 시도해 주세요.")
    } catch {
      setError("저장하지 못했어요. 다시 시도해 주세요.")
    } finally {
      setPending(false)
    }
  }
  return (
    <Dialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {name ? "카테고리 이름 수정" : "카테고리 추가"}
          </DialogTitle>
          <DialogDescription>할 일을 묶을 이름을 정해요.</DialogDescription>
        </DialogHeader>
        <form onSubmit={save} className="space-y-5">
          <div>
            <label htmlFor="category-name" className="mb-2 block font-semibold">
              카테고리 이름
            </label>
            <Input
              id="category-name"
              value={value}
              disabled={pending}
              onChange={(e) => {
                setValue(e.target.value)
                setError("")
              }}
              onKeyDown={(e) => {
                if (e.nativeEvent.isComposing && e.key === "Enter")
                  e.preventDefault()
              }}
              maxLength={60}
              aria-invalid={Boolean(error)}
              aria-describedby={error ? "category-error" : undefined}
            />
            {error && (
              <p
                id="category-error"
                role="alert"
                className="mt-2 text-sm text-destructive"
              >
                {error}
              </p>
            )}
          </div>
          <div className="flex justify-end gap-3">
            <Button
              type="button"
              variant="secondary"
              disabled={pending}
              onClick={onClose}
            >
              취소
            </Button>
            <Button disabled={pending}>
              {pending ? "저장 중…" : name ? "변경 저장" : "추가"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
