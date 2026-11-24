import { ShieldOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { StaffRow } from "../types"

interface DisableAccountDialogProps {
  /** Tài khoản sắp bị vô hiệu hoá; `null` = đóng hộp thoại. */
  staff: StaffRow | null
  onClose: () => void
  onConfirm: () => void
  isSaving?: boolean
}

/**
 * Xác nhận vô hiệu hoá tài khoản (QĐ-12).
 *
 * Vô hiệu hoá đẩy một người ra khỏi hệ thống NGAY: đang giữa ca thì họ mất quyền thao tác.
 * Bấm nhầm một mục trong menu "⋯" là đủ để gây ra việc đó, nên phải hỏi lại.
 *
 * Chiều ngược lại (kích hoạt lại) KHÔNG hỏi — không gây hại và người dùng thường đang sửa
 * chính cái vừa lỡ tay.
 */
export function DisableAccountDialog({
  staff,
  onClose,
  onConfirm,
  isSaving = false,
}: DisableAccountDialogProps) {
  return (
    <Dialog open={staff !== null} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-status-danger">
            <ShieldOff className="size-5" />
            Vô hiệu hoá tài khoản
          </DialogTitle>
          <DialogDescription>
            Vô hiệu hoá <strong className="text-text-primary">{staff?.fullName}</strong>?
          </DialogDescription>
        </DialogHeader>

        <p className="rounded-md bg-surface-muted px-3 py-2 text-sm text-text-secondary">
          Nhân viên sẽ không đăng nhập được cho tới khi kích hoạt lại. Dữ liệu và vết thao tác cũ
          vẫn được giữ nguyên.
        </p>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Huỷ
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className="bg-status-danger hover:bg-status-danger/90"
          >
            {isSaving ? "Đang lưu..." : "Vô hiệu hoá"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
