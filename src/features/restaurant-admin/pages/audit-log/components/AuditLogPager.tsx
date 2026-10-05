import React from "react"
import { ChevronLeft, ChevronRight } from "lucide-react"
import { Button } from "@/components/ui/button"

interface AuditLogPagerProps {
  /** Trang đang xem, đếm từ 0. */
  pageIndex: number
  pageSize: number
  totalElements: number
  totalPages: number
  onPageChange: (pageIndex: number) => void
  isLoading?: boolean
}

/**
 * Phân trang cho màn Nhật ký.
 *
 * Nhật ký chỉ tăng chứ không giảm, nên không thể lấy hết một lần. Bộ lọc nằm ở state của
 * trang, đổi trang không đụng tới chúng — và đổi bộ lọc thì trang nhảy về 1 (nếu không, lọc
 * xong đang đứng ở trang 7 của tập cũ sẽ ra danh sách rỗng khó hiểu).
 */
export const AuditLogPager: React.FC<AuditLogPagerProps> = ({
  pageIndex,
  pageSize,
  totalElements,
  totalPages,
  onPageChange,
  isLoading = false,
}) => {
  if (totalElements === 0) return null

  const from = pageIndex * pageSize + 1
  const to = Math.min((pageIndex + 1) * pageSize, totalElements)
  const isFirst = pageIndex <= 0
  const isLast = pageIndex >= totalPages - 1

  return (
    <div className="flex flex-wrap items-center justify-between gap-3 px-1">
      <p className="text-sm text-text-secondary">
        Đang xem <strong className="text-text-primary">{from}</strong>–
        <strong className="text-text-primary">{to}</strong> trong{" "}
        <strong className="text-text-primary">{totalElements}</strong> bản ghi
      </p>

      <div className="flex items-center gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex - 1)}
          disabled={isFirst || isLoading}
          aria-label="Trang trước"
        >
          <ChevronLeft className="size-4" />
          Trước
        </Button>

        <span className="px-1 text-sm font-medium whitespace-nowrap text-text-secondary">
          Trang {pageIndex + 1} / {Math.max(totalPages, 1)}
        </span>

        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => onPageChange(pageIndex + 1)}
          disabled={isLast || isLoading}
          aria-label="Trang sau"
        >
          Sau
          <ChevronRight className="size-4" />
        </Button>
      </div>
    </div>
  )
}
