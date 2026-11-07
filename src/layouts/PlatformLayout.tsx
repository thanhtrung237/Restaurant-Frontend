import { Outlet, NavLink, useNavigate } from "react-router-dom"
import { LayoutDashboard, Building2, ClipboardList, Sliders, LogOut } from "lucide-react"
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
    <div className="flex h-screen overflow-hidden bg-[#F8F9FA] text-[#1A1A1A]">
      {/* Dark Sidebar matching QTNT mockups — cố định không bị scroll theo nội dung */}
      <aside className="w-64 shrink-0 bg-[#16181C] text-white flex flex-col justify-between select-none h-screen sticky top-0">
        <div className="flex flex-col min-h-0 flex-1">
          {/* Logo Brand Header */}
          <div className="flex items-center gap-3 px-6 py-6 border-b border-[#252830] shrink-0">
            <div className="w-10 h-10 rounded-xl bg-[#E03A14] flex items-center justify-center text-white shadow-sm">
              {/* Diamond symbol / Platform icon */}
              <div className="w-4 h-4 rotate-45 border-2 border-white bg-white/20" />
            </div>
            <div>
              <div className="font-bold text-base tracking-tight leading-tight">Nền tảng</div>
              <div className="text-xs text-gray-400">Quản trị hệ thống</div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="p-4 space-y-1.5 flex-1 overflow-y-auto">
            {navItems.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  end={item.exact}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-sm font-medium transition-colors ${
                      isActive
                        ? "bg-[#E03A14] text-white shadow-sm"
                        : "text-gray-300 hover:text-white hover:bg-white/5"
                    }`
                  }
                >
                  <Icon className="w-5 h-5 shrink-0" />
                  <span>{item.label}</span>
                </NavLink>
              )
            })}
          </nav>
        </div>

        {/* User Card & Logout at Bottom */}
        <div className="p-4 border-t border-[#252830] shrink-0">
          <div className="flex items-center justify-between p-2.5 rounded-xl bg-[#20232B] hover:bg-[#262A34] transition-colors">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-9 h-9 rounded-full bg-[#E03A14] text-white text-xs font-bold flex items-center justify-center shrink-0">
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
      <div className="flex flex-1 flex-col min-w-0 h-screen overflow-y-auto">
        <main className="flex-1 p-8">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

