import type {
  RestaurantInfoConfig,
  TaxAndFeeConfig,
  StaffRoleSummary,
} from "./types"

/**
 * Dữ liệu mẫu Thông tin doanh nghiệp
 * Nguồn: QuanLy/Cấu hình.png
 */
export const MOCK_RESTAURANT_INFO: RestaurantInfoConfig = {
  restaurantName: "Nhà hàng Phở Việt",
  taxCode: "0312345678",
  logoText: "P",
  logoSubtext: "PNG nền trong suốt",
}

/**
 * Dữ liệu mẫu Thuế & phí
 * Nguồn: QuanLy/Cấu hình.png
 */
export const MOCK_TAX_AND_FEE: TaxAndFeeConfig = {
  vatPercent: "8",
  serviceFeePercent: "5",
  applyVatOnServiceFee: true,
}

/**
 * Danh sách 5 vai trò nhân viên và số lượng nhân sự
 * Nguồn: QuanLy/Cấu hình.png
 */
export const MOCK_STAFF_ROLES: StaffRoleSummary[] = [
  {
    id: "1",
    roleKey: "platformAdmin",
    name: "Quản trị nền tảng",
    userCount: 1,
  },
  {
    id: "2",
    roleKey: "restaurantAdmin",
    name: "Chủ nhà hàng",
    userCount: 1,
  },
  {
    id: "3",
    roleKey: "branchManager",
    name: "Quản lý chi nhánh",
    userCount: 3,
  },
  {
    id: "4",
    roleKey: "cashier",
    name: "Thu ngân",
    userCount: 4,
  },
  {
    id: "5",
    roleKey: "waiter",
    name: "Nhân viên phục vụ",
    userCount: 8,
  },
]
