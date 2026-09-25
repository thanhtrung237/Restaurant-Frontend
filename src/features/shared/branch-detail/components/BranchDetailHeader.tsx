import React from "react"
import { Printer, Plus, Settings2 } from "lucide-react"
import { Button } from "@/components/ui/button"

interface BranchDetailHeaderActionsProps {
  activeTab: string
  onConfigBranch?: () => void
  onPrintAllQr?: () => void
  onAddTable?: () => void
}

/**
 * Cụm nút bên phải thanh tiêu đề màn Chi tiết chi nhánh.
 * Nút đổi theo tab đang mở, đúng bản Figma Desktop.
 * Tiêu đề/dòng phụ do PageHeader lo.
 */
export const BranchDetailHeaderActions: React.FC<BranchDetailHeaderActionsProps> = ({
  activeTab,
  onConfigBranch,
  onPrintAllQr,
  onAddTable,
}) => {
  if (activeTab === "table-qr") {
    return (
      <>
        <Button
          type="button"
          variant="outline"
          onClick={onPrintAllQr}
          className="h-10 gap-1.5 border-border-default bg-surface-card px-4 text-text-primary hover:border-border-strong hover:bg-surface-muted"
        >
          <Printer className="size-4" />
          <span>In QR hàng loạt</span>
        </Button>

        <Button type="button" onClick={onAddTable} className="h-10 gap-1.5 px-4">
          <Plus className="size-4 stroke-[2.5]" />
          <span>Thêm bàn</span>
        </Button>
      </>
    )
  }

  return (
    <Button type="button" onClick={onConfigBranch} className="h-10 gap-1.5 px-4">
      <Settings2 className="size-4" />
      <span>Cấu hình chi nhánh</span>
    </Button>
  )
}
