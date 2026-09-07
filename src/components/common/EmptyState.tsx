import type { LucideIcon } from "lucide-react"
import { ShoppingCart } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
  className?: string
}

/**
 * EmptyState — khớp component "Empty State" trong UI Component (Figma):
 * padding 24px, gap 16px, icon tròn nền surface/muted, tiêu đề text/primary,
 * mô tả text/tertiary, nút hành động dùng Button (primary).
 * Dùng chung ở mọi bảng/danh sách rỗng (không có bàn, không có món, không có
 * khuyến mãi...). Được `DataTable` tự render khi `rows` rỗng, nhưng cũng có
 * thể dùng độc lập ngoài bảng (VD: Giỏ hàng trống bên Khách hàng).
 */
export function EmptyState({
  icon: Icon = ShoppingCart,
  title,
  description,
  action,
  className,
}: EmptyStateProps) {
  return (
    <div className={cn("flex flex-col items-center justify-center gap-4 px-6 py-9 text-center", className)}>
      <div className="flex size-16 items-center justify-center rounded-full bg-surface-muted">
        <Icon className="size-7 text-text-tertiary" />
      </div>
      <div className="space-y-1">
        <p className="text-base font-bold text-text-primary">{title}</p>
        {description ? <p className="text-sm text-text-tertiary">{description}</p> : null}
      </div>
      {action ? (
        <Button onClick={action.onClick} className="mt-1">
          {action.label}
        </Button>
      ) : null}
    </div>
  )
}
