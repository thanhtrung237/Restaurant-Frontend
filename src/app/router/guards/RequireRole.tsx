import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "@/stores/auth.store"
import type { AppRole } from "@/config/roles"

/**
 * Chặn theo vai trò ứng dụng — đối chiếu với ma trận phân quyền mục 4.
 * VD: <RequireRole allow={[APP_ROLE.RESTAURANT_ADMIN]} />
 */
export default function RequireRole({ allow }: { allow: AppRole[] }) {
  const role = useAuthStore((s) => s.role)

  if (!role || !allow.includes(role)) {
    return <Navigate to="/khong-co-quyen-truy-cap" replace />
  }
  return <Outlet />
}
