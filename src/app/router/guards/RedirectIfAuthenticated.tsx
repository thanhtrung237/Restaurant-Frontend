import { Navigate, Outlet, useLocation } from "react-router-dom"
import { useAuthStore } from "@/stores/auth.store"
import { resolvePostLoginTarget, type PostLoginFrom } from "@/app/router/post-login-target"

/**
 * Đang đăng nhập mà vào trang đăng nhập ⇒ đưa thẳng về trang chủ của vai trò.
 *
 * Không có chốt này thì người đang làm việc gõ `/login` (hoặc bị một đường dẫn hỏng đá
 * về đó) sẽ thấy form đăng nhập trống, tưởng mình đã bị đăng xuất — trong khi phiên vẫn còn
 * nguyên. Dùng chung `ROLE_HOME` với `RoleHomeRedirect` và `resolvePostLoginTarget` để chỉ
 * có MỘT nguồn quyết định "trang chủ của vai trò này ở đâu".
 *
 * Muốn đăng nhập bằng tài khoản khác thì bấm "Đăng xuất" trước — lúc đó phiên đã bị xoá nên
 * chốt này không chặn nữa.
 */
export default function RedirectIfAuthenticated() {
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const role = useAuthStore((s) => s.role)
  const { state } = useLocation()

  if (isAuthenticated && role) {
    const from = (state as { from?: PostLoginFrom } | null)?.from
    return <Navigate to={resolvePostLoginTarget(role, from)} replace />
  }
  return <Outlet />
}
