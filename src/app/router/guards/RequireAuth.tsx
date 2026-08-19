import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthStore } from "@/stores/auth.store"
import { AUTH_PATHS } from "@/app/router/paths"

/** Chặn truy cập nếu nhân viên chưa đăng nhập — dùng bọc ngoài mọi route staff/admin. */
export default function RequireAuth() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const location = useLocation()

  if (!isAuthenticated) {
    return <Navigate to={AUTH_PATHS.LOGIN} replace state={{ from: location }} />
  }
  return <Outlet />
}
