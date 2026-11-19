import type { BaseResponse } from "./base.model"
import type { RoleScope } from "../enums"

/**
 * Mirror của `RoleResponse.java`. Response dùng `updatedAt`.
 *
 * Quyền vận hành tùy chỉnh lấy từ API operational-permissions theo từng nhà hàng.
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
