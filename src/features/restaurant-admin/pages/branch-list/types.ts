import type { BranchStatus } from "@/types/enums"

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
