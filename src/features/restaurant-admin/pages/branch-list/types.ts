import type { BranchStatus } from "@/types/enums"
import type { BranchCopyConfigRequest } from "@/types/requests"

/**
 * Kiểu dữ liệu cho Chi nhánh trong module Quản trị nhà hàng (restaurant-admin)
 * Tương thích trực tiếp với BranchResponse & Branch.java từ backend
 */
export interface BranchItem {
  id: number
  name: string
  status: BranchStatus
  address: string
  managerName?: string
  tableCount: number
  taxCode: string
  openingHours: string
  phone?: string
}

export type BranchFormData = Omit<BranchItem, "id">

/** Kết quả từ submit modal — chỉ có lỗi khi trùng mã (409). */
export interface BranchSaveResult {
  codeError?: string
}

/** Dữ liệu gửi từ modal tạo/sửa chi nhánh. */
export interface BranchSubmitData {
  code: string
  name: string
  address?: string
  phone?: string
  vatRate?: number
  serviceFeeRate?: number
  copy?: BranchCopyConfigRequest | null
}

/** Bộ lọc trạng thái chi nhánh. */
export type BranchStatusFilter = "ALL" | BranchStatus

export const BRANCH_FILTER_OPTIONS = [
  { id: "ALL" as const, label: "Tất cả" },
  { id: "ACTIVE" as const, label: "Đang hoạt động" },
  { id: "INACTIVE" as const, label: "Ngừng hoạt động" },
]
