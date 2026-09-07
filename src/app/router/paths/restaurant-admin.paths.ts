const RESTAURANT_ADMIN_BASE = "/quan-tri-nha-hang"

export const RESTAURANT_ADMIN_PATHS = {
  // 8 phân hệ chính trên Sidebar Figma
  // Vận hành sàn/bếp — dùng chung component với Phục vụ/QL chi nhánh (@/features/shared/floor-ops)
  TABLE_MAP: `${RESTAURANT_ADMIN_BASE}/so-do-ban`, // Sơ đồ bàn
  OPEN_TABLE: `${RESTAURANT_ADMIN_BASE}/so-do-ban/:tableId/mo-ban`,
  ORDER_AND_PREP: `${RESTAURANT_ADMIN_BASE}/order-che-bien`, // Gọi món & Chế biến
  ORDER_CONFIRM: `${RESTAURANT_ADMIN_BASE}/order-che-bien/:orderId/xac-nhan`,
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
  CATEGORY_MANAGEMENT: `${RESTAURANT_ADMIN_BASE}/danh-muc`, // Quản lý danh mục (redirect vào tab "Danh mục" của Thực đơn)
  PROMOTION_CREATE: `${RESTAURANT_ADMIN_BASE}/khuyen-mai/tao-moi`, // Tạo khuyến mãi
} as const