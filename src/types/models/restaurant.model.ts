import type { BaseResponse } from "./base.model"
import type { RestaurantStatus } from "../enums"

/** Mirror của `RestaurantResponse.java`. Response dùng `updatedAt`. */
export interface Restaurant extends BaseResponse {
  code: string
  name: string
  taxCode?: string
  address?: string
  phone?: string
  logoUrl?: string
  status: RestaurantStatus
  /** BE tính sẵn — dùng cho màn Quản trị nền tảng. */
  branchCount?: number
  accountCount?: number
  createdAt?: string
  updatedAt?: string
}

/** Mirror của `RestaurantListResponse.java` — bản rút gọn cho danh sách nhà hàng. */
export interface RestaurantListItem extends BaseResponse {
  code: string
  name: string
  phone?: string
  status: RestaurantStatus
  branchCount?: number
}
