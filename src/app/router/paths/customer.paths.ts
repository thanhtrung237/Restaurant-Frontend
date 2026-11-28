/**
 * URI cho Khach hang - mobile, không đăng nhập, mọi route đều scope theo mã QR của bàn.
 * :qrCode lấy từ DiningTable.qrCode, BE tự suy ra Nhà hàng + Chi nhánh (mục 1.2, bước 1).
 *
 * Một số màn hình trong danh sách gốc (Giỏ hàng trống, Xác nhận gửi order, Gửi order
 * thành công, Cảnh báo món hết, Từ chối) là TRẠNG THÁI/MODAL hiển thị trong route
 * tương ứng chứ không phải route riêng — ghi chú `state của <route>` bên dưới.
 */
export const CUSTOMER_BASE = "/table"
export const LEGACY_CUSTOMER_BASE = "/ban"
const CUSTOMER_TABLE = `${CUSTOMER_BASE}/:qrCode`

export function getTableGuestPath(qrCode: string) {
  return `${CUSTOMER_BASE}/${encodeURIComponent(qrCode)}`
}

export const CUSTOMER_PATHS = {
  TABLE_OPEN_QR: `${CUSTOMER_TABLE}`, // Mở bàn (QR) — landing sau khi quét QR
  WAITING_TABLE_OPEN: `${CUSTOMER_TABLE}/waiting-for-table`, // Chờ mở bàn (khi Phục vụ chưa xác nhận)
  MENU: `${CUSTOMER_TABLE}/menu`, // Thực đơn — cũng chứa state "Cảnh báo món hết"
  SEARCH_DISH: `${CUSTOMER_TABLE}/menu/search`, // Tìm kiếm món
  DISH_DETAIL: `${CUSTOMER_TABLE}/dish/:dishId`, // Chi tiết món
  CART: `${CUSTOMER_TABLE}/cart`, // Giỏ hàng — cũng chứa state "Giỏ hàng trống"
  ORDERED_ITEMS: `${CUSTOMER_TABLE}/ordered-items`, // Món đã gọi — theo dõi trạng thái từng dòng món
  INVOICE: `${CUSTOMER_TABLE}/invoice`, // Hóa đơn tạm tính / hóa đơn chốt
  PAYMENT_QR: `${CUSTOMER_TABLE}/payment-qr`, // Thanh toán QR (chuyển khoản)
  REQUEST_BILL: `${CUSTOMER_TABLE}/request-bill`, // Yêu cầu tính tiền
  PAYMENT_SUCCESS: `${CUSTOMER_TABLE}/payment-success`,
  PAYMENT_FAILED: `${CUSTOMER_TABLE}/payment-failed`,
  REVIEW: `${CUSTOMER_TABLE}/review`, // Đánh giá sau khi đóng phiên
  REJECTED: `${CUSTOMER_TABLE}/rejected`, // Từ chối / Chưa thể gọi món
} as const
