import React from "react"
import { Printer, Plus, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { BranchDetail } from "../types"

interface BranchDetailHeaderProps {
  branch: BranchDetail
  activeTab: string
  onConfigBranch?: () => void
  onPrintAllQr?: () => void
  onAddTable?: () => void
}

/**
 * Header dùng chung cho màn hình Chi tiết chi nhánh
 * Hiển thị tên, địa chỉ, quản lý và nút hành động góc phải phù hợp với từng tab
 */
export const BranchDetailHeader: React.FC<BranchDetailHeaderProps> = ({
  branch,
  activeTab,
  onConfigBranch,
  onPrintAllQr,
  onAddTable,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          {branch.name}
        </h1>
        <p className="text-sm text-text-tertiary mt-0.5">
          {branch.address} · Quản lý: {branch.managerName}
        </p>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Nút hành động thay đổi theo từng tab theo đúng ảnh thiết kế */}
        {activeTab === "table-qr" ? (
          <>
            <Button
              type="button"
              variant="outline"
              onClick={onPrintAllQr}
              className="cursor-pointer gap-1.5 h-10 px-4 rounded-xl border-border-default bg-surface-card text-text-primary hover:bg-surface-muted hover:border-border-strong text-sm font-medium"
            >
              <Printer className="size-4" />
              <span>In QR hàng loạt</span>
            </Button>

            <Button
              type="button"
              onClick={onAddTable}
              className="cursor-pointer gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold"
            >
              <Plus className="size-4 stroke-[2.5]" />
              <span>Thêm bàn</span>
            </Button>
          </>
        ) : (
          <Button
            type="button"
            onClick={onConfigBranch}
            className="cursor-pointer gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold"
          >
            <Settings2 className="size-4" />
            <span>Cấu hình chi nhánh</span>
          </Button>
        )}
      </div>
    </div>
  )
}
