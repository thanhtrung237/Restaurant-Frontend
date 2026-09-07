import type { BaseResponse } from "./base.model"
import type { CancelReason, OrderDetailStatus } from "../enums"

/**
 * OrderDetailOption - tùy chọn món ăn đã chọn (size, topping, etc.)
 */
export interface OrderDetailOption {
  id: number
  optionItemId: number
  optionItemName: string
  priceSnapshot: number // Giá tại thời điểm gọi món
}

/**
 * Mirror của `OrderDetailResponse.java` — 1 dòng món trong Order.
 * Nguồn: `GET /order-details/session/{tableSessionId}` (KDS bếp, màn "Món đã gọi").
 *
 * Món trả về dạng phẳng `dishId` + `dishName` (không có object `Dish`), khuyến mãi cũng vậy.
 *
 * Nhóm field huỷ món sau khi đã vào bếp (`POST /order-details/{id}/cancel-after-kitchen`):
 * - `cancelReason` — RESTAURANT_ERROR (lỗi nhà hàng) hoặc CUSTOMER_CHANGED_MIND (khách đổi ý)
 * - `isBillable` — true = đã huỷ nhưng VẪN tính tiền (thường khi khách đổi ý lúc bếp đã làm)
 * - `cancelledAt` — thời điểm huỷ
 *
 * Món bán theo cân: `status = PENDING_WEIGHT` cho tới khi nhân viên cân xong và gọi
 * `POST /order-details/{id}/confirm-weight`, lúc đó `weightKg` và `price` mới có giá trị.
 *
 * Phân biệt `priceAtOrderTime` (đơn giá chốt lúc gọi món) và `price`
 * (thành tiền dòng món do BE tính, đã trừ khuyến mãi).
 */
export interface OrderDetail extends BaseResponse {
  orderId: number
  dishId: number
  dishName?: string
  promotionId?: number
  promotionName?: string
  quantity: number
  priceAtOrderTime: number // BigDecimal
  promotionDiscountAmount?: number
  weightKg?: number
  isTakeAway: boolean
  note?: string
  status: OrderDetailStatus
  price?: number
  // --- options đã chọn (size, topping, etc.) ---
  options?: OrderDetailOption[]
  // --- huỷ món sau bếp ---
  cancelReason?: CancelReason
  isBillable?: boolean
  cancelledAt?: string
  createdAt?: string
  modifiedAt?: string
}