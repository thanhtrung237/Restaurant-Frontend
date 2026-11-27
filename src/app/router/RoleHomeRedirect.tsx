import { Navigate } from "react-router-dom"
import { useAuthStore } from "@/stores/auth.store"
import { APP_ROLE, type AppRole } from "@/config/roles"
import { AUTH_PATHS, isPlatformHost } from "./paths/auth.paths"

/** Trang chủ mặc định của từng vai trò khi vào "/" — theo mục 4.1 (phạm vi mỗi vai trò). */
export const ROLE_HOME: Record<AppRole, string> = {
  [APP_ROLE.CUSTOMER]: AUTH_PATHS.LOGIN, // khách hàng không vào "/", luôn vào qua /ban/:qrCode
  [APP_ROLE.WAITER]: "/phuc-vu/so-do-ban",
  [APP_ROLE.CASHIER]: "/thu-ngan/so-do-ban",
  [APP_ROLE.BRANCH_MANAGER]: "/quan-ly-chi-nhanh/so-do-ban",
  [APP_ROLE.RESTAURANT_ADMIN]: "/quan-tri-nha-hang/so-do-ban",
  [APP_ROLE.PLATFORM_ADMIN]: "/quan-tri-nen-tang",
}

/**
 * Thay cho việc hardcode redirect "/" -> /quan-tri-nha-hang (chỉ đúng cho 1 role).
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
