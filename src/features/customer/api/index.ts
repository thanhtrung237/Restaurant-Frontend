/**
 * API cho luồng KHÁCH HÀNG (mobile, scope theo QR bàn).
 *
 * Thứ tự màn hình → endpoint:
 *  1. Quét QR          → `getTableByQrCode(branchId, qrCode)` → `createTableSession({ tableId })`
 *  2. Chờ mở bàn       → `useTableSession(id, { refetchInterval: 3000 })`, chờ status = SERVING
 *  3. Thực đơn         → `useBranchMenu(branchId)` (đã có giá đè + trạng thái còn/hết)
 *  4. Chi tiết món     → `useDish(dishId)` + `useDishOptionGroups(dishId)` nếu món có tuỳ chọn
 *  5. Món hết          → `useOutOfStock(branchId)`
 *  6. Giỏ hàng → gửi   → `useCreateOrder()` với body `{ tableSessionId, items: [{ dishId, ... }] }`
 *  7. Món đã gọi       → `useOrderDetailsBySession(id, undefined, { refetchInterval: 5000 })`
 *  8. Yêu cầu tính tiền→ `useRequestPayment()`
 *  9. Hoá đơn          → `useInvoiceBySession(tableSessionId)`
 * 10. Thanh toán QR    → `useCreatePayment()` (method BANK_TRANSFER) rồi poll `useInvoice(id, {...})`
 *
 * CHƯA CÓ Ở BACKEND: màn "Đánh giá" (`review`) không có controller tương ứng —
 * cần chốt với đội BE là bổ sung API hay bỏ khỏi phạm vi MVP.
 */
export { getTableByQrCode, useTableByQrCode } from "@/api/tables.api"
export {
  createTableSession,
  getOpenSessionByTable,
  requestPayment,
  useCreateTableSession,
  useRequestPayment,
  useTableSession,
  useCallStaff,
} from "@/api/table-sessions.api"
export type { TableSessionCreateRequest } from "@/types/requests"
export { getBranchMenu, useBranchMenu } from "@/api/branch-menu.api"
export { getDish, useDish } from "@/api/dishes.api"
export { useDishOptionGroups } from "@/api/dish-option-groups.api"
export { useOptionItemsByGroup } from "@/api/option-items.api"
export { useOutOfStockDishes as useOutOfStock } from "@/api/branch-dish-stocks.api"
export { createOrder, useCreateOrder } from "@/api/orders.api"
export { useOrderDetailsBySession, useCancelBeforeKitchen } from "@/api/order-details.api"
export {
  useInvoice,
  useInvoiceBySession,
  useInvoiceQrCode,
  useInvoiceQrCodeBySession,
  useCreateInvoice,
} from "@/api/invoices.api"
export { useCreatePayment } from "@/api/payments.api"
