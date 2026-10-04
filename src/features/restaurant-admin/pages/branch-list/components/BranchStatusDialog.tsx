import { Power, PowerOff } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { BranchListItem } from "@/types/models"

interface BranchStatusDialogProps {
  /** Chi nhánh sắp đổi trạng thái; `null` = đóng hộp thoại. Hướng đổi suy từ `status` hiện tại. */
  branch: BranchListItem | null
  onClose: () => void
  onConfirm: () => void
  isSaving?: boolean
}

/**
 * Xác nhận ngừng hoạt động / kích hoạt lại chi nhánh (`PUT /branches/{id}/status`).
 *
 * KHÔNG có "Xóa chi nhánh": chi nhánh đã có giao dịch chỉ được ngừng hoạt động (FR-BRN-01),
 * còn `DELETE /branches/{id}` ở BE xóa mềm kèm cascade bàn / khu vực / bản đè giá mà không
 * kiểm tra giao dịch.
 */
export function BranchStatusDialog({ branch, onClose, onConfirm, isSaving = false }: BranchStatusDialogProps) {
  const deactivating = branch?.status === "ACTIVE"

  return (
    <Dialog open={branch !== null} onOpenChange={(open) => !open && !isSaving && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle
            className={
              deactivating ? "flex items-center gap-2 text-status-danger" : "flex items-center gap-2"
            }
          >
            {deactivating ? <PowerOff className="size-5" /> : <Power className="size-5" />}
            {deactivating ? "Ngừng hoạt động chi nhánh" : "Kích hoạt lại chi nhánh"}
          </DialogTitle>
          <DialogDescription>
            {deactivating ? "Ngừng hoạt động " : "Kích hoạt lại "}
            <strong className="text-text-primary">{branch?.name}</strong>?
          </DialogDescription>
        </DialogHeader>

        {deactivating ? (
          <ul className="list-disc space-y-1.5 rounded-md bg-surface-muted py-3 pl-8 pr-3 text-sm text-text-secondary">
            <li>Chi nhánh sẽ không mở được phiên bàn mới; nút mở bàn và đặt bàn bị ẩn.</li>
            <li>
              Dữ liệu lịch sử (hóa đơn, đơn gọi món) và báo cáo của chi nhánh vẫn xem được, không bị xóa.
            </li>
            <li>Phiên bàn đang phục vụ không bị đóng tự động — hãy thu tiền và đóng bàn trước.</li>
            <li>Có thể kích hoạt lại bất cứ lúc nào.</li>
          </ul>
        ) : (
          <p className="rounded-md bg-surface-muted px-3 py-2 text-sm text-text-secondary">
            Chi nhánh hoạt động trở lại: có thể mở bàn và nhận đặt bàn mới. Dữ liệu cũ được giữ nguyên.
          </p>
        )}

        <DialogFooter className="gap-2 sm:gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSaving}>
            Huỷ
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isSaving}
            className={deactivating ? "bg-status-danger hover:bg-status-danger/90" : undefined}
          >
            {isSaving ? "Đang lưu..." : deactivating ? "Ngừng hoạt động" : "Kích hoạt lại"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
