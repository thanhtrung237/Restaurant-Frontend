import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthStore } from "@/stores/auth.store"
import { AUTH_PATHS, isPlatformHost } from "@/app/router/paths/auth.paths"
import { PLATFORM_ADMIN_PATHS } from "@/app/router/paths"

/** Chặn truy cập nếu nhân viên chưa đăng nhập — dùng bọc ngoài mọi route staff/admin. */
export default function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    const dashboard = PLATFORM_ADMIN_PATHS.DASHBOARD
    const platform =
      isPlatformHost() ||
      location.pathname === dashboard ||
      location.pathname.startsWith(`${dashboard}/`)
    return (
      <Navigate
        to={platform ? AUTH_PATHS.PLATFORM_LOGIN : AUTH_PATHS.LOGIN}
        replace
        state={{ from: location }}
      />
    )
  }
  return <Outlet />
}
