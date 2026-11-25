import * as React from "react"
import { Inbox } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface EmptyStateProps {
  /** Icon minh hoạ, đặt trong vòng tròn xám. Bỏ trống thì dùng icon hộp rỗng mặc định. */
  icon?: React.ComponentType<{ className?: string }>
  title: string
  description?: string
  /** Nút hành động chính, thường là nút tạo mới của màn. */
  action?: { label: string; onClick: () => void }
  className?: string
}

/**
 * EmptyState — khung "chưa có dữ liệu" dùng chung.
 *
 * Figma vẽ trạng thái rỗng thành một THẺ TRẮNG cao: vòng tròn icon, tiêu đề, mô tả, rồi
 * nút hành động (xem "Khuyến mãi · Rỗng", "Nhân viên · Rỗng", "Nhật ký · Rỗng",
 * "Chi nhánh · Rỗng").
 *
 * Phân biệt hai trạng thái rỗng — nơi gọi tự chọn nội dung:
 *  - CHƯA CÓ DỮ LIỆU  → kèm `action` để người dùng tạo mới ngay.
 *  - LỌC KHÔNG RA GÌ  → KHÔNG kèm `action`; mô tả gợi ý đổi bộ lọc.
 */
export function EmptyState({
  icon: Icon = Inbox,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-card bg-surface-card px-5 py-10 text-center whitespace-normal sm:px-8 sm:py-14",
        className,
      )}
    >
      <span className="flex size-14 items-center justify-center rounded-2xl border border-brand-primary/10 bg-brand-primary-subtle text-brand-primary">
        <Icon className="size-6" />
      </span>

      <h3 className="mt-4 text-base font-bold text-text-primary">{title}</h3>

      {description ? (
        <p className="mt-1.5 max-w-sm text-sm leading-relaxed text-text-tertiary">{description}</p>
      ) : null}

      {action ? (
        <Button type="button" onClick={action.onClick} className="mt-6 h-11 px-5">
          {action.label}
        </Button>
      ) : null}
    </div>
  )
}
