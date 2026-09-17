import { Navigate, Outlet } from "react-router-dom"
import { useAuthStore } from "@/stores/auth.store"
import { ROLE_HOME } from "@/app/router/RoleHomeRedirect"

/**
 * Đang đăng nhập mà vào trang đăng nhập ⇒ đưa thẳng về trang chủ của vai trò.
 *
 * Không có chốt này thì người đang làm việc gõ `/dang-nhap` (hoặc bị một đường dẫn hỏng đá
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

  if (isAuthenticated && role) {
    return <Navigate to={ROLE_HOME[role]} replace />
  }
  return <Outlet />
}
