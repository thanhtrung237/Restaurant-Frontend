import React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { BranchItem } from "../types"

interface DeleteBranchDialogProps {
  branch: BranchItem | null
  isOpen: boolean
  onClose: () => void
  onConfirm: () => void
}

/**
 * Hộp thoại xác nhận xóa chi nhánh
 */
export const DeleteBranchDialog: React.FC<DeleteBranchDialogProps> = ({
  branch,
  isOpen,
  onClose,
  onConfirm,
}) => {
  if (!branch) return null

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Xóa chi nhánh</DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn xóa chi nhánh{" "}
            <span className="font-semibold text-text-primary">
              &quot;{branch.name}&quot;
            </span>
            ? Dữ liệu bàn, cấu hình và báo cáo liên quan sẽ bị ảnh hưởng. Thao tác này không thể hoàn tác.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="pt-3">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            className="cursor-pointer"
          >
            Hủy
          </Button>
          <Button
            type="button"
            variant="destructive"
            onClick={onConfirm}
            className="cursor-pointer"
          >
            Xác nhận xóa
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
