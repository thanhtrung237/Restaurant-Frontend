import type { PermissionMatrixSection } from "./types"

/**
 * MA TRẬN PHÂN QUYỀN — chép từ đặc tả, dùng để HIỂN THỊ.
 *
 * Nguồn duy nhất: `Dac_Ta_Chuc_Nang_Order_Nha_Hang_v2`, mục **4.2** (Quyền cấp chi nhánh,
 * 24 dòng) và mục **4.3** (Quyền cấp nhà hàng và nền tảng, 11 dòng). Chép nguyên văn tên
 * chức năng và từng ô; ô trống trong đặc tả ⇒ không có khoá trong `cells`.
 *
 * > Chú giải Bảng 4.2 — *"X = được phép · A = được phép nhưng cần duyệt · R = chỉ đọc ·
 * > trống = không được phép"*
 *
 * ⚠️ File này KHÔNG phải chốt chặn quyền. Chốt chặn thật của FE nằm ở
 * `src/config/permissions.ts`, của BE nằm ở `@PreAuthorize` + `TenantGuard`. Sửa file này
 * không đổi quyền của ai; ngược lại, sửa quyền cũng không tự cập nhật file này.
 *
 * ⚠️ Cũng KHÔNG lấy từ API: backend không có bảng quyền, `Role` chỉ có `name` / `code` /
 * `scope` (xem `docs/reports/nhan-vien-buoc-0.md` mục 5). Vì vậy tab "Vai trò & phân quyền"
 * là chỉ đọc.
 *
 * Khi đặc tả đổi: sửa ở đây, và ghi lại lần đối chiếu gần nhất.
 * Đối chiếu lần cuối: 2026-09-27 — đủ 24 dòng của 4.2 và 11 dòng của 4.3.
 */

