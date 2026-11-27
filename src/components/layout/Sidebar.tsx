import { NavLink, useLocation } from "react-router-dom"
import { LogOut } from "lucide-react"
import { useAuthStore } from "@/stores/auth.store"
import { APP_ROLE_LABEL } from "@/config/roles"
import { getNavGroupsForRole } from "@/config/nav-items"
import { useCashierWaiter } from "@/hooks/use-cashier-waiter"
import { isNavItemActive } from "@/config/nav-utils"
import { useLogout } from "@/features/auth/hooks/useLogout"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BranchSwitcher } from "@/components/layout/BranchSwitcher"
import { RestaurantBrand, useRestaurantName } from "@/components/layout/RestaurantBrand"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { cn } from "@/lib/utils"

/**
 * Sidebar — khung điều hướng desktop dùng CHUNG cho các role nhân viên qua `StaffLayout`.
 * - Logo vuông "P" màu cam thương hiệu
 * - Tên quán "Phở Việt", dòng phụ "Chi nhánh Quận 1" và icon dropdown
 * - Menu items: mục active có nền cam nhạt (#FEEBE4) và chữ/icon cam (#F0522B)
 * - Chân trang: Avatar + Tên / Vai trò nhân viên + Nút đăng xuất
 */
export function Sidebar({ className, toggle }: { className?: string; toggle?: React.ReactNode }) {
  const account = useAuthStore((s) => s.account)
  const role = useAuthStore((s) => s.role)
  const { logout, isLoggingOut } = useLogout()

  // Mặc định vai trò là Quản trị nhà hàng (RESTAURANT_ADMIN) để xem được toàn bộ màn hình
  const currentRole = role && role !== "CUSTOMER" ? role : "RESTAURANT_ADMIN"
  // "desktop": bỏ các mục chỉ dành cho điều hướng mobile (xem NavItem.mobileOnly).
  const { allowed: canAlsoServe } = useCashierWaiter()
  const navGroups = getNavGroupsForRole(currentRole, "desktop", canAlsoServe)
  const { pathname } = useLocation()
  // Tên hiện trên thanh bên lấy từ cấu hình nhà hàng thật (FR-ADM-03), không viết cứng.
  const restaurantName = useRestaurantName()

  const initials =
    account?.fullName
      ?.split(" ")
      .slice(-2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "QL"

  return (
    <aside
      id="staff-sidebar-expanded"
      className={cn(
        "h-dvh w-72 shrink-0 flex-col border-r border-border-default/80 bg-surface-card select-none",
        className,
      )}
    >
      {/* Brand & Branch Switcher */}
      <div className="flex h-19 shrink-0 items-center justify-between border-b border-border-default px-4">
        <div className="flex min-w-0 items-center gap-3">
          <RestaurantBrand size="sm" />
          <div className="min-w-0 flex-1">
            <h2 className="truncate text-sm font-bold text-text-primary">
              {restaurantName || "Nhà hàng"}
            </h2>
            {/* Danh sách chi nhánh lấy từ CÁC PHÂN CÔNG của tài khoản (BR-18),
                không còn mảng tên chi nhánh viết cứng. */}
            <BranchSwitcher variant="full" />
          </div>
        </div>
      </div>

      {/* Nav groups */}
      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
        {navGroups.map((group, groupIndex) => (
          <div key={group.title ?? groupIndex} className={groupIndex > 0 ? "mt-4" : undefined}>
            {group.title ? (
              <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-wider text-text-tertiary">
                {group.title}
              </p>
            ) : null}
            <ul className="space-y-1">
              {group.items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    // Tự tính active thay vì dùng cờ của NavLink: mục "Nhân viên" còn
                    // phải sáng ở hai màn tab của nó (xem NavItem.activeAlsoOn).
                    className={() => {
                      const isActive = isNavItemActive(item, pathname)
                      return cn(
                        "group flex items-center gap-3 rounded-lg border border-transparent px-3 py-2.5 text-sm font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-primary",
                        isActive
                          ? "border-brand-primary/10 bg-brand-primary-subtle font-semibold text-brand-primary"
                          : "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
                      )
                    }}
                  >
                    <item.icon
                      className={cn(
                        "size-4.5 shrink-0 transition-colors",
                        isNavItemActive(item, pathname)
                          ? "text-brand-primary"
                          : "text-text-tertiary group-hover:text-text-secondary",
                      )}
                    />
                    <span className="truncate">{item.label}</span>
                  </NavLink>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </nav>

      {toggle}

      {/* User footer */}
      <div className="shrink-0 border-t border-border-default/60 p-3">
        <div className="flex items-center gap-2 rounded-xl border border-border-default bg-surface-page px-2.5 py-2">
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <Avatar className="size-7 bg-text-primary text-text-on-brand font-bold text-xs shrink-0">
              <AvatarFallback className="bg-text-primary text-text-on-brand">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1 space-y-0.5 text-left">
              <p
                className="min-w-0 truncate text-xs leading-tight font-bold text-text-primary"
                title={account?.fullName || "Quản lý"}
              >
                {account?.fullName || "Quản lý"}
              </p>
              <p
                className="truncate text-[11px] leading-tight text-text-secondary"
                title={role ? APP_ROLE_LABEL[role] : "Quản trị nhà hàng"}
              >
                {role ? APP_ROLE_LABEL[role] : "Quản trị nhà hàng"}
              </p>
            </div>
          </div>
          <div className="flex shrink-0 items-center justify-end gap-1">
            <NotificationBell variant="sidebar" />
            <button
              type="button"
              onClick={() => void logout()}
              disabled={isLoggingOut}
              title="Đăng xuất"
              className="flex size-7 shrink-0 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-muted hover:text-status-danger cursor-pointer disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="size-3.5" />
            </button>
          </div>
        </div>
      </div>
    </aside>
  )
}
