import type { BranchDetail, BranchMenuItem, BranchTableItem, BranchConfigData } from "./types"

/**
 * Dữ liệu chi tiết các chi nhánh
 */
export const MOCK_BRANCH_DETAILS: Record<number, BranchDetail> = {
  1: {
    id: 1,
    name: "Chi nhánh Quận 1",
    status: "ACTIVE",
    address: "12 Nguyễn Huệ, P.Bến Nghé, Q.1",
    managerName: "Nguyễn Văn An",
    phone: "02873001234",
    taxCode: "0312123332132-01",
    openingHours: "10:00 – 22:00",
    tableCount: 12,
    staffCount: 8,
    startDate: "01/03/2025",
  },
  2: {
    id: 2,
    name: "Chi nhánh Quận 3",
    status: "ACTIVE",
    address: "45 Võ Văn Tần, P.6, Q.3",
    managerName: "Nguyễn Văn Long",
    phone: "02839305678",
    taxCode: "0312345678-002",
    openingHours: "09:00 – 23:00",
    tableCount: 16,
    staffCount: 10,
    startDate: "15/05/2025",
  },
  3: {
    id: 3,
    name: "Chi nhánh Thủ Đức",
    status: "INACTIVE",
    address: "200 Võ Văn Ngân, TP.Thủ Đức",
    managerName: "Chưa phân công",
    phone: "02837209999",
    taxCode: "(dùng MST nhà hàng)",
    openingHours: "10:00 – 22:00",
    tableCount: 8,
    staffCount: 4,
    startDate: "20/08/2025",
  },
}

/**
 * Danh sách món trong menu chi nhánh Quận 1
 * Nguồn: Chi tiết chi nhánh - Menu chi nhánh.png
 */
export const MOCK_BRANCH_MENU_ITEMS: BranchMenuItem[] = [
  {
    id: 1,
    name: "Phở bò tái nạm",
    category: "Món chính",
    originalPrice: 65000,
    branchPrice: 65000,
    diffText: "—",
    status: "ORIGINAL_PRICE",
  },
  {
    id: 2,
    name: "Gỏi cuốn tôm thịt",
    category: "Khai vị",
    originalPrice: 45000,
    branchPrice: 40000,
    diffText: "-5.000đ",
    status: "OVERRIDDEN_PRICE",
  },
  {
    id: 3,
    name: "Bún chả Hà Nội",
    category: "Món chính",
    originalPrice: 70000,
    branchPrice: 75000,
    diffText: "+5.000đ",
    status: "OVERRIDDEN_PRICE",
  },
  {
    id: 4,
    name: "Lẩu thái hải sản",
    category: "Lẩu",
    originalPrice: 250000,
    branchPrice: null,
    diffText: "ẩn tại CN này",
    status: "HIDDEN",
  },
  {
    id: 5,
    name: "Cà phê sữa đá",
    category: "Đồ uống",
    originalPrice: null,
    branchPrice: 25000,
    diffText: "món riêng",
    status: "CUSTOM",
  },
  {
    id: 6,
    name: "Trà tắc",
    category: "Đồ uống",
    originalPrice: 30000,
    branchPrice: 30000,
    diffText: "—",
    status: "ORIGINAL_PRICE",
  },
]

/**
 * Danh sách bàn thuộc chi nhánh Quận 1
 * Nguồn: Quản lý bàn & QR.png
 */
export const MOCK_BRANCH_TABLES: BranchTableItem[] = [
  { id: 1, name: "B01", capacity: 4, area: "Tầng 1", status: "AVAILABLE" },
  { id: 2, name: "B02", capacity: 2, area: "Tầng 1", status: "AVAILABLE" },
  { id: 3, name: "B03", capacity: 4, area: "Tầng 1", status: "INACTIVE" },
  { id: 4, name: "B04", capacity: 6, area: "Tầng 1", status: "AVAILABLE" },
  { id: 5, name: "B05", capacity: 4, area: "Tầng 2", status: "AVAILABLE" },
  { id: 6, name: "B06", capacity: 8, area: "Tầng 2", status: "INACTIVE" },
  { id: 7, name: "B07", capacity: 2, area: "Sân vườn", status: "AVAILABLE" },
  { id: 8, name: "B08", capacity: 4, area: "Sân vườn", status: "AVAILABLE" },
]

/**
 * Cấu hình vận hành mặc định theo chi nhánh (trang Cấu hình — FR-BRN-02)
 */
export const MOCK_BRANCH_CONFIGS: Record<number, BranchConfigData> = {
  1: {
    hotline: "1900 6868",
    address: "12 Nguyễn Huệ, Quận 1, TP.HCM",
    openingHours: "08:00 – 22:00",
    autoCancelWaitingMinutes: 10,
    reservationHoldingMinutes: 15,
  },
  2: {
    hotline: "1900 6869",
    address: "45 Võ Văn Tần, Quận 3, TP.HCM",
    openingHours: "09:00 – 23:00",
    autoCancelWaitingMinutes: 10,
    reservationHoldingMinutes: 15,
  },
  3: {
    hotline: "1900 6870",
    address: "200 Võ Văn Ngân, TP.Thủ Đức",
    openingHours: "10:00 – 22:00",
    autoCancelWaitingMinutes: 10,
    reservationHoldingMinutes: 15,
  },
}
