import type { BaseResponse } from "./base.model"
import type { AccountStatus } from "../enums"
import type { Assignment } from "./assignment.model"

/**
 * Mirror của `AccountResponse.java` — tài khoản nhân viên.
 * (Khách hàng không có Account, khách dùng token phiên bàn.)
 *
 * Nguồn: `GET /accounts/{id}`, `GET /accounts/restaurant/{restaurantId}`.
 *
 * LƯU Ý:
 * - Response dùng `updatedAt` (KHÔNG phải `modifiedAt` như đa số response khác).
 * - `assignments` chính là nơi chứa `branchId` — `LoginResponse` KHÔNG trả `branchId`,
 *   nên sau khi đăng nhập phải lấy branch hiện hành từ đây (hoặc từ
 *   `GET /assignments/account/{accountId}`). 1 account có thể có nhiều Assignment ở
 *   nhiều chi nhánh → cần UI chọn chi nhánh (Phase 5).
 */
export interface Account extends BaseResponse {
  restaurantId: number
  restaurantName?: string
  fullName: string
  employeeCode: string
  username: string
  email?: string
  phone?: string
  hireDate?: string
  status: AccountStatus
  assignments?: Assignment[]
  createdAt?: string
  updatedAt?: string
}
