import { AlertTriangle, Trash2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import type { Category, Dish } from "@/types/models"

interface DeleteCategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  category: Category | null
  onConfirm: () => void
  isDeleting?: boolean
}

/**
 * Xác nhận xoá danh mục — CHỈ mở được khi danh mục đã rỗng.
 *
 * Danh mục còn món thì nút xoá ở bảng đã bị khoá từ trước (FR-MNU-01: *"Không cho xóa
 * danh mục còn món; phải chuyển món sang danh mục khác trước"*). Backend KHÔNG chặn việc
 * này — `deleteCategory` soft-delete kéo theo toàn bộ Dish + DishOverride — nên chốt chặn
 * nằm hoàn toàn ở FE. Xem `docs/be-issues.md`.
 */
export function DeleteCategoryDialog({
  open,
  onOpenChange,
  category,
  onConfirm,
  isDeleting = false,
}: DeleteCategoryDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-status-danger">
            <Trash2 className="size-5" />
            Xoá danh mục
          </DialogTitle>
          <DialogDescription>
            Xoá danh mục <strong className="text-text-primary">{category?.name}</strong>?
            Thao tác này không hoàn tác được.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Huỷ
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-status-danger hover:bg-status-danger/90"
          >
            {isDeleting ? "Đang xoá..." : "Xoá danh mục"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface StopSellingDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dish: Dish | null
  /** QĐ-05: số chi nhánh ĐANG BÁN món này. */
  affectedBranches?: number
  isLoadingCount?: boolean
  onConfirm: () => void
  isSaving?: boolean
}

/**
 * Xác nhận NGỪNG BÁN một món gốc — FR-MNU-04:
 * *"Món gốc bị nhà hàng ngừng bán ⇒ biến mất ở mọi chi nhánh, kể cả chi nhánh đang đè giá.
 * Hệ thống cảnh báo TRƯỚC cho người thực hiện: số chi nhánh bị ảnh hưởng."*
 *
 * QĐ-05: con số này là **số chi nhánh đang bán món**, không phải số chi nhánh đè giá như
 * trước — đếm theo bản đè giá thì một chi nhánh bán món mà không đè giá sẽ không được tính,
 * cảnh báo nhỏ hơn thực tế.
 *
 * Bán lại thì không cần xác nhận (không làm mất gì của ai).
 */
export function StopSellingDialog({
  open,
  onOpenChange,
  dish,
  affectedBranches,
  isLoadingCount = false,
  onConfirm,
  isSaving = false,
}: StopSellingDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[460px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-status-warning">
            <AlertTriangle className="size-5" />
            Ngừng bán món
          </DialogTitle>
          <DialogDescription asChild>
            <div className="space-y-2">
              <p>
                Ngừng bán <strong className="text-text-primary">{dish?.name}</strong> sẽ ẩn
                món ở <strong className="text-text-primary">tất cả chi nhánh</strong>.
              </p>
              {isLoadingCount ? (
                <p className="text-xs">Đang kiểm tra số chi nhánh đang bán món...</p>
              ) : affectedBranches && affectedBranches > 0 ? (
                <p className="rounded-lg bg-status-warning-subtle px-3 py-2 text-xs font-medium text-status-warning">
                  Món sẽ biến mất ở {affectedBranches} chi nhánh đang bán.
                </p>
              ) : null}
              <p className="text-xs">Có thể bán lại bất cứ lúc nào.</p>
            </div>
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Huỷ
          </Button>
          <Button type="button" onClick={onConfirm} disabled={isSaving}>
            {isSaving ? "Đang xử lý..." : "Ngừng bán"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

interface DeleteOptionGroupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  optionGroup: { id: number; name: string } | null
  onConfirm: () => void
  isDeleting?: boolean
}

/**
 * Xác nhận xoá nhóm tùy chọn
 */
export function DeleteOptionGroupDialog({
  open,
  onOpenChange,
  optionGroup,
  onConfirm,
  isDeleting = false,
}: DeleteOptionGroupDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[440px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-status-danger">
            <Trash2 className="size-5" />
            Xoá nhóm tùy chọn
          </DialogTitle>
          <DialogDescription>
            Bạn có chắc chắn muốn xoá nhóm tùy chọn{" "}
            <strong className="text-text-primary">{optionGroup?.name}</strong>? Toàn bộ các lựa
            chọn trong nhóm và liên kết với các món ăn sẽ bị gỡ bỏ.
          </DialogDescription>
        </DialogHeader>

        <DialogFooter className="gap-2 sm:gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isDeleting}
          >
            Huỷ
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="bg-status-danger hover:bg-status-danger/90 text-white"
          >
            {isDeleting ? "Đang xoá..." : "Xoá nhóm"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

