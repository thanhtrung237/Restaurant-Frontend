import { NavLink } from "react-router-dom"
import { X, LogOut } from "lucide-react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useLogout } from "@/features/auth/hooks/useLogout"
import { useAuthStore } from "@/stores/auth.store"
import { useCashierWaiter } from "@/hooks/use-cashier-waiter"
import { APP_ROLE_LABEL } from "@/config/roles"
import { flattenNavItems } from "@/config/nav-utils"
import { useBranchSwitcher } from "@/features/auth/hooks/useBranchSwitcher"
import { cn } from "@/lib/utils"
import { RestaurantBrand, useRestaurantName } from "@/components/layout/RestaurantBrand"

export interface NavDrawerProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

/**
 * NavDrawer — menu trượt từ trái cho MOBILE (<768px), theo Figma
 * "Menu Drawer · Mobile (375)".
 *
 * Dùng Radix Dialog có sẵn nên được miễn phí: khoá scroll nền, focus trap, đóng bằng
 * Esc, overlay bấm ra ngoài để đóng — không phải tự viết (yêu cầu 4.7).
 *
 * Danh sách mục lấy từ `flattenNavItems(role)`, cùng nguồn với Sidebar/SidebarRail/
 * BottomNav. Trước đây component giữ `DEFAULT_NAV_DRAWER_ITEMS` hard-code 9 mục.
 */
export function NavDrawer({ open, onOpenChange }: NavDrawerProps) {
  const account = useAuthStore((s) => s.account)
  const role = useAuthStore((s) => s.role)
  const { logout, isLoggingOut } = useLogout()
  const { activeChoice } = useBranchSwitcher()
  const restaurantName = useRestaurantName()

  const { allowed: canAlsoServe } = useCashierWaiter()
  const items = role ? flattenNavItems(role, "mobile", canAlsoServe) : []

  const initials =
    account?.fullName
      ?.split(" ")
      .slice(-2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "QL"

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <DialogPrimitive.Portal>
        <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-text-primary/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
        <DialogPrimitive.Content
          aria-label="Menu điều hướng"
          className="fixed inset-y-0 left-0 z-50 flex w-[80%] max-w-[320px] flex-col bg-surface-card shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-left data-[state=open]:slide-in-from-left"
        >
          <DialogPrimitive.Title className="sr-only">Menu điều hướng</DialogPrimitive.Title>
          <DialogPrimitive.Description className="sr-only">
            Danh sách các phân hệ bạn có quyền truy cập
          </DialogPrimitive.Description>

          {/* Đầu drawer: logo + tên nhà hàng + chi nhánh đang chọn */}
          <div className="flex items-center gap-3 border-b border-border-default px-4 py-4">
            <RestaurantBrand size="md" />
            <div className="min-w-0 flex-1">
              <p className="truncate text-base font-bold text-text-primary">
                {restaurantName || "Nhà hàng"}
              </p>
              <p className="truncate text-xs text-text-tertiary">{activeChoice?.name ?? ""}</p>
            </div>
            <DialogPrimitive.Close
              aria-label="Đóng menu"
              className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-secondary transition-colors hover:bg-border-strong"
            >
              <X className="size-4.5" />
            </DialogPrimitive.Close>
          </div>

          {/* Danh sách mục — bấm vào là đóng drawer */}
          <nav className="flex-1 overflow-y-auto py-2">
            <ul>
              {items.map((item) => (
                <li key={item.path}>
                  <NavLink
                    to={item.path}
                    onClick={() => onOpenChange(false)}
                    className={({ isActive }) =>
                      cn(
                        "flex items-center gap-3.5 px-4 py-3.5 text-[15px] transition-colors",
                        isActive
                          ? "bg-brand-primary-subtle font-bold text-brand-primary"
                          : "font-medium text-text-primary hover:bg-surface-muted",
                      )
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <item.icon
                          className={cn(
                            "size-5 shrink-0",
                            isActive ? "text-brand-primary" : "text-text-tertiary",
                          )}
                        />
                        <span className="min-w-0 wrap-anywhere">{item.label}</span>
                      </>
                    )}
                  </NavLink>
                </li>
              ))}
            </ul>
          </nav>

          {/* Chân drawer: tài khoản + đăng xuất */}
          <div className="flex items-center gap-3 border-t border-border-default px-4 py-3.5">
            <Avatar className="size-10 bg-text-primary text-text-on-brand text-xs font-bold">
              <AvatarFallback className="bg-text-primary text-text-on-brand">
                {initials}
              </AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-text-primary">
                {account?.fullName || "Quản lý"}
              </p>
              <p className="truncate text-xs text-text-tertiary">
                {role ? APP_ROLE_LABEL[role] : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => void logout()}
              disabled={isLoggingOut}
              aria-label="Đăng xuất"
              title="Đăng xuất"
              className="flex size-10 shrink-0 items-center justify-center rounded-full bg-status-danger-subtle text-status-danger transition-colors hover:bg-status-danger hover:text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <LogOut className="size-4.5" />
            </button>
          </div>
        </DialogPrimitive.Content>
      </DialogPrimitive.Portal>
    </DialogPrimitive.Root>
  )
}
