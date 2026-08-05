import type { BaseResponse } from "./base.model"
import type { RoleScope } from "../enums"

/**
 * Mirror của `RoleResponse.java`. Response dùng `updatedAt`.
 *
 * LƯU Ý: BE KHÔNG có field lưu ma trận quyền (permission matrix) trong Role — quyền đang
 * hard-code ở FE (`config/permissions.ts`). Trang "Vai trò & phân quyền" vì vậy chỉ quản lý
 * được tên/mã/scope của vai trò, chưa cấu hình được quyền chi tiết qua API.
 */
export interface Role extends BaseResponse {
  restaurantId: number
  restaurantName?: string
  name: string
  code: string
  scope: RoleScope
  /** Số Assignment đang dùng vai trò này — BE tính sẵn (chặn xoá khi > 0). */
  assignmentCount?: number
  createdAt?: string
  updatedAt?: string
}

/** Mirror của `RoleListResponse.java` — bản rút gọn cho danh sách vai trò. */
export interface RoleListItem extends BaseResponse {
  name: string
  code: string
  scope: RoleScope
  assignmentCount?: number
}
