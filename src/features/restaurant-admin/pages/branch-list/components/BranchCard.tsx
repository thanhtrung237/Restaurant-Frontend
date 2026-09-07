import React from "react"
import { MapPin, Pencil, Trash2 } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { StatusBadge } from "@/components/common/StatusBadge"
import type { BranchItem } from "../types"

interface BranchCardProps {
  branch: BranchItem
  onView: (branchId: number) => void
  onEdit: (branch: BranchItem) => void
  onDelete: (branch: BranchItem) => void
}

/**
 * Card hiển thị thông tin từng chi nhánh trong danh sách Grid
 * Chuẩn theo thiết kế: Desktop / Quản lý chi nhánh.png
 */
export const BranchCard: React.FC<BranchCardProps> = ({
  branch,
  onView,
  onEdit,
  onDelete,
}) => {
  return (
    <Card className="p-6 flex flex-col justify-between shadow-2xs hover:shadow-xs transition-shadow">
      <div>
        {/* Hàng trên cùng: Tên chi nhánh & Badge trạng thái */}
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-base font-bold text-text-primary tracking-tight truncate">
            {branch.name}
          </h3>
          <StatusBadge type="branch" status={branch.status} />
        </div>

        {/* Địa chỉ chi nhánh */}
        <div className="flex items-center gap-1.5 mt-2 text-xs text-text-tertiary">
          <MapPin className="size-3.5 shrink-0 text-text-tertiary" />
          <span className="truncate">{branch.address}</span>
        </div>

        {/* Thông tin chi tiết 4 dòng: Quản lý / Số bàn / Mã số thuế / Giờ mở cửa */}
        <div className="mt-5 space-y-3 pt-1">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Quản lý</span>
            <span className="font-semibold text-text-primary text-right truncate max-w-[60%]">
              {branch.managerName || "Chưa phân công"}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Số bàn</span>
            <span className="font-semibold text-text-primary text-right">
              {branch.tableCount} bàn
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Mã số thuế</span>
            <span className="font-semibold text-text-primary text-right truncate max-w-[60%]">
              {branch.taxCode}
            </span>
          </div>

          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Giờ mở cửa</span>
            <span className="font-semibold text-text-primary text-right">
              {branch.openingHours}
            </span>
          </div>
        </div>
      </div>

      {/* Hàng thao tác dưới cùng: Cấu hình chi nhánh / Sửa / Xoá */}
      <div className="mt-6 pt-2 flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          onClick={() => onView(branch.id)}
          className="flex-1 h-10 rounded-xl border-border-default bg-surface-card text-text-primary font-medium hover:bg-surface-muted hover:border-border-strong hover:text-text-primary transition-colors cursor-pointer"
        >
          Xem chi tiết
        </Button>

        <IconButton
          type="button"
          variant="subtle"
          size="default"
          onClick={() => onEdit(branch)}
          className="rounded-xl text-text-secondary hover:text-text-primary cursor-pointer"
          title="Chỉnh sửa chi nhánh"
          aria-label="Chỉnh sửa chi nhánh"
        >
          <Pencil className="size-4" />
        </IconButton>

        <IconButton
          type="button"
          variant="ghost"
          size="default"
          onClick={() => onDelete(branch)}
          className="rounded-xl text-status-danger hover:bg-status-danger-subtle hover:text-status-danger cursor-pointer"
          title="Xoá chi nhánh"
          aria-label="Xoá chi nhánh"
        >
          <Trash2 className="size-4" />
        </IconButton>
      </div>
    </Card>
  )
}
