import { NavLink, useLocation } from "react-router-dom"
import { LogOut } from "lucide-react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BranchSwitcher } from "@/components/layout/BranchSwitcher"
import { useLogout } from "@/features/auth/hooks/useLogout"
import { useAuthStore } from "@/stores/auth.store"
import { useCashierWaiter } from "@/hooks/use-cashier-waiter"
import { APP_ROLE_LABEL } from "@/config/roles"
import { flattenNavItems, isNavItemActive } from "@/config/nav-utils"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { cn } from "@/lib/utils"

/**
 * SidebarRail — thanh điều hướng thu gọn cho tablet và desktop, theo Figma
 * "Sơ đồ bàn · Tablet (834)" và "Sidebar Rail".
 *
 * Bố cục dọc: logo · chip chi nhánh ("Q1 ▾") · danh sách icon · avatar + đăng xuất.
 *
 * Danh sách mục lấy từ `flattenNavItems(role)` — cùng nguồn với Sidebar, NavDrawer và
 * BottomNav. Trước đây component này giữ mảng `DEFAULT_SIDEBAR_RAIL_ITEMS` hard-code
 * 8 mục, nên vai trò nào cũng thấy đủ 8 icon kể cả Phục vụ hay Thu ngân.
 */
export function SidebarRail({
  className,
  toggle,
}: {
  className?: string
  toggle?: React.ReactNode
}) {
  const account = useAuthStore((s) => s.account)
  const role = useAuthStore((s) => s.role)
  const { logout, isLoggingOut } = useLogout()
  const { pathname } = useLocation()

  const { allowed: canAlsoServe } = useCashierWaiter()
  const items = role ? flattenNavItems(role, "desktop", canAlsoServe) : []

  const initials =
    account?.fullName
      ?.split(" ")
      .slice(-2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "QL"

  return (
    <aside
      className={cn(
        "h-dvh w-[72px] shrink-0 flex-col items-center gap-1 border-r border-border-default bg-surface-card py-3 select-none",
        className,
      )}
    >
      {/* Logo */}
      <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary shadow-xs">
        <span className="text-lg font-extrabold text-text-on-brand">P</span>
      </div>

      {/* Chip chi nhánh ngay dưới logo (Figma) */}
      <div className="mt-1.5 mb-2">
        <BranchSwitcher variant="chip" />
      </div>

      {/* Danh sách icon */}
      <nav className="flex w-full flex-1 flex-col items-center gap-1 overflow-y-auto px-2">
        {items.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            title={item.label}
            aria-label={item.label}
            className={cn(
              "group relative flex size-11 shrink-0 items-center justify-center rounded-xl transition-colors",
              isNavItemActive(item, pathname)
                ? "bg-brand-primary-subtle text-brand-primary"
                : "text-text-tertiary hover:bg-surface-muted hover:text-text-primary",
            )}
          >
            <item.icon className="size-5" />
            {/* Tooltip đơn giản bằng CSS — không thêm thư viện tooltip */}
            <span
              role="tooltip"
              className="pointer-events-none absolute left-full z-50 ml-2 hidden whitespace-nowrap rounded-lg bg-text-primary px-2.5 py-1.5 text-xs font-semibold text-text-on-brand shadow-lg group-hover:block"
            >
              {item.label}
            </span>
          </NavLink>
        ))}
      </nav>

      {toggle}

      {/* Chân: avatar + chuông thông báo + đăng xuất */}
      <div className="flex w-full shrink-0 flex-col items-center gap-2 border-t border-border-default/60 pt-3">
        <Avatar
          className="size-9 bg-text-primary text-text-on-brand text-xs font-bold"
          title={[account?.fullName, role ? APP_ROLE_LABEL[role] : null]
            .filter(Boolean)
            .join(" — ")}
        >
          <AvatarFallback className="bg-text-primary text-text-on-brand">{initials}</AvatarFallback>
        </Avatar>
        <span className="sr-only">
          {account?.fullName} — {role ? APP_ROLE_LABEL[role] : ""}
        </span>
        <NotificationBell variant="rail" />
        <button
          type="button"
          onClick={() => void logout()}
          disabled={isLoggingOut}
          title="Đăng xuất"
          aria-label="Đăng xuất"
          className="flex size-9 items-center justify-center rounded-xl text-text-tertiary transition-colors hover:bg-surface-muted hover:text-status-danger disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="size-4.5" />
        </button>
      </div>
    </aside>
  )
}
