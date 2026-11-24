import React from "react"
import { Card } from "@/components/ui/card"
import { StatusBadge } from "@/components/common/StatusBadge"
import type { BranchDetail } from "../types"

interface BranchInfoTabProps {
  branch: BranchDetail
}

/**
 * Tab "Thông tin" — Hiển thị thẻ THÔNG TIN CHI NHÁNH
 * Chuẩn theo file: Chi tiết chi nhánh -Thông tin chi nhánh.png
 *
 * Lưu ý: managerName/staffCount ẨN nếu không có dữ liệu (403 hoặc không gọi được API)
 * startDate bỏ vì BE không có field này
 */
export const BranchInfoTab: React.FC<BranchInfoTabProps> = ({ branch }) => {
  const infoRows = [
    { label: "Địa chỉ", value: branch.address },
    // Chỉ hiện nếu có dữ liệu (không gọi được API thì ẩn)
    branch.managerName ? { label: "Quản lý phụ trách", value: branch.managerName } : null,
    { label: "Số điện thoại", value: branch.phone },
    { label: "Mã số thuế", value: branch.taxCode },
    { label: "Giờ mở cửa", value: branch.openingHours },
    { label: "Số bàn", value: `${branch.tableCount} bàn` },
    // Chỉ hiện nếu có dữ liệu
    branch.staffCount > 0
      ? { label: "Số nhân viên", value: `${branch.staffCount} nhân viên` }
      : null,
    // startDate bỏ vì BE không có
  ].filter(Boolean) as Array<{ label: string; value: string }>

  return (
    <div className="pt-2">
      <Card className="max-w-3xl p-6 rounded-card border border-border-default bg-surface-card shadow-2xs">
        {/* Header của thẻ thông tin: Tiêu đề in hoa + Badge trạng thái */}
        <div className="flex items-center justify-between pb-4 border-b border-border-default">
          <span className="text-xs font-semibold uppercase tracking-wider text-text-secondary">
            THÔNG TIN CHI NHÁNH
          </span>
          <StatusBadge type="branch" status={branch.status} />
        </div>

        {/* Danh sách các cặp nhãn - giá trị */}
        <div className="divide-y divide-border-default">
          {infoRows.map((row) => (
            <div key={row.label} className="py-3.5 flex items-center justify-between text-sm">
              <span className="text-text-tertiary">{row.label}</span>
              <span className="font-semibold text-text-primary text-right">{row.value}</span>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}
