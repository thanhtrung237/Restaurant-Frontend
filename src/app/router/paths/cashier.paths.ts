const CASHIER_BASE = "/thu-ngan"

/**
 * URI cho Thu ngân (mục 4.1: phạm vi Chi nhánh). KHÔNG có quyền Mở bàn.
 * TABLE_MAP dùng chung component floor-ops để "Xem tạm tính của bàn" trước khi thu tiền;
 * TRANSFER_MERGE_TABLE vì Thu ngân có quyền X đầy đủ (không cần duyệt, khác Phục vụ) (mục 4.2).
 */
export const CASHIER_PATHS = {
  TABLE_MAP: `${CASHIER_BASE}/so-do-ban`, // Sơ đồ bàn — trang chủ của Thu ngân, xem tạm tính
  TRANSFER_MERGE_TABLE: `${CASHIER_BASE}/chuyen-gop-ban`, // Chuyển / Gộp bàn
  CHECKOUT: `${CASHIER_BASE}/thanh-toan/:tableSessionId`, // Chốt bàn, tính phí DV/VAT, chiết khấu tay, đóng phiên
  QR_TRANSFER_PAYMENT: `${CASHIER_BASE}/thanh-toan/:tableSessionId/chuyen-khoan-qr`,
  E_INVOICE: `${CASHIER_BASE}/hoa-don-dien-tu/:invoiceId`, // Hóa đơn điện tử đã phát hành
  INVOICES: `${CASHIER_BASE}/hoa-don`, // Danh sách hóa đơn
} as const
