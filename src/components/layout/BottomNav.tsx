import type { LucideIcon } from "lucide-react"
import { Utensils, ReceiptText, ShoppingCart } from "lucide-react"
import { cn } from "@/lib/utils"

export interface BottomNavItem {
  key: string
  label: string
  icon: LucideIcon
  badge?: number | string
  onClick?: () => void
}

export interface BottomNavProps {
  items?: BottomNavItem[]
  activeKey?: string
  onChange?: (key: string) => void
  variant?: "customer" | "manager" | "custom"
  className?: string
}

export const CUSTOMER_BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { key: "menu", label: "Thực đơn", icon: Utensils },
  { key: "ordered", label: "Món đã gọi", icon: ReceiptText },
  { key: "cart", label: "Giỏ hàng", icon: ShoppingCart },
]

/**
 * BottomNav — khớp component "Bottom Navigation" & "Bottom Nav · Quản lý" trong UI Component (Figma):
 * Thanh điều hướng đáy màn hình cho thiết bị di động.
 *
 * Khu vực NHÂN VIÊN không dùng danh sách mặc định: `StaffLayout` truyền `items` đã được
 * lọc theo quyền qua `getBottomNavItems(role)` (config/nav-utils.ts). Mảng
 * `MANAGER_BOTTOM_NAV_ITEMS` hard-code trước đây đã bị bỏ vì nó hiện cả mục mà vai trò
 * không có quyền (vd Thu ngân vẫn thấy "Báo cáo", "Nhân viên").
 */
export function BottomNav({
  items,
  activeKey,
  onChange,
  variant = "customer",
  className,
}: BottomNavProps) {
  const defaultItems = variant === "customer" ? CUSTOMER_BOTTOM_NAV_ITEMS : []

  const navItems = items ?? defaultItems
  const currentActive = activeKey ?? (navItems[0]?.key || "")

  return (
    <nav
      className={cn(
        "flex h-16 w-full items-center justify-around border-t border-border-default bg-surface-card gap-1 px-2 select-none shadow-[0_-2px_10px_#2927230a]",
        className,
      )}
    >
      {navItems.map((item) => {
        const isActive = currentActive === item.key
        const Icon = item.icon

        return (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              item.onClick?.()
              onChange?.(item.key)
            }}
            className={cn(
              "relative flex min-h-12 min-w-0 flex-1 flex-col items-center justify-center gap-1 rounded-lg px-1 py-1 text-center transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-primary",
              isActive
                ? "bg-brand-primary-subtle font-bold text-brand-primary"
                : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
            )}
          >
            <div className="relative">
              <Icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
              {item.badge ? (
                <span className="absolute -top-1.5 -right-2.5 flex min-w-4 items-center justify-center rounded-full bg-brand-primary px-1 text-[10px] font-bold text-white shadow-2xs">
                  {item.badge}
                </span>
              ) : null}
            </div>
            <span className="max-w-full text-[11px] leading-tight [overflow-wrap:anywhere]">
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
