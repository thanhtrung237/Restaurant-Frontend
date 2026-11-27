import { useStaffWebSocket } from "@/hooks/use-staff-websocket"
import { Outlet, NavLink } from "react-router-dom"
import { LayoutDashboard, Building2, ClipboardList, LogOut, Diamond } from "lucide-react"
import { useAuthStore } from "@/stores/auth.store"
import { useLogout } from "@/features/auth/hooks/useLogout"

interface NavItem {
  to: string
  label: string
  icon: React.ComponentType<{ className?: string }>
  exact?: boolean
}

const navItems: NavItem[] = [
  { to: "/quan-tri-nen-tang", label: "Dashboard", icon: LayoutDashboard, exact: true },
  { to: "/quan-tri-nen-tang/nha-hang", label: "Nhà hàng", icon: Building2 },
  { to: "/quan-tri-nen-tang/nhat-ky-he-thong", label: "Nhật ký hệ thống", icon: ClipboardList },
]

/**
 * Layout riêng cho Quản trị nền tảng (PLATFORM_ADMIN) — tách biệt hoàn toàn với StaffLayout
 * để tuân thủ BR-21: chỉ hiển thị thông tin định danh hệ thống, không lẫn lộn menu nghiệp vụ nhà hàng.
 */
export default function PlatformLayout() {
  useStaffWebSocket()
  const account = useAuthStore((s) => s.account)
  const { logout, isLoggingOut } = useLogout()

  return (
    <div className="flex min-h-dvh flex-col bg-slate-50 text-slate-950 md:h-dvh md:flex-row md:overflow-hidden">
      {/* Dark Sidebar matching QTNT mockups — cố định không bị scroll theo nội dung */}
      <aside className="flex min-w-0 shrink-0 select-none flex-col justify-between border-b border-slate-800 bg-slate-950 text-white md:h-dvh md:w-48 md:border-b-0 md:border-r lg:w-56 xl:w-60">
        <div className="flex flex-col min-h-0 flex-1">
          {/* Logo Brand Header */}
          <div className="flex shrink-0 items-center gap-2.5 border-b border-white/10 px-3 py-2.5 md:min-h-18 md:px-4 md:py-4">
            <div className="grid size-9 shrink-0 place-items-center rounded-lg border border-white/15 bg-white/5 text-orange-200">
              {/* Diamond symbol / Platform icon */}
              <Diamond aria-hidden="true" className="size-5" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight leading-tight">Nền tảng</div>
              <div className="text-xs text-slate-300">Quản trị hệ thống</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="grid flex-1 grid-cols-2 gap-1 p-2 md:block md:space-y-1 md:overflow-y-auto md:px-3 md:py-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex min-h-10 min-w-0 items-center gap-2 rounded-md border-l-2 px-2 py-1.5 text-xs leading-snug font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white md:gap-3 md:px-3 md:py-2.5 md:text-sm ${
                      isActive
                        ? "border-brand-primary bg-white/10 font-semibold text-white"
                        : "border-transparent text-slate-300 hover:bg-white/8 hover:text-white"
                    }`
                  }
                >
                  <Icon className="size-4 shrink-0" />
                  <span className="min-w-0 wrap-anywhere">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* User Card & Logout at Bottom */}
        <div className="shrink-0 border-t border-white/10 p-2 md:p-3">
          <div className="flex min-w-0 items-center justify-between gap-2 rounded-lg px-1.5 py-1 md:px-1">
            <div className="flex items-center gap-3 min-w-0">
              <div className="grid size-8 shrink-0 place-items-center rounded-full border border-white/15 bg-white/10 text-xs font-semibold text-white">
                SA
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {account?.fullName || "Super Admin"}
                </div>
                <div className="text-xs text-slate-300 truncate">Quản trị nền tảng</div>
              </div>
            </div>
            <button
              onClick={() => void logout()}
              disabled={isLoggingOut}
              title="Đăng xuất"
              className="grid size-9 shrink-0 cursor-pointer place-items-center rounded-lg text-slate-300 transition-colors hover:bg-white/10 hover:text-white focus-visible:outline-2 focus-visible:outline-white"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area — cuộn nội dung độc lập */}
      <div className="flex min-w-0 flex-1 flex-col md:h-dvh md:overflow-y-auto">
        <main className="min-w-0 flex-1 px-3 py-4 sm:px-5 sm:py-6 lg:px-7 xl:px-9 xl:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
