import * as React from "react"
import { Outlet, useNavigate, useLocation } from "react-router-dom"
import { Sidebar } from "@/components/layout/Sidebar"
import { BottomNav } from "@/components/layout/BottomNav"
import { useAuthStore } from "@/stores/auth.store"
import { APP_ROLE } from "@/config/roles"

/**
 * Layout desktop & mobile dùng chung cho: Phục vụ, Thu ngân, Quản lý chi nhánh, Quản trị nhà hàng.
 * - Desktop (md+): Sidebar cố định bên trái
 * - Mobile (<md): Sidebar ẩn, hiển thị BottomNav cố định dưới đáy màn hình
 */
export default function StaffLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const role = useAuthStore((s) => s.role)

  const currentPath = location.pathname
  const activeKey = React.useMemo(() => {
    if (currentPath.includes("so-do-ban")) return "tables"
    if (currentPath.includes("bao-cao")) return "reports"
    if (currentPath.includes("order-che-bien") || currentPath.includes("/bep")) return "orders"
    if (currentPath.includes("nhan-vien")) return "staff"
    return "more"
  }, [currentPath])

  function handleNavChange(key: string) {
    const basePath =
      role === APP_ROLE.WAITER
        ? "/phuc-vu"
        : role === APP_ROLE.BRANCH_MANAGER
        ? "/quan-ly-chi-nhanh"
        : "/quan-tri-nha-hang"

    switch (key) {
      case "tables":
        navigate(`${basePath}/so-do-ban`)
        break
      case "reports":
        navigate(`${basePath}/bao-cao`)
        break
      case "orders":
        navigate(`${basePath}/bep`)
        break
      case "staff":
        navigate(`${basePath}/nhan-vien`)
        break
      case "more":
        navigate(`${basePath}/cau-hinh`)
        break
    }
  }

  return (
    <div className="flex min-h-screen bg-surface-page">
      <Sidebar />
      <main className="flex flex-1 flex-col overflow-x-hidden pb-16 md:pb-0">
        <Outlet />
      </main>
      <BottomNav
        variant="manager"
        activeKey={activeKey}
        onChange={handleNavChange}
        className="fixed bottom-0 left-0 right-0 z-40 md:hidden"
      />
    </div>
  )
}
