import { APP_ROLE, type AppRole } from "./roles"

/**
 * Khoá phân quyền theo PHÂN HỆ màn hình.
 *
 * Lưu ý phân biệt hai khoá dễ nhầm (đặc tả Bảng 4.3 tách rất rõ):
 *  - `MENU`        = Menu NHÀ HÀNG: món gốc, danh mục, nhóm tuỳ chọn → CHỈ Quản trị NH.
 *  - `BRANCH_MENU` = Menu CHI NHÁNH: đè giá, ẩn món, món riêng, báo hết món → QL chi nhánh + Quản trị NH.
 */
export const PERMISSION_KEYS = {
  TABLE_MAP: "TABLE_MAP",
  ORDER_AND_PREP: "ORDER_AND_PREP",
  /** Menu NHÀ HÀNG (món gốc / danh mục / nhóm tuỳ chọn) — chỉ Quản trị NH. */
  MENU: "MENU",
  /** Menu CHI NHÁNH (đè giá / ẩn món / món riêng / báo hết món). */
  BRANCH_MENU: "BRANCH_MENU",
  PROMOTIONS: "PROMOTIONS",
  BRANCH_PROMOTIONS_VIEW: "BRANCH_PROMOTIONS_VIEW",
  REPORTS: "REPORTS",
  BRANCHES: "BRANCHES",
  STAFF: "STAFF",
  BRANCH_STAFF: "BRANCH_STAFF",
  CONFIG: "CONFIG",
  /** Nhật ký hoạt động. QL chi nhánh chỉ ĐỌC và chỉ chi nhánh mình (R, FR-LOG-01). */
  AUDIT_LOG: "AUDIT_LOG",
  /** Tra cứu hóa đơn theo phạm vi chi nhánh hoặc nhà hàng của vai trò. */
  INVOICES: "INVOICES",
} as const

export type PermissionKey = keyof typeof PERMISSION_KEYS

/**
 * Ma trận phân quyền theo vai trò (RBAC) — bám đặc tả mục 4.2 (quyền cấp chi nhánh)
 * và 4.3 (quyền cấp nhà hàng / nền tảng).
 *
 * Chú giải của đặc tả: X = được phép · A = được phép nhưng cần duyệt · R = chỉ đọc ·
 * trống = KHÔNG được phép.
 *
 * QUẢN TRỊ NHÀ HÀNG — toàn quyền cấp nhà hàng (Bảng 4.3).
 *
 * QUẢN LÝ CHI NHÁNH — chỉ chi nhánh được phân công (BR-18). Được:
 *   · Vận hành sàn/bếp như Phục vụ (Bảng 4.2: mở bàn, xác nhận order, nhập số cân,
 *     đánh dấu đã phục vụ, huỷ món — đều X)
 *   · Menu CHI NHÁNH: đè giá, ẩn món, tạo món riêng, báo hết món (Bảng 4.2)
 *   · Quản lý bàn & mã QR (Bảng 4.2)
 *   · Cấu hình chi nhánh nhóm 1 — giờ giấc, TK ngân hàng, thời gian tự huỷ phiên (FR-BRN-02)
 *   · Báo cáo chi nhánh mình
 *   · Tra cứu khuyến mãi đang áp dụng tại chi nhánh mình
 *   · Nhật ký chi nhánh mình — CHỈ ĐỌC (R)
 * KHÔNG được (Bảng 4.3 để trống cho cột QL chi nhánh):
 *   · Menu nhà hàng / danh mục / nhóm tuỳ chọn món
 *   · Quản lý chương trình khuyến mãi
 *   · Quản lý tài khoản toàn nhà hàng và cấu hình quyền nền của vai trò
 *   · Cấu hình chi nhánh nhóm 2 — VAT, phí dịch vụ, ngưỡng chiết khấu, MST riêng
 *   · So sánh chi nhánh trong Báo cáo
 *
 * PHỤC VỤ — chỉ sơ đồ bàn và gọi món/chế biến (Bảng 4.2). Không báo cáo, thực đơn,
 * khuyến mãi, nhân viên, cấu hình.
 *
 * THU NGÂN — chỉ sơ đồ bàn (để xem tạm tính và vào thanh toán từ thẻ bàn). Không mở bàn,
 * không xác nhận order. Thanh toán KHÔNG có mục menu riêng: vào từ thẻ bàn trên Sơ đồ bàn.
 */
export const ROLE_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  [APP_ROLE.RESTAURANT_ADMIN]: [
    "TABLE_MAP",
    "ORDER_AND_PREP",
    "MENU",
    "BRANCH_MENU",
    "PROMOTIONS",
    "REPORTS",
    "BRANCHES",
    "STAFF",
    "CONFIG",
    "AUDIT_LOG",
    "INVOICES",
  ],
  [APP_ROLE.BRANCH_MANAGER]: [
    "TABLE_MAP",
    "ORDER_AND_PREP",
    // Menu CHI NHÁNH — KHÔNG có "MENU" (menu nhà hàng) theo Bảng 4.3
    "BRANCH_MENU",
    "BRANCH_PROMOTIONS_VIEW",
    "BRANCH_STAFF",
    "REPORTS",
    "BRANCHES",
    "CONFIG",
    // Chỉ đọc nhật ký chi nhánh mình (R)
    "AUDIT_LOG",
    // Danh sách hóa đơn chi nhánh mình (tra cứu + giám sát)
    "INVOICES",
    // KHÔNG có: MENU, PROMOTIONS, STAFF
  ],
  [APP_ROLE.WAITER]: ["TABLE_MAP", "ORDER_AND_PREP"],
  [APP_ROLE.CASHIER]: [
    "TABLE_MAP",
    // Hóa đơn — tra cứu lại hóa đơn sau khi chốt bàn
    "INVOICES",
  ],
  [APP_ROLE.PLATFORM_ADMIN]: [],
  [APP_ROLE.CUSTOMER]: [],
}

/**
 * Kiểm tra xem một vai trò có quyền truy cập vào phân hệ được yêu cầu hay không.
 */
export function hasPermission(
  role: AppRole | null | undefined,
  permission: PermissionKey,
): boolean {
  if (!role) return false
  // Không còn lối tắt "Quản trị NH luôn true": ROLE_PERMISSIONS ở trên đã liệt kê đủ
  // quyền của vai trò này. Giữ lối tắt sẽ khiến ma trận không còn là nguồn sự thật
  // duy nhất, và khoá mới thêm về sau tự động lọt quyền mà không ai nhận ra.
  const permissions = ROLE_PERMISSIONS[role] || []
  return permissions.includes(permission)
}
