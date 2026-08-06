import type { BaseResponse } from "./base.model"
import type { DishStatus } from "../enums"

/**
 * Mirror của `DishResponse.java` — món ăn "gốc" (giá gốc, trước khi bị đè giá theo chi nhánh).
 * Nguồn: `GET /dishes/{id}`, `GET /dishes/restaurant/{restaurantId}`, `GET /dishes/branch/{branchId}`.
 *
 * `branchId`/`branchName` chỉ có giá trị với món RIÊNG của 1 chi nhánh; món dùng chung
 * toàn nhà hàng sẽ để null.
 *
 * Để lấy giá thực sự hiển thị cho khách tại 1 chi nhánh, dùng `BranchMenuItem`
 * (`GET /branches/{branchId}/menu`) thay vì tự cộng `basePrice` với `DishOverride`.
 */
export interface Dish extends BaseResponse {
  restaurantId: number
  branchId?: number
  branchName?: string
  categoryId: number
  categoryName?: string
  name: string
  basePrice: number // BigDecimal
  taxGroup?: string
  kitchenStationType?: string
  imageUrl?: string
  soldByWeight?: boolean
  status: DishStatus
  description?: string
  createdAt?: string
  modifiedAt?: string
}
