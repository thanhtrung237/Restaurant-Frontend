import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { LayoutDashboard, Building2, ClipboardList, Sliders, LogOut, Diamond } from "lucide-react"
import { useAuthStore } from "@/stores/auth.store"

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
  { to: "/quan-tri-nen-tang/cau-hinh", label: "Cấu hình nền tảng", icon: Sliders },
]

/**
 * Layout riêng cho Quản trị nền tảng (PLATFORM_ADMIN) — tách biệt hoàn toàn với StaffLayout
 * để tuân thủ BR-21: chỉ hiển thị thông tin định danh hệ thống, không lẫn lộn menu nghiệp vụ nhà hàng.
 */
export default function PlatformLayout() {
  const navigate = useNavigate()
  const account = useAuthStore((s) => s.account)
  const clearSession = useAuthStore((s) => s.clearSession)

  const handleLogout = () => {
    clearSession()
    navigate("/dang-nhap")
  }

  return (
    <div className="flex min-h-dvh flex-col bg-surface-page text-text-primary md:h-dvh md:flex-row md:overflow-hidden">
      {/* Dark Sidebar matching QTNT mockups — cố định không bị scroll theo nội dung */}
      <aside className="flex shrink-0 select-none flex-col justify-between bg-[#292521] text-white md:h-dvh md:w-56 lg:w-64">
        <div className="flex flex-col min-h-0 flex-1">
          {/* Logo Brand Header */}
          <div className="flex shrink-0 items-center gap-3 border-b border-white/10 px-4 py-3 md:px-5 md:py-5">
            <div className="w-10 h-10 rounded-xl bg-brand-primary flex items-center justify-center text-white shadow-sm">
              {/* Diamond symbol / Platform icon */}
              <Diamond aria-hidden="true" className="size-5" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight leading-tight">Nền tảng</div>
              <div className="text-xs text-gray-400">Quản trị hệ thống</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="grid flex-1 grid-cols-2 gap-1.5 p-2.5 md:block md:space-y-1.5 md:overflow-y-auto md:p-4">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex min-w-0 items-center gap-2 rounded-lg px-2 py-2 text-xs leading-snug font-medium transition-colors focus-visible:outline-2 focus-visible:outline-white md:gap-3 md:px-3 md:py-2.5 md:text-sm ${
                      isActive
                        ? "bg-brand-primary text-white shadow-sm"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span className="min-w-0 break-words">{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* User Card & Logout at Bottom */}
        <div className="shrink-0 border-t border-white/10 p-2.5 md:p-4">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-white/5 hover:bg-white/10 transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-brand-primary text-white text-xs font-bold flex items-center justify-center shrink-0">
                SA
              </div>
              <div className="min-w-0">
                <div className="text-sm font-semibold text-white truncate">
                  {account?.fullName || "Super Admin"}
                </div>
                <div className="text-xs text-gray-400 truncate">Quản trị nền tảng</div>
              </div>
            </div>
            <button
              onClick={handleLogout}
              title="Đăng xuất"
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors ml-1 cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content Area — cuộn nội dung độc lập */}
      <div className="flex min-w-0 flex-1 flex-col md:h-dvh md:overflow-y-auto">
        <main className="min-w-0 flex-1 p-4 sm:p-6 lg:p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
