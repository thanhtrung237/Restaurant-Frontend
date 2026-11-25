import { useState } from "react"
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { Button } from "@/components/ui/button"
import { getErrorMessage } from "@/lib/http"

export function BranchActionDialog({
  label,
  name,
  description,
  blocked,
  onConfirm,
  onComplete,
  destructive = true,
}: {
  label: string
  name: string
  description: string
  blocked?: string
  onConfirm: () => Promise<void>
  onComplete?: () => void
  destructive?: boolean
}) {
  const [open, setOpen] = useState(false)
  const [pending, setPending] = useState(false)
  const [error, setError] = useState<string>()

  async function confirm() {
    setPending(true)
    setError(undefined)
    try {
      await onConfirm()
      setOpen(false)
      onComplete?.()
    } catch (error) {
      setError(getErrorMessage(error))
    } finally {
      setPending(false)
    }
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (pending) return
        setError(undefined)
        setOpen(nextOpen)
      }}
    >
      <AlertDialogTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          className={destructive ? "text-status-danger" : undefined}
        >
          {label}
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {label} · {name}
          </AlertDialogTitle>
          <AlertDialogDescription>{blocked ?? description}</AlertDialogDescription>
        </AlertDialogHeader>
        {error ? (
          <p role="alert" className="text-sm text-status-danger">
            {error}
          </p>
        ) : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>{blocked ? "Đóng" : "Hủy"}</AlertDialogCancel>
          {!blocked ? (
            <Button
              type="button"
              variant={destructive ? "destructive" : "default"}
              disabled={pending}
              onClick={() => void confirm()}
            >
              {pending ? "Đang xử lý…" : label}
            </Button>
          ) : null}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
