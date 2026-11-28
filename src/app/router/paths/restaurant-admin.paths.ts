const RESTAURANT_ADMIN_BASE = "/restaurant-admin"

export const RESTAURANT_ADMIN_PATHS = {
  // 8 phân hệ chính trên Sidebar Figma
  // Vận hành sàn/bếp — dùng chung component với Phục vụ/QL chi nhánh (@/features/shared/floor-ops)
  /**
   * Man Thanh toan cua phien ban.
   *
   * Bang 4.2: "Thu tien, dong ban" - Thu ngan X, QL chi nhanh X, Quan tri NH X.
   * Truoc day route nay CHI nam duoi /cashier (RequireRole chi cho CASHIER), nen
   * nut "Dong ban" o man Don mon cua QLCN/QTNH khong co cho de di toi.
   */
  CHECKOUT: `${RESTAURANT_ADMIN_BASE}/checkout/:tableSessionId`,
  QR_TRANSFER_PAYMENT: `${RESTAURANT_ADMIN_BASE}/checkout/:tableSessionId/qr-transfer`,
  E_INVOICE: `${RESTAURANT_ADMIN_BASE}/invoices/:invoiceId`,
  INVOICES: `${RESTAURANT_ADMIN_BASE}/invoices`,
  INVOICE_DETAILS: `${RESTAURANT_ADMIN_BASE}/invoices/lookup/:invoiceId`,
  TABLE_MAP: `${RESTAURANT_ADMIN_BASE}/table-map`, // Sơ đồ bàn
  ORDER_AND_PREP: `${RESTAURANT_ADMIN_BASE}/orders-and-prep`, // Gọi món & Chế biến
  // ORDER_CONFIRM removed: kitchen staff now confirms items directly in KDS (PENDING → PREPARING)
  ORDER_DETAIL: `${RESTAURANT_ADMIN_BASE}/order/:orderId`,
  ADD_DISH: `${RESTAURANT_ADMIN_BASE}/order/:orderId/add-items`, // Thêm món vào bàn
  KITCHEN_DISPLAY: `${RESTAURANT_ADMIN_BASE}/kitchen`,
  TRANSFER_MERGE_TABLE: `${RESTAURANT_ADMIN_BASE}/transfer-merge-tables`,
  MENU: `${RESTAURANT_ADMIN_BASE}/menu`, // Thực đơn
  PROMOTIONS: `${RESTAURANT_ADMIN_BASE}/promotions`, // Khuyến mãi
  REPORTS: `${RESTAURANT_ADMIN_BASE}/reports`, // Báo cáo (theo ngày / theo giờ / so sánh chi nhánh)
  BRANCH: `${RESTAURANT_ADMIN_BASE}/branches`, // Chi nhánh — danh sách dạng card, bấm vào 1 card để xem chi tiết
  STAFF: `${RESTAURANT_ADMIN_BASE}/staff`, // Nhân viên (3 tab: Nhân viên / Vai trò & phân quyền / Nhật ký)
  CONFIG: `${RESTAURANT_ADMIN_BASE}/settings`, // Cấu hình — CHỈ cấp NHÀ HÀNG (VAT/phí DV/ngưỡng chiết khấu/MST)

  // Màn hình con
  STAFF_MANAGEMENT: `${RESTAURANT_ADMIN_BASE}/staff`, // Alias tương thích ngược của STAFF
  ROLES_PERMISSIONS: `${RESTAURANT_ADMIN_BASE}/roles-permissions`, // Vai trò & phân quyền (tab trong Nhân viên)
  AUDIT_LOG: `${RESTAURANT_ADMIN_BASE}/audit-log`, // Nhật ký hoạt động (tab trong Nhân viên)
  BRANCH_DETAIL: `${RESTAURANT_ADMIN_BASE}/branches/:branchId`, // chi tiết 1 chi nhánh (3 tab)
  BRANCH_CONFIG: `${RESTAURANT_ADMIN_BASE}/branches/:branchId/settings`, // FR-BRN-02 nhóm 1
  BRANCH_TAX_FEE: `${RESTAURANT_ADMIN_BASE}/branches/:branchId/taxes-fees`, // FR-BRN-02 nhóm 2 — chỉ QTNH
  OUT_OF_STOCK: `${RESTAURANT_ADMIN_BASE}/branches/:branchId/out-of-stock`, // Món đang hết hàng (GĐ2)
  CATEGORY_MANAGEMENT: `${RESTAURANT_ADMIN_BASE}/categories`, // Quản lý danh mục (redirect vào tab "Danh mục" của Thực đơn)
  PROMOTION_CREATE: `${RESTAURANT_ADMIN_BASE}/promotions/new`, // Tạo khuyến mãi
  PROMOTION_EDIT: `${RESTAURANT_ADMIN_BASE}/promotions/:id/edit`, // Chỉnh sửa khuyến mãi
} as const
