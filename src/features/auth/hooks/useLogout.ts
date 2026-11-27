import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useLogoutMutation } from "@/api/auth.api"
import { useAuthStore } from "@/stores/auth.store"
import { AUTH_PATHS } from "@/app/router/paths"
import { APP_ROLE } from "@/config/roles"

/**
 * Đăng xuất dùng chung cho mọi chỗ có nút Đăng xuất.
 *
 * Trước đây từng chỗ chỉ gọi `useAuthStore.clearSession()`, nên:
 *  - access/refresh token vẫn nằm trong localStorage,
 *  - `POST /auth/logout` không được gọi → refresh token KHÔNG bị thu hồi phía server,
 *    vẫn còn hiệu lực tới hết hạn (7 ngày theo JWT_REFRESH_EXPIRATION_DAYS).
 *
 * Phân chia trách nhiệm — cố ý KHÔNG gọi `clearTokens()` ở đây để tránh làm trùng:
 *  - `useLogoutMutation` (src/api/auth.api.ts) đã tự `clearTokens()` + `queryClient.clear()`
 *    trong `onSettled`, tức là chạy cả khi API lỗi.
 *  - Hook này chỉ lo phần còn lại: xoá phiên trong store và điều hướng về trang Đăng nhập.
 *
 * `mutationFn` của `useLogoutMutation` đã tự bắt lỗi API nên `mutateAsync` không reject;
 * vẫn bọc try/catch để chắc chắn việc dọn phiên phía client luôn chạy, đúng yêu cầu
 * "đăng xuất được kể cả khi server từ chối".
 */
export function useLogout() {
  const navigate = useNavigate()
  const clearSession = useAuthStore((s) => s.clearSession)
  const isPlatform = useAuthStore((s) => s.role === APP_ROLE.PLATFORM_ADMIN)
  const logoutMutation = useLogoutMutation()
  const { mutateAsync } = logoutMutation

  const logout = React.useCallback(async () => {
    try {
      await mutateAsync()
    } catch {
      // Không để người dùng kẹt lại phía client nếu server từ chối.
    }
    clearSession()
    navigate(isPlatform ? AUTH_PATHS.PLATFORM_LOGIN : AUTH_PATHS.LOGIN, { replace: true })
  }, [mutateAsync, clearSession, isPlatform, navigate])

  return { logout, isLoggingOut: logoutMutation.isPending }
}
