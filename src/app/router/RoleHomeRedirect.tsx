import { Navigate } from "react-router-dom"
import { useAuthStore } from "@/stores/auth.store"
import { APP_ROLE, type AppRole } from "@/config/roles"
import {
  AUTH_PATHS,
  BRANCH_MANAGER_PATHS,
  CASHIER_PATHS,
  PLATFORM_ADMIN_PATHS,
  RESTAURANT_ADMIN_PATHS,
  WAITER_PATHS,
  isPlatformHost,
} from "./paths"

/** Trang chủ mặc định của từng vai trò khi vào "/" — theo mục 4.1 (phạm vi mỗi vai trò). */
export const ROLE_HOME: Record<AppRole, string> = {
  [APP_ROLE.CUSTOMER]: AUTH_PATHS.LOGIN, // khách hàng không vào "/", luôn vào qua /table/:qrCode
  [APP_ROLE.WAITER]: WAITER_PATHS.TABLE_MAP,
  [APP_ROLE.CASHIER]: CASHIER_PATHS.TABLE_MAP,
  [APP_ROLE.BRANCH_MANAGER]: BRANCH_MANAGER_PATHS.TABLE_MAP,
  [APP_ROLE.RESTAURANT_ADMIN]: RESTAURANT_ADMIN_PATHS.TABLE_MAP,
  [APP_ROLE.PLATFORM_ADMIN]: PLATFORM_ADMIN_PATHS.DASHBOARD,
}

/**
 * Thay cho việc hardcode redirect "/" -> /restaurant-admin (chỉ đúng cho 1 role).
 * Chưa đăng nhập -> trang đăng nhập. Đã đăng nhập -> trang chủ đúng theo role hiện tại.
 */
export default function RoleHomeRedirect() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)

  if (!isAuthenticated || !role) {
    return <Navigate to={isPlatformHost() ? AUTH_PATHS.PLATFORM_LOGIN : AUTH_PATHS.LOGIN} replace />
  }
  return <Navigate to={ROLE_HOME[role]} replace />
}
