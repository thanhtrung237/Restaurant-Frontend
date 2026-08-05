import type { LucideIcon } from "lucide-react"
import { Utensils, ReceiptText, ShoppingCart, LayoutGrid, BarChart2, Droplet, User, MoreHorizontal } from "lucide-react"
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

export const MANAGER_BOTTOM_NAV_ITEMS: BottomNavItem[] = [
  { key: "tables", label: "Sơ đồ bàn", icon: LayoutGrid },
  { key: "reports", label: "Báo cáo", icon: BarChart2 },
  { key: "orders", label: "Đơn món", icon: Droplet },
  { key: "staff", label: "Nhân viên", icon: User },
  { key: "more", label: "Thêm", icon: MoreHorizontal },
]

/**
 * BottomNav — khớp component "Bottom Navigation" & "Bottom Nav · Quản lý" trong UI Component (Figma):
 * Thanh điều hướng đáy màn hình cho thiết bị di động, hỗ trợ chế độ Khách hàng (Thực đơn / Món đã gọi / Giỏ hàng)
 * và Quản lý (Sơ đồ bàn / Báo cáo / Đơn món / Nhân viên / Thêm).
 */
export function BottomNav({
  items,
  activeKey,
  onChange,
  variant = "customer",
  className,
}: BottomNavProps) {
  const defaultItems =
    variant === "manager"
      ? MANAGER_BOTTOM_NAV_ITEMS
      : variant === "customer"
      ? CUSTOMER_BOTTOM_NAV_ITEMS
      : []

  const navItems = items ?? defaultItems
  const currentActive = activeKey ?? (navItems[0]?.key || "")

  return (
    <nav
      className={cn(
        "flex h-16 w-full items-center justify-around border-t border-border-default bg-surface-card px-2 select-none shadow-xs",
        className
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
              "relative flex flex-1 flex-col items-center justify-center gap-1 py-1 transition-colors outline-none",
              isActive ? "text-brand-primary font-bold" : "text-text-tertiary hover:text-text-secondary"
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
            <span className="text-[11px] leading-tight">
              {item.label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
