import type { BaseResponse } from "./base.model"
import type { PaymentMethod } from "../enums"

/**
 * Mirror của `PaymentResponse.java` — 1 lần thanh toán cho hoá đơn.
 * 1 hoá đơn có thể có nhiều Payment (thanh toán nhiều lần / nhiều phương thức).
 *
 * `amountTendered` = tiền khách đưa, `changeAmount` = tiền thối lại — BE tính sẵn,
 * dùng cho màn hình thu ngân khi `method = CASH`.
 *
 * Response chỉ có `createdAt`, KHÔNG có `modifiedAt`.
 */
export interface Payment extends BaseResponse {
  invoiceId: number
  method: PaymentMethod
  amount: number // BigDecimal
  paidAt?: string // LocalDateTime
  transactionRef?: string
  bankVerified?: boolean
  amountTendered?: number
  changeAmount?: number
  createdAt?: string
}
