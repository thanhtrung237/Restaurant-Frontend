/**
 * URI cho Khach hang - mobile, không đăng nhập, mọi route đều scope theo mã QR của bàn.
 * :qrCode lấy từ DiningTable.qrCode, BE tự suy ra Nhà hàng + Chi nhánh (mục 1.2, bước 1).
 *
 * Một số màn hình trong danh sách gốc (Giỏ hàng trống, Xác nhận gửi order, Gửi order
 * thành công, Cảnh báo món hết, Từ chối) là TRẠNG THÁI/MODAL hiển thị trong route
 * tương ứng chứ không phải route riêng — ghi chú `state của <route>` bên dưới.
 */
const CUSTOMER_BASE = "/ban/:qrCode"

export const CUSTOMER_PATHS = {
  TABLE_OPEN_QR: `${CUSTOMER_BASE}`, // Mở bàn (QR) — landing sau khi quét QR
  WAITING_TABLE_OPEN: `${CUSTOMER_BASE}/cho-mo-ban`, // Chờ mở bàn (khi Phục vụ chưa xác nhận)
  MENU: `${CUSTOMER_BASE}/thuc-don`, // Thực đơn — cũng chứa state "Cảnh báo món hết"
  SEARCH_DISH: `${CUSTOMER_BASE}/thuc-don/tim-kiem`, // Tìm kiếm món
  DISH_DETAIL: `${CUSTOMER_BASE}/mon/:dishId`, // Chi tiết món
  CART: `${CUSTOMER_BASE}/gio-hang`, // Giỏ hàng — cũng chứa state "Giỏ hàng trống"
  ORDERED_ITEMS: `${CUSTOMER_BASE}/mon-da-goi`, // Món đã gọi — theo dõi trạng thái từng dòng món
  INVOICE: `${CUSTOMER_BASE}/hoa-don`, // Hóa đơn tạm tính / hóa đơn chốt
  PAYMENT_QR: `${CUSTOMER_BASE}/thanh-toan-qr`, // Thanh toán QR (chuyển khoản)
  REQUEST_BILL: `${CUSTOMER_BASE}/yeu-cau-tinh-tien`, // Yêu cầu tính tiền
  PAYMENT_SUCCESS: `${CUSTOMER_BASE}/thanh-toan-thanh-cong`,
  PAYMENT_FAILED: `${CUSTOMER_BASE}/thanh-toan-that-bai`,
  REVIEW: `${CUSTOMER_BASE}/danh-gia`, // Đánh giá sau khi đóng phiên
  REJECTED: `${CUSTOMER_BASE}/tu-choi`, // Từ chối / Chưa thể gọi món
} as const