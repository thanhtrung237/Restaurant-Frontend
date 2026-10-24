/**
 * API cho vận hành sàn/bếp — dùng chung Phục vụ, Thu ngân, QL chi nhánh, Quản trị NH.
 *
 *  - Sơ đồ bàn        → `useTablesByBranch(branchId)` + `useOpenSessionsByBranch(branchId, { refetchInterval })`
 *                       Ghép 2 nguồn này để ra trạng thái hiển thị: `DiningTable.status` cho
 *                       trạng thái bàn, `TableSession.status` cho chờ xác nhận / chờ thanh toán.
 *  - Mở bàn           → `useCreateTableSession()` (khách quét QR) hoặc `openSessionLegacy()` (mở tại quầy)
 *  - Xác nhận mở bàn  → `useConfirmOpenSession()`
 *  - Xác nhận order   → Items now go directly to KDS with PENDING status after customer sends order.
 *                       Kitchen staff confirms items individually in KDS using `useChangeOrderDetailStatus()`
 *                       to transition from PENDING → PREPARING. The legacy `useConfirmOrder()` is deprecated.
 *  - Thêm món vào bàn → `useCreateOrder()` với `{ tableSessionId, items[], orderedById }` — tạo
 *                       1 lượt gọi mới, giống hệt cơ chế khách tự gọi qua QR (xem `add-dish`)
 *  - KDS bếp          → `useOrderDetailsBySession(...)`, `useChangeOrderDetailStatus()`,
 *                       `useConfirmWeight()` (món cân), `useMarkServed()`
 *  - Huỷ món          → `useCancelBeforeKitchen()` (chưa vào bếp) / `useCancelAfterKitchen()` (đã vào bếp, cần lý do)
 *
 * CHƯA CÓ Ở BACKEND: chuyển bàn / gộp bàn. Enum `TableSessionStatus.MERGED` có tồn tại
 * nhưng không controller nào expose thao tác merge/transfer. Cần hỏi BE trước khi làm màn
 * `transfer-merge-table`.
 */
export { useTablesByBranch, changeTableStatus, useGenerateTableQrCode } from "@/api/tables.api"
export {
  openSessionLegacy, useCancelReservation, useCancelSession, useCloseSession,
  useConfirmOpenSession, useCreateTableSession, useReserveTableSession, useOpenSessionsByBranch,
  useReopenSession, useRequestPayment, useTableSession, useTransferTable, useMergeTable,
  useBillPreview,
} from "@/api/table-sessions.api"
/** Hoá đơn của phiên — dùng để biết đã phát hành chưa (nút Đóng bàn / Hủy phiên). */
export { useInvoiceBySession } from "@/api/invoices.api"
export { useAreasByBranch } from "@/api/areas.api"
export {
  useConfirmOrder, useCancelOrder, useCreateOrder, useOrder, useOrdersByBranch, useOrdersBySession,
} from "@/api/orders.api"
export {
  useAddOrderDetail, useCancelAfterKitchen, useCancelBeforeKitchen,
  useChangeOrderDetailStatus, useBatchConfirmOrderDetails, useConfirmWeight, useMarkServed, useOrderDetailsBySession,
} from "@/api/order-details.api"
export { useBranchMenu } from "@/api/branch-menu.api"
/** Tên chi nhánh cho subtitle màn KDS: "<Tên chi nhánh> · N dòng món đang xử lý". */
export { useBranch } from "@/api/branches.api"
export { useReprintKitchenTicket } from "@/api/kitchen-tickets.api"