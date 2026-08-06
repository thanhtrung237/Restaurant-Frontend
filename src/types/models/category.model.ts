import type { BaseResponse } from "./base.model"
import type { CategoryStatus } from "../enums"

/** Mirror của `CategoryResponse.java` — danh mục món, thuộc cấp Nhà hàng. */
export interface Category extends BaseResponse {
  restaurantId: number
  restaurantName?: string
  name: string
  displayOrder?: number
  status: CategoryStatus
  createdAt?: string
  modifiedAt?: string
}
