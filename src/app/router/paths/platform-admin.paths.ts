const PLATFORM_ADMIN_BASE = "/platform-admin"

export const PLATFORM_ADMIN_PATHS = {
  DASHBOARD: PLATFORM_ADMIN_BASE, // Dashboard tổng quan nền tảng
  RESTAURANT_LIST: `${PLATFORM_ADMIN_BASE}/restaurants`, // Danh sách nhà hàng đang dùng nền tảng
  RESTAURANT_DETAIL: `${PLATFORM_ADMIN_BASE}/restaurants/:restaurantId`, // Chi tiết nhà hàng
  SYSTEM_AUDIT_LOG: `${PLATFORM_ADMIN_BASE}/system-audit-log`, // Nhật ký hệ thống
} as const
