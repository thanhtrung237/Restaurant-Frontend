import React, { useState, useMemo } from "react"
import { Chip } from "@/components/common/Chip"
import { TableCard } from "@/components/common/TableCard"
import { Button } from "@/components/ui/button"
import type { DiningTable, Area } from "@/types/models"
import { Loader2, Printer } from "lucide-react"

interface BranchTableQrTabProps {
  tables: DiningTable[]
  areas?: Area[]
  loading?: boolean
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
export const BranchTableQrTab: React.FC<BranchTableQrTabProps> = ({
  tables,
  areas = [],
  loading = false,
  onPrintQr,
  onEditTable,
  onPrintAllQr,
}) => {
  const [selectedArea, setSelectedArea] = useState("Tất cả khu vực")

  // Danh sách các khu vực để lọc
  const filterAreas = useMemo(() => {
    const list = ["Tất cả khu vực"]
    if (areas.length > 0) {
      areas.forEach((a) => {
        if (!list.includes(a.name)) list.push(a.name)
      })
    } else {
      // Fallback từ areaName của bàn nếu danh sách area rỗng
      tables.forEach((t) => {
        if (t.areaName && !list.includes(t.areaName)) {
          list.push(t.areaName)
        }
      })
    }
    return list
  }, [areas, tables])

  // Lọc danh sách bàn theo khu vực được chọn
  const filteredTables = useMemo(() => {
    if (selectedArea === "Tất cả khu vực") {
      return tables
    }
    return tables.filter((t) => t.areaName === selectedArea)
  }, [tables, selectedArea])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="flex flex-col items-center gap-2">
          <Loader2 className="size-8 animate-spin text-brand-primary" />
          <p className="text-xs text-text-tertiary">Đang tải danh sách bàn & QR...</p>
        </div>
      </div>
    )
  }

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

      {/* Thanh lọc khu vực dạng Chip — cuộn ngang ở màn hẹp */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] md:flex-wrap md:overflow-visible md:pb-0 [&::-webkit-scrollbar]:hidden">
        {filterAreas.map((area) => (
          <Chip
            key={area}
            selected={selectedArea === area}
            onClick={() => setSelectedArea(area)}
            className="cursor-pointer text-xs"
          >
            {area}
          </Chip>
        ))}
      </div>

      {/* Danh sách lưới các thẻ bàn */}
      {filteredTables.length === 0 ? (
        <div className="py-16 text-center text-text-tertiary rounded-card border border-border-default bg-surface-card">
          Chưa có bàn nào thuộc khu vực này
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
