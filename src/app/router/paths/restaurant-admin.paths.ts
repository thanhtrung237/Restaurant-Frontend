const RESTAURANT_ADMIN_BASE = "/quan-tri-nha-hang"

export const RESTAURANT_ADMIN_PATHS = {
  // 8 phân hệ chính trên Sidebar Figma
  // Vận hành sàn/bếp — dùng chung component với Phục vụ/QL chi nhánh (@/features/shared/floor-ops)
  /**
   * Man Thanh toan cua phien ban.
   *
   * Bang 4.2: "Thu tien, dong ban" - Thu ngan X, QL chi nhanh X, Quan tri NH X.
   * Truoc day route nay CHI nam duoi /thu-ngan (RequireRole chi cho CASHIER), nen
   * nut "Dong ban" o man Don mon cua QLCN/QTNH khong co cho de di toi.
   */
  CHECKOUT: `${RESTAURANT_ADMIN_BASE}/thanh-toan/:tableSessionId`,
  QR_TRANSFER_PAYMENT: `${RESTAURANT_ADMIN_BASE}/thanh-toan/:tableSessionId/chuyen-khoan-qr`,
  E_INVOICE: `${RESTAURANT_ADMIN_BASE}/hoa-don/:invoiceId`,
  TABLE_MAP: `${RESTAURANT_ADMIN_BASE}/so-do-ban`, // Sơ đồ bàn
  ORDER_AND_PREP: `${RESTAURANT_ADMIN_BASE}/order-che-bien`, // Gọi món & Chế biến
  // ORDER_CONFIRM removed: kitchen staff now confirms items directly in KDS (PENDING → PREPARING)
  ORDER_DETAIL: `${RESTAURANT_ADMIN_BASE}/order/:orderId`,
  ADD_DISH: `${RESTAURANT_ADMIN_BASE}/order/:orderId/them-mon`, // Thêm món vào bàn
  KITCHEN_DISPLAY: `${RESTAURANT_ADMIN_BASE}/bep`,
  TRANSFER_MERGE_TABLE: `${RESTAURANT_ADMIN_BASE}/chuyen-gop-ban`,
  MENU: `${RESTAURANT_ADMIN_BASE}/thuc-don`, // Thực đơn
  PROMOTIONS: `${RESTAURANT_ADMIN_BASE}/khuyen-mai`, // Khuyến mãi
  REPORTS: `${RESTAURANT_ADMIN_BASE}/bao-cao`, // Báo cáo (theo ngày / theo giờ / so sánh chi nhánh)
  BRANCH: `${RESTAURANT_ADMIN_BASE}/chi-nhanh`, // Chi nhánh — danh sách dạng card, bấm vào 1 card để xem chi tiết
  STAFF: `${RESTAURANT_ADMIN_BASE}/nhan-vien`, // Nhân viên (3 tab: Nhân viên / Vai trò & phân quyền / Nhật ký)
  CONFIG: `${RESTAURANT_ADMIN_BASE}/cau-hinh`, // Cấu hình — CHỈ cấp NHÀ HÀNG (VAT/phí DV/ngưỡng chiết khấu/MST)

  // Màn hình con
  STAFF_MANAGEMENT: `${RESTAURANT_ADMIN_BASE}/nhan-vien`, // Alias tương thích ngược của STAFF
  ROLES_PERMISSIONS: `${RESTAURANT_ADMIN_BASE}/vai-tro-phan-quyen`, // Vai trò & phân quyền (tab trong Nhân viên)
  AUDIT_LOG: `${RESTAURANT_ADMIN_BASE}/nhat-ky`, // Nhật ký hoạt động (tab trong Nhân viên)
  BRANCH_DETAIL: `${RESTAURANT_ADMIN_BASE}/chi-nhanh/:branchId`, // chi tiết 1 chi nhánh (3 tab)
  BRANCH_CONFIG: `${RESTAURANT_ADMIN_BASE}/chi-nhanh/:branchId/cau-hinh`, // FR-BRN-02 nhóm 1
  BRANCH_TAX_FEE: `${RESTAURANT_ADMIN_BASE}/chi-nhanh/:branchId/thue-phi`, // FR-BRN-02 nhóm 2 — chỉ QTNH
  OUT_OF_STOCK: `${RESTAURANT_ADMIN_BASE}/chi-nhanh/:branchId/het-hang`, // Món đang hết hàng (GĐ2)
  CATEGORY_MANAGEMENT: `${RESTAURANT_ADMIN_BASE}/danh-muc`, // Quản lý danh mục (redirect vào tab "Danh mục" của Thực đơn)
  PROMOTION_CREATE: `${RESTAURANT_ADMIN_BASE}/khuyen-mai/tao-moi`, // Tạo khuyến mãi
  PROMOTION_EDIT: `${RESTAURANT_ADMIN_BASE}/khuyen-mai/:id/chinh-sua`, // Chỉnh sửa khuyến mãi
} as const