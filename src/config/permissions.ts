import { APP_ROLE, type AppRole } from "./roles"

export const PERMISSION_KEYS = {
  TABLE_MAP: "TABLE_MAP",
  ORDER_AND_PREP: "ORDER_AND_PREP",
  MENU: "MENU",
  PROMOTIONS: "PROMOTIONS",
  REPORTS: "REPORTS",
  BRANCHES: "BRANCHES",
  STAFF: "STAFF",
  CONFIG: "CONFIG",
} as const

export type PermissionKey = keyof typeof PERMISSION_KEYS

/**
 * Ma trận phân quyền theo vai trò (Role-Based Access Control - RBAC) — theo đúng mục 4
 * (4.2 Quyền cấp chi nhánh, 4.3 Quyền cấp nhà hàng và nền tảng) của đặc tả.
 * - RESTAURANT_ADMIN: Có toàn quyền trên tất cả 8 phân hệ chính.
 * - BRANCH_MANAGER: Có đủ 8 phân hệ chính NHƯNG mỗi trang chỉ thao tác trong PHẠM VI chi nhánh
 *   của mình và với phạm vi hẹp hơn Quản trị NH (theo bảng phân quyền theo màn hình):
 *     · Chi nhánh: đi thẳng vào chi tiết chi nhánh của mình (không có danh sách nhiều chi nhánh)
 *     · Cấu hình: chỉ xem/sửa cấu hình CHI NHÁNH (giờ giấc, TK ngân hàng, tự huỷ phiên — FR-BRN-02),
 *       KHÔNG có cấu hình nhà hàng (VAT/phí DV/ngưỡng chiết khấu/MST — chỉ Quản trị NH, mục 4.3)
 *     · Nhân viên: chỉ xem 2 tab (Nhân viên + Nhật ký) của chi nhánh mình, KHÔNG có
 *       "Vai trò & phân quyền" (chỉ Quản trị NH)
 *     · Báo cáo: có tab Theo ngày/Theo khung giờ, KHÔNG có tab "So sánh chi nhánh" (chỉ Quản trị NH)
 * - WAITER: Chỉ thao tác sơ đồ bàn và gọi món/chế biến.
 * - CASHIER: Chỉ xem sơ đồ bàn (để xem tạm tính) và thanh toán hóa đơn.
 */
export const ROLE_PERMISSIONS: Record<AppRole, PermissionKey[]> = {
  [APP_ROLE.RESTAURANT_ADMIN]: [
    "TABLE_MAP",
    "ORDER_AND_PREP",
    "MENU",
    "PROMOTIONS",
    "REPORTS",
    "BRANCHES",
    "STAFF",
    "CONFIG",
  ],
  [APP_ROLE.BRANCH_MANAGER]: [
    "TABLE_MAP",
    "ORDER_AND_PREP",
    "MENU",
    "PROMOTIONS",
    "REPORTS",
    "BRANCHES",
    "STAFF",
    "CONFIG",
  ],
  [APP_ROLE.WAITER]: [
    "TABLE_MAP",
    "ORDER_AND_PREP",
  ],
  [APP_ROLE.CASHIER]: [
    "TABLE_MAP",
  ],
  [APP_ROLE.PLATFORM_ADMIN]: [],
  [APP_ROLE.CUSTOMER]: [],
}

/**
 * Kiểm tra xem một vai trò có quyền truy cập vào phân hệ được yêu cầu hay không.
 */
export function hasPermission(
  role: AppRole | null | undefined,
  permission: PermissionKey
): boolean {
  if (!role) return false
  // Quản trị nhà hàng luôn có toàn quyền truy cập
  if (role === APP_ROLE.RESTAURANT_ADMIN) return true
  const permissions = ROLE_PERMISSIONS[role] || []
  return permissions.includes(permission)
}
