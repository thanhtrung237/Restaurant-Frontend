const PLATFORM_ADMIN_BASE = "/quan-tri-nen-tang"

export const PLATFORM_ADMIN_PATHS = {
  DASHBOARD: PLATFORM_ADMIN_BASE, // Dashboard tổng quan nền tảng
  RESTAURANT_LIST: `${PLATFORM_ADMIN_BASE}/nha-hang`, // Danh sách nhà hàng đang dùng nền tảng
  RESTAURANT_DETAIL: `${PLATFORM_ADMIN_BASE}/nha-hang/:restaurantId`, // Chi tiết nhà hàng
  PLATFORM_CONFIG: `${PLATFORM_ADMIN_BASE}/cau-hinh`, // Cấu hình nền tảng
  SYSTEM_AUDIT_LOG: `${PLATFORM_ADMIN_BASE}/nhat-ky-he-thong`, // Nhật ký hệ thống
} as const
