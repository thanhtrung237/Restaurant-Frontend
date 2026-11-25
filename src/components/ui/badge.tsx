import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Badge primitive — thuần trình bày, không mang nghiệp vụ.
 * Muốn hiện trạng thái nghiệp vụ (bàn/order/hóa đơn...) dùng
 * `components/common/StatusBadge` (bọc Badge này + map enum -> variant + label).
 *
 * Khớp component "Badge" / "Status Badge" trong UI Component (Figma):
 * radius 999px (pill), padding 5/10, gap 6px, nền màu-subtle + chữ màu-đậm,
 * có chấm tròn (dot) đứng trước label.
 */
const badgeVariants = cva(
  "inline-flex w-fit shrink-0 items-center gap-1.5 whitespace-nowrap rounded-pill px-[10px] py-[5px] text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50",
  {
    variants: {
      variant: {
        default: "bg-brand-primary text-text-on-brand",
        secondary: "bg-surface-muted text-text-secondary",
        outline: "border border-border-default bg-transparent text-text-primary",
        destructive: "bg-status-danger text-white",
        success: "bg-status-success-subtle text-status-success",
        warning: "bg-status-warning-subtle text-status-warning",
        danger: "bg-status-danger-subtle text-status-danger",
        info: "bg-status-info-subtle text-status-info",
        reserved: "bg-surface-muted text-text-tertiary",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
)

export interface BadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** Chấm tròn nhỏ trước label — đúng như Status Badge trong Design System */
  dot?: boolean
}

function Badge({ className, variant, dot, children, ...props }: BadgeProps) {
  return (
    <span data-slot="badge" className={cn(badgeVariants({ variant }), className)} {...props}>
      {dot ? <span className="size-1.5 shrink-0 rounded-full bg-current" /> : null}
      {children}
    </span>
  )
}

export { Badge, badgeVariants }
