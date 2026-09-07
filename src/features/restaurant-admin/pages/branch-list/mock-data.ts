import type { BranchItem } from "./types"

/**
 * Dữ liệu mẫu 3 chi nhánh chuẩn theo file thiết kế:
 * "QuanLy/Quản lý chi nhánh.png"
 */
export const MOCK_BRANCHES: BranchItem[] = [
  {
    id: 1,
    name: "Chi nhánh Quận 1",
    status: "ACTIVE",
    address: "12 Nguyễn Huệ, P.Bến Nghé, Q.1",
    managerName: "Nguyễn Văn An",
    tableCount: 12,
    taxCode: "0312345678-001",
    openingHours: "08:00 – 22:00",
    phone: "028 3822 1234",
  },
  {
    id: 2,
    name: "Chi nhánh Quận 3",
    status: "ACTIVE",
    address: "45 Võ Văn Tần, P.6, Q.3",
    managerName: "Nguyễn Văn Long",
    tableCount: 16,
    taxCode: "0312345678-002",
    openingHours: "09:00 – 23:00",
    phone: "028 3930 5678",
  },
  {
    id: 3,
    name: "Chi nhánh Thủ Đức",
    status: "INACTIVE",
    address: "200 Võ Văn Ngân, TP.Thủ Đức",
    managerName: "Chưa phân công",
    tableCount: 8,
    taxCode: "(dùng MST nhà hàng)",
    openingHours: "10:00 – 22:00",
    phone: "028 3720 9999",
  },
]
