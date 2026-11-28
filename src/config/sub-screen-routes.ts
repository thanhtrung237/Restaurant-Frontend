import { matchPath } from "react-router-dom"

/**
 * Các route được coi là "MÀN CON" của khu vực nhân viên.
 *
 * Màn con là màn hình KHÔNG có mục riêng trên thanh điều hướng — người dùng chỉ tới được
 * bằng cách bấm vào một phần tử ở màn cha (thẻ bàn, dòng order, thẻ chi nhánh...). Ở <md,
 * `StaffLayout` render `MobileHeader variant="back"` cho các route này (nút quay lại tròn
 * + tiêu đề + dòng phụ) thay vì biến thể "app" (avatar + chip chi nhánh + đăng xuất),
 * nên từng trang KHÔNG cần tự vẽ nút back trong nội dung nữa.
 *
 * Khai báo tập trung ở ĐÚNG một chỗ. Trước đây mỗi trang tự dựng nút "← Về ..." riêng,
 * dẫn tới nút back xuất hiện/biến mất không nhất quán giữa các màn.
 *
 * Mẫu dùng cú pháp của react-router (`matchPath`, `end: true`). `:roleBase` là đoạn đầu
 * của đường dẫn theo vai trò (`phuc-vu`, `thu-ngan`, `quan-ly-chi-nhanh`,
 * `quan-tri-nha-hang`) — dùng tham số thay vì liệt kê từng vai trò để không bỏ sót khi
 * thêm vai trò mới dùng chung màn.
 */
export const SUB_SCREEN_ROUTE_PATTERNS: readonly string[] = [
  // Order chi tiết + Thêm món — dùng chung cho Phục vụ / QL chi nhánh / Quản trị NH
  "/:roleBase/order/:orderId",
  "/:roleBase/order/:orderId/add-items",
  "/:roleBase/table-map/takeaway/:orderId",
  // Xác nhận order route removed: items now go directly to KDS where kitchen staff confirms them
  // Chốt bàn / Thanh toán QR / Hóa đơn điện tử — vào từ thẻ bàn trên Sơ đồ bàn
  "/cashier/checkout/:tableSessionId",
  "/cashier/checkout/:tableSessionId/qr-transfer",
  "/cashier/e-invoices/:invoiceId",
  // Hóa đơn điện tử của QL chi nhánh — vào từ danh sách hóa đơn
  "/branch-manager/invoices/:invoiceId",
  // Tạo khuyến mãi — vào từ FAB trên màn Khuyến mãi
  "/:roleBase/promotions/new",
  // Chi tiết chi nhánh của Quản trị NH — vào từ thẻ trên danh sách Chi nhánh.
  // KHÔNG tính `/branch-manager/branches`: đó là chi nhánh của chính QL chi nhánh,
  // có mục riêng trên thanh điều hướng nên là màn CHÍNH.
  "/restaurant-admin/branches/:branchId",
  "/restaurant-admin/branches/:branchId/settings",
]

/** true nếu đường dẫn hiện tại là một màn con (xem `SUB_SCREEN_ROUTE_PATTERNS`). */
export function isSubScreenRoute(pathname: string): boolean {
  return SUB_SCREEN_ROUTE_PATTERNS.some((pattern) =>
    Boolean(matchPath({ path: pattern, end: true }, pathname)),
  )
}
