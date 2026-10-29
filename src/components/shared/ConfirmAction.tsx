import { useState } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
export default function ConfirmAction({
  title,
  description,
  onConfirm,
  onClose,
}: {
  title: string
  description: string
  onConfirm: () => Promise<void>
  onClose: () => void
}) {
  const [pending, setPending] = useState(false)
  const [error, setError] = useState("")
  const confirm = async () => {
    setPending(true)
    setError("")
    try {
      await onConfirm()
      onClose()
    } catch {
      setError("삭제하지 못했어요. 연결을 확인하고 다시 시도해 주세요.")
    } finally {
      setPending(false)
    }
  }
  return (
    <AlertDialog
      open
      onOpenChange={(open) => {
        if (!open && !pending) onClose()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>{title}</AlertDialogTitle>
          <AlertDialogDescription>{description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error && (
          <p role="alert" className="text-sm text-destructive">
            {error}
          </p>
        )}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>취소</AlertDialogCancel>
          <Button variant="destructive" disabled={pending} onClick={confirm}>
            {pending ? "삭제 중…" : "삭제"}
          </Button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
