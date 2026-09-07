import type { CategoryItem, DishItem, BranchDishItem } from "./types"

/**
 * Danh sách 6 danh mục mẫu
 * Nguồn: QuanLy/Quản lý danh mục.png
 */
export const MOCK_CATEGORIES: CategoryItem[] = [
  {
    id: 1,
    order: 1,
    name: "Khai vị",
    description: "Món ăn nhẹ đầu bữa",
    dishCount: 5,
    isActive: true,
  },
  {
    id: 2,
    order: 2,
    name: "Món chính",
    description: "Món ăn chính",
    dishCount: 12,
    isActive: true,
  },
  {
    id: 3,
    order: 3,
    name: "Lẩu",
    description: "Các loại lẩu",
    dishCount: 4,
    isActive: true,
  },
  {
    id: 4,
    order: 4,
    name: "Đồ uống",
    description: "Nước giải khát",
    dishCount: 8,
    isActive: true,
  },
  {
    id: 5,
    order: 5,
    name: "Tráng miệng",
    description: "Món ngọt cuối bữa",
    dishCount: 3,
    isActive: true,
  },
  {
    id: 6,
    order: 6,
    name: "Combo",
    description: "Set combo ưu đãi",
    dishCount: 2,
    isActive: false,
  },
]

/**
 * Danh sách món ăn trong thực đơn gốc
 * Nguồn: QuanLy/Quản lý thực đơn.png
 */
export const MOCK_DISHES: DishItem[] = [
  {
    id: 1,
    name: "Phở bò tái nạm",
    description: "Nước dùng ninh 12 tiếng",
    category: "Món chính",
    price: 65000,
    isAvailable: true,
  },
  {
    id: 2,
    name: "Gỏi cuốn tôm thịt",
    description: "2 cuốn, nước chấm đặc biệt",
    category: "Khai vị",
    price: 45000,
    isAvailable: true,
  },
  {
    id: 3,
    name: "Bún chả Hà Nội",
    description: "Chả nướng than hoa",
    category: "Món chính",
    price: 70000,
    isAvailable: true,
  },
  {
    id: 4,
    name: "Lẩu thái hải sản",
    description: "Nồi 2-3 người",
    category: "Lẩu",
    price: 250000,
    isAvailable: false,
  },
  {
    id: 5,
    name: "Trà tắc",
    description: "Giải khát mát lạnh",
    category: "Đồ uống",
    price: 30000,
    isAvailable: true,
  },
  {
    id: 6,
    name: "Cơm tấm sườn bì",
    description: "Sườn nướng, bì, chả",
    category: "Món chính",
    price: 75000,
    isAvailable: true,
  },
]

/**
 * Danh sách món theo từng chi nhánh (mặc định Chi nhánh Quận 1)
 * Nguồn: QuanLy/Menu chi nhánh.png
 */
export const MOCK_BRANCH_DISHES: BranchDishItem[] = [
  {
    id: 1,
    name: "Phở bò tái nạm",
    category: "Món chính",
    originalPrice: 65000,
    branchPrice: 65000,
    diffText: "—",
    isAvailable: true,
  },
  {
    id: 2,
    name: "Gỏi cuốn tôm thịt",
    category: "Khai vị",
    originalPrice: 45000,
    branchPrice: 40000,
    diffText: "-5.000đ",
    isAvailable: true,
  },
  {
    id: 3,
    name: "Bún chả Hà Nội",
    category: "Món chính",
    originalPrice: 70000,
    branchPrice: 75000,
    diffText: "+5.000đ",
    isAvailable: true,
  },
  {
    id: 4,
    name: "Lẩu thái hải sản",
    category: "Lẩu",
    originalPrice: 250000,
    branchPrice: null,
    diffText: "ẩn tại CN này",
    isAvailable: false,
  },
  {
    id: 5,
    name: "Cà phê sữa đá",
    category: "Đồ uống",
    originalPrice: null,
    branchPrice: 25000,
    diffText: "món riêng",
    isAvailable: true,
    isCustom: true,
  },
  {
    id: 6,
    name: "Trà tắc",
    category: "Đồ uống",
    originalPrice: 30000,
    branchPrice: 30000,
    diffText: "—",
    isAvailable: true,
  },
]

/**
 * Danh sách chi nhánh phục vụ chọn ở dropdown
 */
export const MOCK_BRANCH_OPTIONS = [
  "Chi nhánh Quận 1",
  "Chi nhánh Quận 3",
  "Chi nhánh Thủ Đức",
]
