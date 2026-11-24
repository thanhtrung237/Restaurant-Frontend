import type { BaseResponse } from "./base.model"
import type { InvoiceStatus } from "../enums"
import type { Payment } from "./payment.model"

/**
 * Mirror của `InvoiceResponse.java` — hoá đơn chốt của 1 PHIÊN BÀN.
 * Nguồn: `GET /invoices/{id}`, `GET /invoices/session/{tableSessionId}`.
 *
 * LƯU Ý: Response **không có `orderId`/`order`**. Hoá đơn gắn với `tableSessionId`,
 * vì 1 phiên bàn có thể có nhiều Order (nhiều lượt gọi món) nhưng chỉ ra 1 hoá đơn.
 * (Entity `Invoice.java` ở BE có cột `order_id` nhưng DTO không expose ra ngoài.)
 *
 * Các field BE đã tính sẵn — nên dùng lại, KHÔNG tự cộng ở FE để tránh lệch công thức:
 * `subTotalBeforeDiscount`, `totalManualDiscount`, `serviceFee`, `vatAmount`,
 * `grandTotal`, `totalPaid`, `remainingAmount` (= còn phải trả, dùng cho màn thu ngân).
 */
export interface Invoice extends BaseResponse {
  quoteShared?: boolean
  discountApprovalPending?: boolean
  branchId: number
  branchName?: string
  tableSessionId: number
  tableName?: string
  takeaway?: boolean
  promotionId?: number
  promotionName?: string
  /** Đánh số riêng theo chi nhánh (BR-19). */
  invoiceNumber: string
  invoiceNote?: string
  subTotalBeforeDiscount?: number
  totalPromotionDiscount?: number
  totalManualDiscount?: number
  /** Breakdown BE đã tách sẵn (InvoiceResponse.java) */
  itemPromotionDiscount?: number
  orderPromotionDiscount?: number
  orderPromotionId?: number
  orderPromotionName?: string
  serviceFee?: number
  vatAmount?: number
  grandTotal: number
  status: InvoiceStatus
  payments?: Payment[]
  totalPaid?: number
  remainingAmount?: number
  createdAt?: string
  modifiedAt?: string
  eInvoiceRef?: string
  eInvoiceIssuedAt?: string
  taxCodeUsed?: string
}

/**
 * Mirror của `InvoiceListResponse.java` — bản rút gọn cho danh sách hoá đơn.
 * Không có chi tiết tiền (chỉ `grandTotal`) và không có `payments`.
 */
export interface InvoiceListItem extends BaseResponse {
  invoiceNumber: string
  branchName?: string
  tableName?: string
  grandTotal: number
  status: InvoiceStatus
  createdAt?: string
}

export interface BillPreviewResponse {
  tableSessionId: number
  sessionStatus: string
  invoiceId?: number
  invoiceStatus?: InvoiceStatus
  grossSubTotal?: number
  itemPromotionDiscount?: number
  orderPromotionDiscount?: number
  orderPromotionId?: number
  orderPromotionName?: string
  manualDiscount?: number
  amountAfterDiscount?: number
  serviceFeeRate?: number
  serviceFee?: number
  vatRate?: number
  vatOnServiceFee?: boolean
  vatBase?: number
  vatAmount?: number
  grandTotal?: number
  hasPendingWeight?: boolean
}
