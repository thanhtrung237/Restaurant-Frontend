import type { BaseResponse } from "./base.model"
import type { OrderStatus } from "../enums"
import type { OrderDetail } from "./order-detail.model"

/**
 * Mirror của `OrderResponse.java` — 1 "lượt gọi món" trong 1 phiên bàn.
 * Nguồn: `GET /orders/{id}`, `GET /orders/branch/{branchId}`, `GET /orders/session/{tableSessionId}`.
 *
 * LƯU Ý các điểm FE từng khai báo sai:
 * - Danh sách món tên là `items` (KHÔNG phải `orderDetails`). `OrderAddRequest` khi tạo
 *   order cũng dùng `items`.
 * - Người gọi món trả về dạng phẳng `orderedById` + `orderedByName`, KHÔNG có object `Account`.
 * - Response KHÔNG có `invoice`. 1 phiên bàn có thể có nhiều Order nhưng chỉ 1 hoá đơn,
 *   nên hoá đơn lấy riêng qua `GET /invoices/session/{tableSessionId}`.
 */
export interface Order extends BaseResponse {
  tableSessionId: number
  orderedById?: number
  orderedByName?: string
  note?: string
  status: OrderStatus
  items?: OrderDetail[]
  createdAt?: string
  modifiedAt?: string
}
