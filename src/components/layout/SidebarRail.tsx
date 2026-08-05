import type { LucideIcon } from "lucide-react"
import {
  ChevronDown,
  LayoutGrid,
  Droplet,
  List,
  Tag,
  BarChart2,
  MapPin,
  User,
  Sliders,
  LogOut,
} from "lucide-react"
import { cn } from "@/lib/utils"

export interface SidebarRailItem {
  key: string
  label?: string
  icon: LucideIcon
  active?: boolean
  onClick?: () => void
}

export interface SidebarRailProps {
  branchCode?: string
  items?: SidebarRailItem[]
  activeKey?: string
  onSelect?: (key: string) => void
  avatarText?: string
  onLogout?: () => void
  className?: string
}

export const DEFAULT_SIDEBAR_RAIL_ITEMS: SidebarRailItem[] = [
  { key: "tables", label: "Sơ đồ bàn", icon: LayoutGrid },
  { key: "orders", label: "Đơn món", icon: Droplet },
  { key: "menu", label: "Thực đơn", icon: List },
  { key: "promotions", label: "Khuyến mãi", icon: Tag },
  { key: "reports", label: "Báo cáo", icon: BarChart2 },
  { key: "branches", label: "Chi nhánh", icon: MapPin },
  { key: "staff", label: "Nhân viên", icon: User },
  { key: "settings", label: "Cấu hình", icon: Sliders },
]

/**
 * SidebarRail — khớp component "Sidebar Rail" trong UI Component (Figma):
 * Thanh menu thu gọn (icon rail) tối ưu không gian cho màn hình tablet / POS:
 * - Logo P cam trên cùng
 * - Pill chi nhánh "Q1 v"
 * - Danh sách icons với item active có khung nền cam nhạt (brand/primary-subtle)
 * - Avatar người dùng & nút logout ở chân.
 */
export function SidebarRail({
  branchCode = "Q1",
  items = DEFAULT_SIDEBAR_RAIL_ITEMS,
  activeKey = "tables",
  onSelect,
  avatarText = "QL",
  onLogout,
  className,
}: SidebarRailProps) {
  return (
    <aside
      className={cn(
        "flex h-full max-h-[640px] w-18 flex-col items-center justify-between rounded-card border border-border-default bg-surface-card py-4 select-none shadow-xs",
        className
      )}
    >
      {/* Phần trên: Logo & Chi nhánh */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex size-11 items-center justify-center rounded-xl bg-brand-primary text-xl font-extrabold text-white shadow-xs">
          P
        </div>

        <button
          type="button"
          className="flex items-center gap-1 rounded-pill bg-brand-primary-subtle px-2.5 py-1 text-xs font-bold text-brand-primary transition-colors hover:bg-brand-primary-hover hover:text-white outline-none"
        >
          <span>{branchCode}</span>
          <ChevronDown className="size-3" strokeWidth={3} />
        </button>
      </div>

      {/* Phần giữa: Danh sách Icons */}
      <nav className="flex flex-col items-center gap-1.5 py-2">
        {items.map((item) => {
          const isActive = activeKey === item.key || item.active
          const Icon = item.icon

          return (
            <button
              key={item.key}
              type="button"
              title={item.label}
              onClick={() => {
                item.onClick?.()
                onSelect?.(item.key)
              }}
              className={cn(
                "flex size-10 items-center justify-center rounded-xl transition-all outline-none",
                isActive
                  ? "bg-brand-primary-subtle text-brand-primary font-bold shadow-2xs"
                  : "text-text-tertiary hover:bg-surface-muted hover:text-text-primary"
              )}
            >
              <Icon className="size-5" strokeWidth={isActive ? 2.5 : 2} />
            </button>
          )
        })}
      </nav>

      {/* Phần dưới: User avatar & Logout */}
      <div className="flex flex-col items-center gap-3 pt-2">
        <div className="flex size-8 items-center justify-center rounded-full bg-text-primary text-xs font-bold text-white shadow-2xs">
          {avatarText}
        </div>

        <button
          type="button"
          onClick={onLogout}
          title="Đăng xuất"
          className="flex size-8 items-center justify-center text-text-tertiary transition-colors hover:text-status-danger outline-none"
        >
          <LogOut className="size-5" />
        </button>
      </div>
    </aside>
  )
}
