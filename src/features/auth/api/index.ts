/**
 * API của luồng Đăng nhập / Đổi mật khẩu.
 *
 * Lưu ý cho Phase 5:
 * - `POST /auth/login` cần 3 field, trong đó `restaurantCode` là ô FE CHƯA có trên form.
 * - `LoginResponse` không trả `branchId`. Sau khi login phải gọi `getAccount(accountId)`
 *   (response đã kèm `assignments`) để suy ra chi nhánh hiện hành. Tài khoản có nhiều
 *   Assignment ở nhiều chi nhánh thì cần bước chọn chi nhánh.
 * - Backend KHÔNG có endpoint "quên mật khẩu" tự phục hồi. Luồng duy nhất là admin gọi
 *   `resetPassword()` hộ. Trang "Quên mật khẩu" hiện tại cần chốt lại nghiệp vụ với BE.
 */
export { login, logout, refreshToken, useLoginMutation, useLogoutMutation } from "@/api/auth.api"
export { getAccount, useAccount, changePassword, resetPassword } from "@/api/accounts.api"
export { getAssignmentsByAccount, useAssignmentsByAccount } from "@/api/assignments.api"
export { getRestaurantByCode } from "@/api/restaurants.api"
