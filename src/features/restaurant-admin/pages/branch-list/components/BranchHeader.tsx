import React from "react"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BranchHeaderProps {
  totalBranches: number
  onAddBranch: () => void
}

/**
 * Header màn hình Quản lý chi nhánh
 * Hiển thị tiêu đề, số lượng chi nhánh kèm mô tả và nút thêm mới
 */
export const BranchHeader: React.FC<BranchHeaderProps> = ({
  totalBranches,
  onAddBranch,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">Chi nhánh</h1>
        <p className="text-sm text-text-tertiary mt-1">
          {totalBranches} chi nhánh · mỗi chi nhánh có cấu hình, bàn và báo cáo riêng
        </p>
      </div>

      <Button
        type="button"
        onClick={onAddBranch}
        className="cursor-pointer gap-1.5 self-start sm:self-auto"
      >
        <Plus className="size-4 stroke-[2.5]" />
        <span>Thêm chi nhánh</span>
      </Button>
    </div>
  )
}
