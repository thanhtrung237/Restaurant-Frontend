/**
 * Kiểu dữ liệu cho màn hình Cấu hình (restaurant-admin)
 * CHỈ cấp NHÀ HÀNG — cấu hình riêng của 1 chi nhánh (giờ giấc/TK ngân hàng/tự huỷ phiên)
 * nằm ở @/features/shared/branch-detail (trang "Cấu hình chi nhánh" riêng biệt).
 * Nguồn: QuanLy/Cấu hình.png
 */

export interface RestaurantInfoConfig {
  restaurantName: string
  taxCode: string
  logoText?: string
  logoSubtext?: string
}

export interface TaxAndFeeConfig {
  vatPercent: string
  serviceFeePercent: string
  applyVatOnServiceFee: boolean
}

export interface StaffRoleSummary {
  id: string
  roleKey: string
  name: string
  userCount: number
}
