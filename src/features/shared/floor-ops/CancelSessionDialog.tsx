import { useId, useRef, useState } from "react"
import { TriangleAlert } from "lucide-react"
import { useCancelSession } from "@/api/table-sessions.api"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/http"

export function CancelSessionDialog({
  open,
  onOpenChange,
  sessionId,
  tableName,
  onCancelled,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  sessionId?: number
  tableName: string
  onCancelled: () => void
}) {
  const inputId = useId()
  const [reason, setReason] = useState("")
  const submitting = useRef(false)
  const cancellation = useCancelSession()
  const { toast } = useToast()

  function close() {
    setReason("")
    onOpenChange(false)
  }

  async function confirm() {
    if (!sessionId || !reason.trim() || submitting.current) return
    submitting.current = true
    try {
      await cancellation.mutateAsync({ id: sessionId, reason: reason.trim() })
      close()
      toast({
        title: "Đã hủy phiên",
        description: "Bàn đã về trạng thái Trống.",
        variant: "success",
      })
      onCancelled()
    } catch (error) {
      toast({
        title: "Không hủy được phiên",
        description: getErrorMessage(error),
        variant: "danger",
      })
    } finally {
      submitting.current = false
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!nextOpen && !submitting.current) close()
      }}
    >
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-status-danger">
            <TriangleAlert className="size-5 shrink-0" aria-hidden="true" />
            Hủy phiên {tableName}?
          </DialogTitle>
          <DialogDescription>Hủy phiên sẽ giải phóng bàn về trạng thái Trống.</DialogDescription>
        </DialogHeader>
        <form
          onSubmit={(event) => {
            event.preventDefault()
            void confirm()
          }}
        >
          <div className="space-y-2 pb-4">
            <label htmlFor={inputId} className="text-sm font-medium text-text-primary">
              Lý do hủy <span className="text-status-danger">*</span>
            </label>
            <Input
              id={inputId}
              value={reason}
              onChange={(event) => setReason(event.target.value)}
              placeholder="VD: Khách đổi ý, chưa gọi món"
              maxLength={500}
              required
              disabled={cancellation.isPending}
            />
            <p className="text-xs text-text-tertiary">Lý do được ghi vào nhật ký hoạt động.</p>
          </div>
          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={close}
              disabled={cancellation.isPending}
            >
              Giữ lại
            </Button>
            <Button
              type="submit"
              disabled={!sessionId || !reason.trim() || cancellation.isPending}
              className="bg-status-danger text-white hover:bg-status-danger/90"
            >
              {cancellation.isPending ? "Đang hủy..." : "Xác nhận hủy phiên"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
