import type { LucideIcon } from "lucide-react"
import {
  X,
  LayoutGrid,
  Droplet,
  List,
  Tag,
  BarChart2,
  MapPin,
  User,
  Sliders,
  Clock,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface NavDrawerItem {
  key: string
  label: string
  icon: LucideIcon
  active?: boolean
  onClick?: () => void
}

export interface NavDrawerProps {
  open?: boolean
  onClose?: () => void
  brandName?: string
  branchName?: string
  items?: NavDrawerItem[]
  activeKey?: string
  onSelect?: (key: string) => void
  user?: {
    name: string
    role: string
    avatarText?: string
  }
  onLogout?: () => void
  className?: string
}

export const DEFAULT_NAV_DRAWER_ITEMS: NavDrawerItem[] = [
  { key: "tables", label: "Sơ đồ bàn", icon: LayoutGrid },
  { key: "orders", label: "Gọi món & Chế biến", icon: Droplet },
  { key: "menu", label: "Thực đơn", icon: List },
  { key: "promotions", label: "Khuyến mãi", icon: Tag },
  { key: "reports", label: "Báo cáo", icon: BarChart2 },
  { key: "branches", label: "Chi nhánh", icon: MapPin },
  { key: "staff", label: "Nhân viên", icon: User },
  { key: "settings", label: "Cấu hình", icon: Sliders },
  { key: "logs", label: "Nhật ký hoạt động", icon: Clock },
]

/**
 * NavDrawer — khớp component "Nav Drawer" trong UI Component (Figma):
 * Menu trượt dạng drawer cho giao diện mobile / tablet:
 * - Header: Logo Phở Việt + Chi nhánh + Nút đóng (X)
 * - Body: Danh sách các chức năng (Sơ đồ bàn, Thực đơn, Khuyến mãi...)
 * - Footer: Thông tin tài khoản đăng nhập + Nút đăng xuất màu cam nhạt.
 */
export function NavDrawer({
  open = true,
  onClose,
  brandName = "Phở Việt",
  branchName = "Chi nhánh Quận 1",
  items = DEFAULT_NAV_DRAWER_ITEMS,
  activeKey = "tables",
  onSelect,
  user = { name: "Quản lý", role: "Quản trị nhà hàng", avatarText: "QL" },
  onLogout,
  className,
}: NavDrawerProps) {
  if (!open) return null

  return (
    <div
      className={cn(
        "flex h-full max-h-[640px] w-full max-w-[280px] flex-col justify-between rounded-card border border-border-default bg-surface-card p-4 shadow-xl select-none",
        className
      )}
    >
      {/* Header Drawer: Logo & Chi nhánh */}
      <div>
        <div className="flex items-center justify-between gap-3 border-b border-border-default pb-4">
          <div className="flex items-center gap-3">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary text-xl font-extrabold text-white shadow-xs">
              P
            </div>
            <div className="min-w-0">
              <h3 className="truncate text-base font-bold text-text-primary">
                {brandName}
              </h3>
              <p className="truncate text-xs text-text-tertiary">
                {branchName}
              </p>
            </div>
          </div>

          {onClose ? (
            <button
              type="button"
              onClick={onClose}
              aria-label="Đóng menu"
              className="flex size-8 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-secondary transition-colors hover:bg-border-strong active:scale-95"
            >
              <X className="size-4" />
            </button>
          ) : null}
        </div>

        {/* Danh sách Menu Items */}
        <nav className="space-y-1 pt-3">
          {items.map((item) => {
            const isActive = activeKey === item.key || item.active
            const Icon = item.icon

            return (
              <button
                key={item.key}
                type="button"
                onClick={() => {
                  item.onClick?.()
                  onSelect?.(item.key)
                }}
                className={cn(
                  "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm transition-colors outline-none",
                  isActive
                    ? "bg-brand-primary-subtle font-bold text-brand-primary"
                    : "font-medium text-text-secondary hover:bg-surface-muted hover:text-text-primary"
                )}
              >
                <Icon className="size-5 shrink-0" strokeWidth={isActive ? 2.5 : 2} />
                <span className="truncate">{item.label}</span>
              </button>
            )
          })}
        </nav>
      </div>

      {/* Footer Drawer: User profile & Logout */}
      <div className="flex items-center justify-between border-t border-border-default pt-3">
        <div className="flex min-w-0 items-center gap-2.5">
          <div className="flex size-9 shrink-0 items-center justify-center rounded-full bg-text-primary text-xs font-bold text-white">
            {user.avatarText ?? "QL"}
          </div>
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-bold text-text-primary">
              {user.name}
            </p>
            <p className="truncate text-[11px] text-text-tertiary">
              {user.role}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={onLogout}
          aria-label="Đăng xuất"
          title="Đăng xuất"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-primary-subtle text-brand-primary transition-colors hover:bg-status-danger-subtle hover:text-status-danger active:scale-95"
        >
          <LogOut className="size-4" strokeWidth={2.2} />
        </button>
      </div>
    </div>
  )
}
