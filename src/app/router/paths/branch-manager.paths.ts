const BRANCH_MANAGER_BASE = "/quan-ly-chi-nhanh"

/**
 * URI cho Quản lý chi nhánh (mục 4.1: phạm vi Chi nhánh).
 * Nhóm "vận hành sàn/bếp" (TABLE_MAP..TRANSFER_MERGE_TABLE) dùng chung component với
 * Phục vụ / Quản trị NH ở @/features/shared/floor-ops — QL chi nhánh có quyền X
 * đầy đủ cho cả nhóm này (mục 4.2), không cần duyệt như Phục vụ.
 *
 * QL chi nhánh có đủ 8 phân hệ chính như Quản trị NH (Thực đơn, Khuyến mãi, Báo cáo,
 * Chi nhánh, Nhân viên, Cấu hình), nhưng mỗi trang chỉ ở PHẠM VI CHI NHÁNH của mình và
 * hẹp hơn Quản trị NH — xem chú thích trong config/permissions.ts:
 *  - "Chi nhánh" đi thẳng vào chi tiết chi nhánh mình (không có danh sách nhiều chi nhánh)
 *  - "Cấu hình" chỉ có cấu hình CHI NHÁNH (không có cấu hình nhà hàng/VAT/phí DV)
 *  - "Nhân viên" chỉ 2 tab (Nhân viên + Nhật ký), không có "Vai trò & phân quyền"
 *  - "Báo cáo" không có tab "So sánh chi nhánh"
 */
export const BRANCH_MANAGER_PATHS = {
  // Vận hành sàn/bếp (dùng chung — xem @/features/shared/floor-ops)
  TABLE_MAP: `${BRANCH_MANAGER_BASE}/so-do-ban`, // Sơ đồ bàn — trang chủ của QL chi nhánh
  OPEN_TABLE: `${BRANCH_MANAGER_BASE}/so-do-ban/:tableId/mo-ban`,
  ORDER_AND_PREP: `${BRANCH_MANAGER_BASE}/order-che-bien`,
  ORDER_CONFIRM: `${BRANCH_MANAGER_BASE}/order-che-bien/:orderId/xac-nhan`,
  ORDER_DETAIL: `${BRANCH_MANAGER_BASE}/order/:orderId`,
  ADD_DISH: `${BRANCH_MANAGER_BASE}/order/:orderId/them-mon`, // Thêm món vào bàn
  KITCHEN_DISPLAY: `${BRANCH_MANAGER_BASE}/bep`,
  TRANSFER_MERGE_TABLE: `${BRANCH_MANAGER_BASE}/chuyen-gop-ban`,

  // 8 phân hệ chính — phạm vi chi nhánh của mình
  MENU: `${BRANCH_MANAGER_BASE}/thuc-don`, // Thực đơn (đè giá/ẩn món/món riêng — dùng chung MenuManagementPage)
  PROMOTIONS: `${BRANCH_MANAGER_BASE}/khuyen-mai`, // Khuyến mãi
  PROMOTION_CREATE: `${BRANCH_MANAGER_BASE}/khuyen-mai/tao-moi`, // Tạo khuyến mãi
  REPORT: `${BRANCH_MANAGER_BASE}/bao-cao`, // Báo cáo chi nhánh mình (không có tab So sánh chi nhánh)
  REVENUE_BY_HOUR: `${BRANCH_MANAGER_BASE}/bao-cao/doanh-thu-theo-gio`, // tab "Theo khung giờ"
  BRANCH: `${BRANCH_MANAGER_BASE}/chi-nhanh`, // Chi nhánh — đi thẳng vào chi tiết (3 tab) của chi nhánh mình
  STAFF: `${BRANCH_MANAGER_BASE}/nhan-vien`, // Nhân viên — 2 tab (Nhân viên + Nhật ký), chỉ xem
  CONFIG: `${BRANCH_MANAGER_BASE}/cau-hinh`, // Cấu hình chi nhánh (giờ mở/đóng, TK ngân hàng, tự hủy phiên — FR-BRN-02)

  // Màn hình con / tương thích ngược
  BRANCH_CONFIG: `${BRANCH_MANAGER_BASE}/cau-hinh`, // Alias của CONFIG
  MANUAL_DISCOUNT: `${BRANCH_MANAGER_BASE}/chiet-khau-thu-cong`, // Chiết khấu tay
  AUDIT_LOG: `${BRANCH_MANAGER_BASE}/nhat-ky`, // Nhật ký hoạt động chi nhánh mình — chỉ đọc (R, FR-LOG-01), tab trong Nhân viên
} as const