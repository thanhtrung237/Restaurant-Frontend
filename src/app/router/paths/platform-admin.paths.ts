const PLATFORM_ADMIN_BASE = "/quan-tri-nen-tang"

export const PLATFORM_ADMIN_PATHS = {
  RESTAURANT_LIST: `${PLATFORM_ADMIN_BASE}/nha-hang`, // Danh sách nhà hàng đang dùng nền tảng
  RESTAURANT_DETAIL: `${PLATFORM_ADMIN_BASE}/nha-hang/:restaurantId`, // Chi tiết nhà hàng (không xem doanh thu)
  PLATFORM_CONFIG: `${PLATFORM_ADMIN_BASE}/cau-hinh`, // Cấu hình nền tảng
  SYSTEM_AUDIT_LOG: `${PLATFORM_ADMIN_BASE}/nhat-ky-he-thong`, // Nhat ký hệ thống (khác audit log nhà hàng)
  SUBSCRIPTION: `${PLATFORM_ADMIN_BASE}/goi`, // Goi 
  BILLING: `${PLATFORM_ADMIN_BASE}/thanh-toan`, //Thanh toan
} as const
