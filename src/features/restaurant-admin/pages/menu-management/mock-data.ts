import type { BranchDishItem } from "./types"

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
