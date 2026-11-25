import { toast } from "sonner"
import type { MouseEvent } from "react"
import { useDeleteDishOverride } from "@/api/dish-overrides.api"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { BranchMenuItem } from "@/types/models"

// ============================================================================
// Types
// ============================================================================

interface DeleteOverrideDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  dish: BranchMenuItem | null
  overrideId: number | null
}

// ============================================================================
// Component
// ============================================================================

export function DeleteOverrideDialog({
  open,
  onOpenChange,
  dish,
  overrideId,
}: DeleteOverrideDialogProps) {
  const deleteMutation = useDeleteDishOverride()

  const handleDelete = async (event: MouseEvent<HTMLButtonElement>) => {
    event.preventDefault()
    if (!overrideId || deleteMutation.isPending) return

    try {
      await deleteMutation.mutateAsync(overrideId)
      toast.success("Đã xóa ghi đè")
      onOpenChange(false)
    } catch (error) {
      toast.error("Không thể xóa ghi đè")
      console.error("Delete override error:", error)
    }
  }

  if (!dish) return null

  return (
    <AlertDialog
      open={open}
      onOpenChange={(nextOpen) => {
        if (!deleteMutation.isPending) onOpenChange(nextOpen)
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Xóa ghi đè</AlertDialogTitle>
          <AlertDialogDescription asChild>
            <div className="space-y-2">
              <p>
                Xác nhận xóa ghi đè cho món <strong>{dish.dishName}</strong> tại chi nhánh này?
              </p>
              <div className="rounded-md border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">
                <p className="font-medium">⚠️ Lưu ý:</p>
                <ul className="mt-1 list-inside list-disc space-y-1">
                  <li>Món sẽ trở về giá gốc của nhà hàng</li>
                  {dish.isHidden && (
                    <li>
                      <strong>Trạng thái ẩn sẽ bị mất</strong> - món sẽ hiện lại trên menu
                    </li>
                  )}
                </ul>
              </div>
            </div>
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleteMutation.isPending}>Hủy</AlertDialogCancel>
          <AlertDialogAction
            onClick={handleDelete}
            disabled={deleteMutation.isPending}
            className="bg-red-600 text-white hover:bg-red-700"
          >
            {deleteMutation.isPending ? "Đang xóa..." : "Xóa ghi đè"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
