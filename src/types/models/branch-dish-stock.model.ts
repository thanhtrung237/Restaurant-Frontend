import type { BaseResponse } from "./base.model"
import type { StockStatus } from "../enums"

/**
 * Mirror của `BranchDishStockResponse.java` — bật/tắt "hết món" theo TỪNG CHI NHÁNH.
 * Thuộc cấp chi nhánh, không phải cấp nhà hàng: cùng 1 món có thể còn ở chi nhánh A
 * và hết ở chi nhánh B.
 *
 * Endpoint (`/branch-dish-stocks`):
 * - `GET  /branch/{branchId}`                     — toàn bộ trạng thái tồn của chi nhánh
 * - `GET  /branch/{branchId}/out-of-stock`        — chỉ món đang hết (màn "Cảnh báo món hết")
 * - `PUT  /branch/{branchId}/dish/{dishId}/toggle` — đảo trạng thái còn/hết 1 món
 * - `PUT  /branch/{branchId}/restore-all`          — mở lại tất cả (thường chạy đầu ngày)
 *
 * Response chỉ có `modifiedAt`, KHÔNG có `createdAt`.
 */
export interface BranchDishStock extends BaseResponse {
  branchId: number
  branchName?: string
  dishId: number
  dishName?: string
  status: StockStatus
  modifiedAt?: string
}
