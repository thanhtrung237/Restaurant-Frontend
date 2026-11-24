import { generatePath, Link } from "react-router-dom"
import { Eye, MapPin, Pencil, Power, PowerOff, SlidersHorizontal } from "lucide-react"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths/restaurant-admin.paths"
import { Card } from "@/components/ui/card"
import { buttonVariants } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { StatusBadge } from "@/components/common/StatusBadge"
import { cn } from "@/lib/utils"
import type { BranchListItem } from "@/types/models"

const branchActionClass = "h-auto min-h-11 whitespace-normal px-2 py-2 text-center"

interface BranchCardProps {
  branch: BranchListItem
  onEdit: (branch: BranchListItem) => void
  /** Mở hộp thoại xác nhận ngừng hoạt động / kích hoạt lại. */
  onToggleStatus: (branch: BranchListItem) => void
}

/**
 * Card 1 chi nhánh — hiển thị thông tin cơ bản và cấu hình chính
 */
export function BranchCard({ branch, onEdit, onToggleStatus }: BranchCardProps) {
  const isActive = branch.status === "ACTIVE"
  const branchParams = { branchId: String(branch.id) }

  return (
    <Card
      className={cn(
        "flex min-w-0 flex-col justify-between p-4 shadow-2xs transition-shadow hover:shadow-xs sm:p-5 xl:p-6",
        !isActive && "bg-surface-muted/60",
      )}
    >
      <div>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
              <h3 className="min-w-0 break-words text-base font-bold tracking-tight text-text-primary">
                {branch.name}
              </h3>
              <StatusBadge type="branch" status={branch.status} />
            </div>
            <div className="mt-1.5 flex items-center gap-1.5 text-xs text-text-tertiary">
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{branch.address || "Chưa có địa chỉ"}</span>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
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

      <div className="mt-6 grid grid-cols-2 gap-2 border-t border-border-default pt-4">
        <Link
          to={generatePath(RESTAURANT_ADMIN_PATHS.BRANCH_CONFIG, branchParams)}
          aria-label={`Cấu hình chi nhánh: ${branch.name}`}
          className={cn(buttonVariants(), branchActionClass)}
        >
          <SlidersHorizontal aria-hidden="true" />
          Cấu hình chi nhánh
        </Link>

        <Link
          to={generatePath(RESTAURANT_ADMIN_PATHS.BRANCH_DETAIL, branchParams)}
          aria-label={`Xem chi tiết: ${branch.name}`}
          className={cn(
            buttonVariants({ variant: "ghost" }),
            branchActionClass,
            "border border-border-default",
          )}
        >
          <Eye aria-hidden="true" />
          Xem chi tiết
        </Link>
      </div>
    </Card>
  )
}
