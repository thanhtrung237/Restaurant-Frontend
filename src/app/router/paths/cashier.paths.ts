const CASHIER_BASE = "/cashier"

/**
 * URI cho Thu ngân (mục 4.1: phạm vi Chi nhánh). KHÔNG có quyền Mở bàn.
 * TABLE_MAP dùng chung component floor-ops để "Xem tạm tính của bàn" trước khi thu tiền;
 * TRANSFER_MERGE_TABLE vì Thu ngân có quyền X đầy đủ (không cần duyệt, khác Phục vụ) (mục 4.2).
 */
export const CASHIER_PATHS = {
  ORDER_AND_PREP: `${CASHIER_BASE}/orders-and-prep`,
  ORDER_DETAIL: `${CASHIER_BASE}/order/:orderId`,
  TABLE_MAP: `${CASHIER_BASE}/table-map`, // Sơ đồ bàn — trang chủ của Thu ngân, xem tạm tính
  TRANSFER_MERGE_TABLE: `${CASHIER_BASE}/transfer-merge-tables`, // Chuyển / Gộp bàn
  CHECKOUT: `${CASHIER_BASE}/checkout/:tableSessionId`, // Chốt bàn, tính phí DV/VAT, chiết khấu tay, đóng phiên
  QR_TRANSFER_PAYMENT: `${CASHIER_BASE}/checkout/:tableSessionId/qr-transfer`,
  E_INVOICE: `${CASHIER_BASE}/e-invoices/:invoiceId`, // Hóa đơn điện tử đã phát hành
  INVOICES: `${CASHIER_BASE}/invoices`, // Danh sách hóa đơn
} as const
