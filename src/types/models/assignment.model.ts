import type { BaseResponse } from "./base.model"
import type { RoleScope } from "../enums"

/**
 * Mirror của `AssignmentResponse.java` — phân công 1 Account vào 1 Role,
 * tuỳ chọn tại 1 Branch cụ thể.
 *
 * Nguồn: `GET /assignments/account/{accountId}`, `GET /assignments/branch/{branchId}`.
 *
 * `branchId` là null với role cấp nhà hàng/nền tảng (PLATFORM/RESTAURANT scope).
 * Response dùng `updatedAt`.
 */
export interface Assignment extends BaseResponse {
  accountId: number
  accountName?: string
  employeeCode?: string
  roleId: number
  roleName?: string
  roleCode?: string
  roleScope?: RoleScope
  branchId?: number
  branchName?: string
  branchCode?: string
  createdAt?: string
  updatedAt?: string
}
