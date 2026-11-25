import { useState, type ReactNode } from "react"
import { TableCard } from "@/components/common/TableCard"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import type { DiningTable, Area } from "@/types/models"
import { Loader2, Printer } from "lucide-react"
import { groupBranchTables } from "../table-areas"

const usageOptions = [
  { value: "all", label: "Tất cả trạng thái" },
  { value: "active", label: "Đang sử dụng" },
  { value: "inactive", label: "Ngừng sử dụng" },
] as const

type UsageFilter = (typeof usageOptions)[number]["value"]

interface BranchTableQrTabProps {
  tables: DiningTable[]
  areas: Area[]
  areaFilter: string
  onAreaFilterChange: (value: string) => void
  areaAction?: ReactNode
  areasUnavailable: boolean
  onRetryAreas: () => void
  onAddTable: () => void
  loading?: boolean
  tablesUnavailable: boolean
  onRetryTables: () => void
  onPrintQr?: (table: DiningTable) => void
  onEditTable?: (table: DiningTable) => void
  /**
   * In QR hàng loạt. Ở md+ nút này nằm trên thanh tiêu đề trang; ở <md Figma
   * "Quản lý bàn & QR · Mobile (375)" đưa nó xuống đầu vùng nội dung dạng nút full-width
   * — KHÔNG bỏ, vì FR-TBL-02 yêu cầu in được hàng loạt.
   */
  onPrintAllQr?: () => void
}

/**
 * Tab "Bàn & QR" — Kết nối API thực tế:
 * - Lọc động theo danh sách khu vực (Area) từ backend
 * - Hiển thị danh sách bàn với mã QR thật
 * - Tích hợp in QR và chỉnh sửa bàn
 */
export function BranchTableQrTab({
  tables,
  areas,
  areaFilter,
  onAreaFilterChange,
  areaAction,
  areasUnavailable,
  onRetryAreas,
  onAddTable,
  loading = false,
  tablesUnavailable,
  onRetryTables,
  onPrintQr,
  onEditTable,
  onPrintAllQr,
}: BranchTableQrTabProps) {
  const [usageFilter, setUsageFilter] = useState<UsageFilter>("active")
  const tableGroups = groupBranchTables(areas, tables)
  const selectedGroup = tableGroups.get(areaFilter)
  const selectedArea = selectedGroup ? areaFilter : "all"
  const areaTables = selectedGroup?.tables ?? tables
  const filteredTables = areaTables.filter(
    (table) =>
      usageFilter === "all" || (table.status === "INACTIVE") === (usageFilter === "inactive"),
  )
  const scopeLabel = selectedArea === "all" ? "Chi nhánh này" : "Khu vực này"
  const emptyMessage =
    areaTables.length === 0
      ? `${scopeLabel} chưa có bàn.`
      : `${scopeLabel} không có bàn ${usageFilter === "inactive" ? "ngừng sử dụng" : "đang sử dụng"}.`

  return (
    <div className="space-y-5 pt-1">
      {/* <md: "In QR hàng loạt" đứng đầu nội dung (Figma mobile) */}
      {onPrintAllQr ? (
        <Button
          type="button"
          variant="outline"
          onClick={onPrintAllQr}
          className="h-11 w-full gap-2 font-semibold md:hidden"
        >
          <Printer className="size-4" />
          In QR hàng loạt
        </Button>
      ) : null}

      <div className="flex flex-wrap items-center gap-2 sm:gap-3">
        <Select value={selectedArea} onValueChange={onAreaFilterChange}>
          <SelectTrigger
            aria-label="Lọc theo khu vực"
            className="h-10 min-w-0 flex-1 basis-32 bg-surface-card sm:max-w-72 [&>span]:truncate"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">
              Tất cả khu vực{!loading && !tablesUnavailable ? ` (${tables.length})` : ""}
            </SelectItem>
            {Array.from(tableGroups, ([id, group]) => (
              <SelectItem key={id} value={id} className="whitespace-normal break-words">
                {group.name}
                {!loading && !tablesUnavailable ? ` (${group.tables.length})` : ""}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={usageFilter} onValueChange={(value: UsageFilter) => setUsageFilter(value)}>
          <SelectTrigger
            aria-label="Lọc theo trạng thái sử dụng"
            className="h-10 min-w-0 flex-1 basis-32 bg-surface-card sm:max-w-48 [&>span]:truncate"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {usageOptions.map(({ value, label }) => (
              <SelectItem key={value} value={value}>
                {label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {areaAction ? (
          <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto sm:gap-3">
            {areaAction}
          </div>
        ) : null}
      </div>
      {areasUnavailable ? (
        <div className="flex flex-wrap items-center gap-2 text-sm text-text-secondary">
          <p role="status">Không tải được danh sách khu vực.</p>
          <Button type="button" variant="link" onClick={onRetryAreas}>
            Thử lại
          </Button>
        </div>
      ) : null}

      {loading ? (
        <div
          role="status"
          className="flex items-center justify-center gap-2 py-16 text-sm text-text-secondary"
        >
          <Loader2 aria-hidden="true" className="size-5 animate-spin text-brand-primary" />
          Đang tải danh sách bàn…
        </div>
      ) : tablesUnavailable ? (
        <div className="space-y-3 rounded-card border border-border-default bg-surface-card px-4 py-10 text-center">
          <p role="alert" className="text-sm text-text-secondary">
            Không tải được danh sách bàn.
          </p>
          <Button type="button" variant="outline" onClick={onRetryTables}>
            Thử lại tải bàn
          </Button>
        </div>
      ) : filteredTables.length === 0 ? (
        <div className="space-y-3 rounded-card border border-border-default bg-surface-card px-4 py-10 text-center">
          <p className="text-sm text-text-secondary">{emptyMessage}</p>
          {areaTables.length > 0 ? (
            <Button type="button" variant="outline" onClick={() => setUsageFilter("all")}>
              Xem tất cả trạng thái
            </Button>
          ) : usageFilter !== "inactive" &&
            areas.some((area) => String(area.id) === selectedArea) ? (
            <Button type="button" variant="outline" onClick={onAddTable}>
              Thêm bàn vào khu vực
            </Button>
          ) : null}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {filteredTables.map((tbl) => (
            <TableCard
              key={tbl.id}
              table={tbl}
              variant="qr"
              areaName={tbl.areaName}
              onPrintQr={() => onPrintQr?.(tbl)}
              onEdit={() => onEditTable?.(tbl)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