/** Bảng 4.2 — 5 cột, đặc tả KHÔNG có cột "QT nền tảng" ở bảng này. */
const BRANCH_LEVEL: PermissionMatrixSection = {
  id: "branch-level",
  title: "Quyền cấp chi nhánh",
  columns: [
    { key: "customer", label: "Khách" },
    { key: "waiter", label: "Phục vụ" },
    { key: "cashier", label: "Thu ngân" },
    { key: "branchManager", label: "QL chi nhánh" },
    { key: "restaurantAdmin", label: "Quản trị NH" },
  ],
  rows: [
    {
      id: 1,
      feature: "Quét QR, xem menu",
      cells: {
        customer: "allow",
        waiter: "allow",
        branchManager: "allow",
        restaurantAdmin: "allow",
      },
    },
    {
      id: 2,
      feature: "Gửi order",
      cells: {
        customer: "allow",
        waiter: "allow",
        branchManager: "allow",
        restaurantAdmin: "allow",
      },
    },
    {
      id: 3,
      feature: "Xác nhận order",
      cells: { waiter: "allow", branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 4,
      feature: "Hủy món chưa chế biến",
      cells: {
        customer: "allow",
        waiter: "allow",
        branchManager: "allow",
        restaurantAdmin: "allow",
      },
    },
    {
      id: 5,
      feature: "Hủy món ĐANG CHẾ BIẾN / ĐÃ PHỤC VỤ",
      cells: { waiter: "allow", branchManager: "approval", restaurantAdmin: "approval" },
      cellNotes: { waiter: "A nếu không tính tiền" },
    },
    {
      id: 6,
      feature: "Cập nhật trạng thái chế biến",
      cells: { waiter: "allow", branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 7,
      feature: "Nhập / sửa số cân",
      cells: { waiter: "allow", branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 8,
      feature: "Báo hết món tại chi nhánh",
      cells: { branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 9,
      feature: "Bỏ đánh dấu hết món",
      cells: { branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 10,
      feature: "Đặt bàn trước",
      cells: { waiter: "allow", branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 11,
      feature: "Mở phiên bàn",
      cells: { waiter: "allow", branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 12,
      feature: "Đóng phiên bàn",
      cells: { cashier: "allow", branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 13,
      feature: "Chuyển / gộp bàn",
      cells: {
        waiter: "approval",
        cashier: "allow",
        branchManager: "allow",
        restaurantAdmin: "allow",
      },
    },
    {
      id: 14,
      feature: "Xem tạm tính của bàn",
      cells: {
        customer: "allow",
        waiter: "allow",
        cashier: "allow",
        branchManager: "allow",
        restaurantAdmin: "allow",
      },
    },
    {
      id: 15,
      feature: "Thu tiền, đóng bàn",
      cells: { cashier: "allow", branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 16,
      feature: "Chiết khấu tay",
      cells: { cashier: "allow", branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 17,
      feature: "Phát hành hóa đơn điện tử",
      cells: { cashier: "allow", branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 18,
      feature: "Quản lý bàn, mã QR",
      cells: { branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 19,
      feature: "Tạo món riêng của chi nhánh",
      cells: { branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 20,
      feature: "Cấu hình chi nhánh — giờ giấc, TK ngân hàng, thời gian tự hủy phiên",
      cells: { branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 21,
      feature: "Cấu hình chi nhánh — VAT, phí dịch vụ, ngưỡng chiết khấu, MST riêng",
      note: "Chỉ Quản trị nhà hàng",
      cells: { restaurantAdmin: "allow" },
    },
    {
      id: 22,
      feature: "Xem báo cáo chi nhánh mình",
      cells: { branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 23,
      feature: "Xem nhật ký hoạt động chi nhánh mình",
      cells: { branchManager: "readonly", restaurantAdmin: "readonly" },
    },
    {
      id: 24,
      feature: "Hoàn tiền / điều chỉnh hóa đơn",
      cells: { cashier: "approval", branchManager: "allow", restaurantAdmin: "allow" },
    },
    {
      id: 25,
      feature: "Xem khuyến mãi đang áp dụng tại chi nhánh",
      cells: { branchManager: "readonly", restaurantAdmin: "readonly" },
    },
    {
      id: 26,
      feature: "Tra cứu hóa đơn theo chi nhánh",
      cells: { cashier: "readonly", branchManager: "readonly", restaurantAdmin: "readonly" },
    },
  ],
}

/** Bảng 4.3 — 3 cột. */
const RESTAURANT_LEVEL: PermissionMatrixSection = {
  id: "restaurant-level",
  title: "Quyền cấp nhà hàng và nền tảng",
  columns: [
    { key: "branchManager", label: "QL chi nhánh" },
    { key: "restaurantAdmin", label: "Quản trị nhà hàng" },
    { key: "platformAdmin", label: "QT nền tảng" },
  ],
  rows: [
    { id: 1, feature: "Quản lý Menu nhà hàng", cells: { restaurantAdmin: "allow" } },
    { id: 2, feature: "Quản lý danh mục", cells: { restaurantAdmin: "allow" } },
    { id: 3, feature: "Quản lý nhóm tùy chọn món", cells: { restaurantAdmin: "allow" } },
    { id: 4, feature: "Quản lý chương trình khuyến mãi", cells: { restaurantAdmin: "allow" } },
    { id: 5, feature: "Xem báo cáo", cells: { restaurantAdmin: "allow" } },
    { id: 6, feature: "Quản lý chi nhánh", cells: { restaurantAdmin: "allow" } },
    { id: 7, feature: "Quản lý nhân viên", cells: { restaurantAdmin: "allow" } },
    { id: 8, feature: "Cấu hình vai trò & quyền", cells: { restaurantAdmin: "allow" } },
    {
      id: 9,
      feature: "Cấu hình nhà hàng (MST, logo, HĐĐT)",
      cells: { restaurantAdmin: "allow" },
    },
    {
      id: 10,
      feature: "Xem nhật ký hoạt động toàn nhà hàng",
      cells: { branchManager: "allow", restaurantAdmin: "allow" },
      cellNotes: { branchManager: "Chỉ chi nhánh mình" },
    },
    {
      id: 11,
      feature: "Xem dữ liệu kinh doanh của khách",
      cells: { platformAdmin: "never" },
    },
  ],
}

export const PERMISSION_MATRIX_SECTIONS: PermissionMatrixSection[] = [
  BRANCH_LEVEL,
  RESTAURANT_LEVEL,
]

/**
 * Sáu vai trò của đặc tả mục 4.1 — dùng cho dòng phụ của trang.
 * Đếm từ chính hai bảng trên: 5 vai trò ở 4.2 + Quản trị nền tảng ở 4.3.
 */
export const SPEC_ROLE_COUNT = 6
