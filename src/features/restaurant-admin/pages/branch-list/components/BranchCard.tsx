import React from "react"
import { MapPin, Pencil, Power, PowerOff } from "lucide-react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { StatusBadge } from "@/components/common/StatusBadge"
import { cn } from "@/lib/utils"
import type { BranchListItem } from "@/types/models"

interface BranchCardProps {
  branch: BranchListItem
  onView: (branchId: number) => void
  onEdit: (branch: BranchListItem) => void
  /** Mở hộp thoại xác nhận ngừng hoạt động / kích hoạt lại. */
  onToggleStatus: (branch: BranchListItem) => void
}

/**
 * Card 1 chi nhánh — hiển thị thông tin cơ bản và cấu hình chính
 */
export const BranchCard: React.FC<BranchCardProps> = ({ branch, onView, onEdit, onToggleStatus }) => {
  const isActive = branch.status === "ACTIVE"

  return (
    <Card
      className={cn(
        "flex flex-col justify-between p-6 shadow-2xs transition-shadow hover:shadow-xs",
        !isActive && "bg-surface-muted/60",
      )}
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <h3 className="truncate text-base font-bold tracking-tight text-text-primary">{branch.name}</h3>
          <StatusBadge type="branch" status={branch.status} />
        </div>

        <div className="mt-2 flex items-center gap-1.5 text-xs text-text-tertiary">
          <MapPin className="size-3.5 shrink-0" />
          <span className="truncate">{branch.address || "Chưa có địa chỉ"}</span>
        </div>

        <div className="mt-4 space-y-3 border-t border-border-default pt-4">
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Quản lý</span>
            <span className="max-w-[60%] truncate text-right font-semibold text-text-primary">
              {branch.managerName || "Chưa phân công"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Số bàn</span>
            <span className="max-w-[60%] truncate text-right font-semibold text-text-primary">
              {branch.tableCount !== undefined && branch.tableCount !== null
                ? `${branch.tableCount} bàn`
                : "—"}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Mã số thuế</span>
            <span className="max-w-[60%] truncate text-right text-sm font-semibold text-text-primary">
              {branch.taxCode ? (
                branch.taxCode
              ) : (
                <>
                  <span className="text-text-tertiary">(dùng MST nhà hàng)</span>
                </>
              )}
            </span>
          </div>
          <div className="flex items-center justify-between text-sm">
            <span className="text-text-tertiary">Giờ mở cửa</span>
            <span className="max-w-[60%] truncate text-right font-semibold text-text-primary">
              {branch.openingHours || "08:00 - 22:00"}
            </span>
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-2 border-t border-border-default pt-4">
        <Button
          type="button"
          variant="outline"
          onClick={() => onView(branch.id)}
          className="h-10 flex-1 cursor-pointer rounded-xl border-border-default bg-surface-card font-medium text-text-primary transition-colors hover:border-border-strong hover:bg-surface-muted hover:text-text-primary"
        >
          Cấu hình chi nhánh
        </Button>

        <IconButton
          variant="row"
          size="row"
          onClick={() => onEdit(branch)}
          className="cursor-pointer"
          title="Chỉnh sửa chi nhánh"
          aria-label={`Chỉnh sửa ${branch.name}`}
        >
          <Pencil />
        </IconButton>

        <IconButton
          variant={isActive ? "row-danger" : "row"}
          size="row"
          onClick={() => onToggleStatus(branch)}
          className="cursor-pointer"
          title={isActive ? "Ngừng hoạt động" : "Kích hoạt lại"}
          aria-label={`${isActive ? "Ngừng hoạt động" : "Kích hoạt lại"} ${branch.name}`}
        >
          {isActive ? <PowerOff /> : <Power />}
        </IconButton>
      </div>
    </Card>
  )
}
