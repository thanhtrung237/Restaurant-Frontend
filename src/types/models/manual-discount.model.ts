import type { BaseResponse } from "./base.model"
import type { DiscountType } from "../enums"

/**
 * Mirror của `ManualDiscountResponse.java` — chiết khấu tay.
 *
 * Gắn vào Order HOẶC Invoice (một trong hai, cái còn lại null).
 * `approvedById` chỉ có khi giá trị vượt `Branch.discountApprovalThreshold` và cần người duyệt;
 * `createdById` là người thực hiện chiết khấu.
 */
export interface ManualDiscount extends BaseResponse {
  orderId?: number
  invoiceId?: number
  createdById?: number
  createdByName?: string
  approvedById?: number
  approvedByName?: string
  type: DiscountType
  value: number // BigDecimal
  reason: string
  createdAt?: string
  modifiedAt?: string
}
