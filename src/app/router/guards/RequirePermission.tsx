import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "@/stores/auth.store"
import { hasPermission, type PermissionKey } from "@/config/permissions"

/**
 * Route Guard bảo vệ màn hình theo phân quyền.
 * Nếu tài khoản (role) không có quyền truy cập, chuyển hướng về trang thông báo 403.
 */
export default function RequirePermission({ permission }: { permission: PermissionKey }) {
  const role = useAuthStore((s) => s.role)

  if (!hasPermission(role, permission)) {
    return <Navigate to="/khong-co-quyen-truy-cap" replace />
  }
  return <Outlet />
}
