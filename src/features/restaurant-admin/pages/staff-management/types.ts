/**
 * Kiểu dữ liệu màn Nhân viên.
 *
 * Dựng từ `AccountResponse` + `AssignmentResponse` của backend: MỘT dòng = MỘT tài khoản,
 * còn vai trò và chi nhánh là DANH SÁCH (một nhân viên có nhiều phân công — xem
 * `docs/reports/nhan-vien-buoc-0.md` mục 4). Bản trước khai `role: string` / `branch: string`
 * nên `waiter01` (2 chi nhánh) hiện sai và bộ lọc chi nhánh không thể đúng.
 */

import type { AccountStatus } from "@/types/enums"
import type { Assignment } from "@/types/models"

/** Một chip vai trò / chi nhánh trên dòng nhân viên. */
export interface StaffChip {
  key: string
  label: string
}

export interface StaffRow {
  /** accountId — khoá của DÒNG, vì một dòng là một tài khoản. */
  id: number
  fullName: string
  employeeCode: string
  username: string
  email?: string
  status: AccountStatus
  initials: string
  /** Vai trò đã gộp trùng: waiter01 có 2 phân công cùng vai trò ⇒ 1 chip. */
  roles: StaffChip[]
  /** Chi nhánh đã gộp trùng; vai trò cấp nhà hàng ⇒ chip "Toàn nhà hàng". */
  branches: StaffChip[]
  /** Để lọc: mọi chi nhánh mà tài khoản có phân công. */
  branchIds: number[]
  /** Để lọc: mọi vai trò của tài khoản. */
  roleIds: number[]
  /** Mã vai trò (`MANAGER`, `WAITER`...) — dùng cho chốt "Quản trị nhà hàng cuối cùng". */
  roleCodes: string[]
  /** Phân công gốc của tài khoản — modal Sửa cần id để gỡ đúng dòng. */
  assignments: Assignment[]
}

/**
 * Trạng thái dùng thẳng của backend (`AccountStatus`: ACTIVE / INACTIVE).
 * BE không có trạng thái thứ ba, nên UI không có "Tạm khoá" riêng.
 */
export type StaffStatusFilter = "ALL" | AccountStatus

/** Nhãn tiếng Việt cho trạng thái tài khoản. */
export const ACCOUNT_STATUS_LABEL: Record<AccountStatus, string> = {
  ACTIVE: "Đang hoạt động",
  INACTIVE: "Đã vô hiệu hoá",
}

export type StaffTabType = "staff" | "roles" | "audit-log"
