import { ROLE_HOME } from "./RoleHomeRedirect"
import { AUTH_PATHS } from "./paths"
import type { AppRole } from "@/config/roles"

/**
 * Trang 403 — nguồn duy nhất. Dùng ở `RequirePermission`, `RequireRole`, khai báo route
 * trong `app/router/index.tsx`, và trong danh sách chặn bên dưới.
 */
export const FORBIDDEN_PATH = "/khong-co-quyen-truy-cap"

/**
 * Những trang KHÔNG bao giờ được dùng làm đích sau đăng nhập, kể cả khi
 * `RequireAuth` đã ghi lại chúng trong `state.from`:
 *  - 3 trang auth: quay lại là vòng lặp đăng nhập.
 *  - Trang 403: chính là chỗ người dùng vừa bị đá ra, quay lại là 403 tiếp.
 */
const BLOCKED_TARGETS: readonly string[] = [
  AUTH_PATHS.LOGIN,
  AUTH_PATHS.FORGOT_PASSWORD,
  AUTH_PATHS.FIRST_LOGIN_PASSWORD,
  FORBIDDEN_PATH,
]

/** Phần `state.from` mà `RequireAuth` lưu — chỉ cần 2 trường này. */
export interface PostLoginFrom {
  pathname?: string
  search?: string
}

/**
 * Khu vực đường dẫn của một vai trò, suy từ `ROLE_HOME` để chỉ có MỘT nguồn sự thật.
 * VD: `/phuc-vu/so-do-ban` ⇒ `/phuc-vu`.
 */
function areaPrefixOf(role: AppRole): string {
  const segment = (ROLE_HOME[role] ?? "/").split("/").filter(Boolean)[0]
  return segment ? `/${segment}` : "/"
}

/**
 * Chọn trang để vào sau khi đăng nhập.
 *
 * VẤN ĐỀ ĐƯỢC SỬA: `RequireAuth` lưu `state.from` = trang đang đứng lúc mất phiên.
 * Trước đây màn đăng nhập LUÔN nhảy về đó, không xét vai trò vừa chọn. Nên:
 *  - Đang ở trang Thu ngân, hết phiên, đăng nhập bằng tài khoản Quản trị nhà hàng
 *    ⇒ bị đẩy vào `/thu-ngan/...` ⇒ `RequireRole` đá ra **403**.
 *  - Đang ở chính trang 403 rồi đăng nhập ⇒ quay lại 403.
 * Lần đăng nhập thứ hai hết lỗi chỉ vì nút "Đăng nhập lại" không kèm `state`.
 *
 * Quy tắc: chỉ giữ `from` khi nó nằm trong khu vực của vai trò VỪA CHỌN và không
 * thuộc nhóm trang cấm. Còn lại về trang chủ của vai trò đó.
 */
export function resolvePostLoginTarget(
  role: AppRole,
  from?: PostLoginFrom | null,
): string {
  const home = ROLE_HOME[role]

  const pathname = from?.pathname?.trim()
  if (!pathname || !pathname.startsWith("/")) {
    return home
  }
  if (BLOCKED_TARGETS.includes(pathname)) {
    return home
  }

  const prefix = areaPrefixOf(role)
  const insideRoleArea = pathname === prefix || pathname.startsWith(`${prefix}/`)
  if (!insideRoleArea) {
    return home
  }

  return `${pathname}${from?.search ?? ""}`
}
