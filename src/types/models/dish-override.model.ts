import type { BaseResponse } from "./base.model"

/** Mirror của `DishOverrideResponse.java` — bản đè giá/ẩn món theo từng chi nhánh (BR-17). */
export interface DishOverride extends BaseResponse {
  branchId: number
  branchName?: string
  dishId: number
  dishName?: string
  overridePrice?: number // BigDecimal
  isHidden?: boolean
  createdAt?: string
  modifiedAt?: string
}
