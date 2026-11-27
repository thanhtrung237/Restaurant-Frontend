import type { Account, Assignment } from "@/types/models"
import type { StaffRow } from "./types"

/**
 * Vai trò cấp nhà hàng / nền tảng không gắn chi nhánh (Bảng thuật ngữ của đặc tả).
 *
 * Seed vẫn gán `branch_id` cho phân công `MANAGER` (scope RESTAURANT) — chính API
 * `POST /assignments` của backend lại từ chối bộ dữ liệu đó (xem
 * `docs/reports/nhan-vien-buoc-0.md` mục 4). Đã chốt: bỏ qua `branchId` khi scope là
 * RESTAURANT / PLATFORM và hiện nhãn này.
 */
export const WHOLE_RESTAURANT_LABEL = "Toàn nhà hàng"

/** Hai chữ đầu để làm avatar chữ. */
export function initialsOf(fullName: string): string {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return "?"
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  const first = words[0][0]
  const last = words[words.length - 1][0]
  return `${first}${last}`.toUpperCase()
}

function isRestaurantScope(assignment: Assignment): boolean {
  return assignment.roleScope === "RESTAURANT" || assignment.roleScope === "PLATFORM"
}

/** `AccountResponse` → một dòng của bảng Nhân viên. */
export function toStaffRow(account: Account): StaffRow {
  const assignments = account.assignments ?? []

  const roles = new Map<string, string>()
  const branches = new Map<string, string>()
  const branchIds = new Set<number>()
  const roleIds = new Set<number>()
  const roleCodes = new Set<string>()

  for (const assignment of assignments) {
    const roleLabel = assignment.roleName ?? assignment.roleCode ?? `Vai trò #${assignment.roleId}`
    roles.set(String(assignment.roleId), roleLabel)
    roleIds.add(assignment.roleId)
    if (assignment.roleCode) roleCodes.add(assignment.roleCode)

    if (isRestaurantScope(assignment)) {
      branches.set(WHOLE_RESTAURANT_LABEL, WHOLE_RESTAURANT_LABEL)
      continue
    }
    if (typeof assignment.branchId === "number") {
      branchIds.add(assignment.branchId)
      branches.set(
        String(assignment.branchId),
        assignment.branchName ?? `Chi nhánh #${assignment.branchId}`,
      )
    }
  }

  return {
    id: account.id,
    fullName: account.fullName,
    employeeCode: account.employeeCode,
    username: account.username,
    phone: account.phone,
    hireDate: account.hireDate,
    status: account.status,
    initials: initialsOf(account.fullName),
    roles: [...roles].map(([key, label]) => ({ key, label })),
    branches: [...branches].map(([key, label]) => ({ key, label })),
    branchIds: [...branchIds],
    roleIds: [...roleIds],
    roleCodes: [...roleCodes],
    assignments,
  }
}

/** Tìm theo họ tên / mã nhân viên / tên đăng nhập — không phân biệt hoa thường. */
export function matchesStaffSearch(row: StaffRow, searchTerm: string): boolean {
  const query = searchTerm.toLowerCase().trim()
  if (!query) return true
  return (
    row.fullName.toLowerCase().includes(query) ||
    row.employeeCode.toLowerCase().includes(query) ||
    row.username.toLowerCase().includes(query) ||
    Boolean(row.phone?.includes(query))
  )
}

/** Số vai trò KHÁC NHAU đang được dùng trong danh sách — cho dòng phụ "N tài khoản · M vai trò". */
export function countDistinctRoles(rows: StaffRow[]): number {
  const ids = new Set<number>()
  for (const row of rows) {
    for (const id of row.roleIds) ids.add(id)
  }
  return ids.size
}
