/**
 * API cho Thu ngân.
 *
 * Luồng chốt bàn:
 *  1. `useTableSession(id)` + `useOrdersBySession(id)` → tổng hợp món của phiên
 *  2. `useCreateManualDiscount()` nếu có chiết khấu tay
 *     (vượt `Branch.discountApprovalThreshold` thì BE bắt buộc có người duyệt)
 *  3. `useCreateInvoice({ branchId, tableSessionId, promotionId?, invoiceNote? })`
 *  4. `useCreatePayment()` — tiền mặt gửi kèm `amountTendered`, BE trả `changeAmount`
 *  5. `useCloseSession(sessionId)`
 *
 * Số tiền (tạm tính, phí dịch vụ, VAT, tổng, đã trả, còn lại) lấy thẳng từ `Invoice`,
 * KHÔNG tự cộng ở FE — BE đã snapshot đúng % VAT/phí tại thời điểm mở phiên.
 */
export { useOrdersBySession, useOrder } from "@/api/orders.api"
export { useOrderDetailsBySession } from "@/api/order-details.api"
export { useCloseSession, useTableSession } from "@/api/table-sessions.api"
export {
  useCancelInvoice,
  useCreateInvoice,
  useInvoice,
  useInvoiceBySession,
  useIssueEInvoice,
  useInvoiceQrCode,
  useInvoiceQrCodeBySession,
} from "@/api/invoices.api"
export { useCreatePayment, usePaymentsByInvoice } from "@/api/payments.api"
export {
  useCreateManualDiscount,
  useDeleteManualDiscount,
  useManualDiscountsByInvoice,
} from "@/api/manual-discounts.api"
export { useBranch } from "@/api/branches.api"
