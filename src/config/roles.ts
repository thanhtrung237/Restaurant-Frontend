/**
 * 6 vai trò nghiệp vụ của hệ thống (mục 4.1 đặc tả).
 * Khác với RoleScope.java (PLATFORM/RESTAURANT/BRANCH — phạm vi lưu ở DB),
 * APP_ROLE dưới đây là "vai trò ứng dụng" dùng để:
 *  - chọn Layout tương ứng (CustomerLayout / StaffLayout / PlatformLayout)
 *  - chọn nhóm route (RoleGuard)
 *  - map với Role.code trả về từ Assignment của tài khoản đăng nhập
 */
export const APP_ROLE = {
  CUSTOMER: "CUSTOMER", // Khách hàng — không đăng nhập, dùng token phiên
  WAITER: "WAITER", // Phục vụ
  CASHIER: "CASHIER", // Thu ngân
  BRANCH_MANAGER: "BRANCH_MANAGER", // Quản lý chi nhánh
  RESTAURANT_ADMIN: "RESTAURANT_ADMIN", // Quản trị nhà hàng
  PLATFORM_ADMIN: "PLATFORM_ADMIN", // Quản trị nền tảng
} as const

export type AppRole = (typeof APP_ROLE)[keyof typeof APP_ROLE]

/** Vai trò cần đăng nhập bằng tài khoản nhân viên (Account + Assignment + Role) */
export const STAFF_ROLES: AppRole[] = [
  APP_ROLE.WAITER,
  APP_ROLE.CASHIER,
  APP_ROLE.BRANCH_MANAGER,
  APP_ROLE.RESTAURANT_ADMIN,
  APP_ROLE.PLATFORM_ADMIN,
]

export const APP_ROLE_LABEL: Record<AppRole, string> = {
  CUSTOMER: "Khách hàng",
  WAITER: "Phục vụ",
  CASHIER: "Thu ngân",
  BRANCH_MANAGER: "Quản lý chi nhánh",
  RESTAURANT_ADMIN: "Quản trị nhà hàng",
  PLATFORM_ADMIN: "Quản trị nền tảng",
}

console.log('APP_ROLE:', APP_ROLE)
console.log('STAFF_ROLES:', STAFF_ROLES)

const STAFF_ROLE_SET = new Set<string>(STAFF_ROLES)
console.log('STAFF_ROLE_SET initialized:', STAFF_ROLE_SET)

/**
 * Map Role.code từ backend sang AppRole cho frontend.
 * 
 * Backend role codes (từ data.sql):
 * - MANAGER → RESTAURANT_ADMIN (Quản lý nhà hàng)
 * - BRANCH_MANAGER → BRANCH_MANAGER (Quản lý chi nhánh)
 * - WAITER → WAITER (Nhân viên phục vụ)
 * - CASHIER → CASHIER (Thu ngân)
 * 
 * Hàm này xử lý cả mapping trực tiếp và các alias.
 */
export function mapRoleCodeToAppRole(code?: string | null): AppRole | null {
  console.log('mapRoleCodeToAppRole input:', code)
  if (!code) return null
  
  const normalized = code.trim().toUpperCase().replace(/[\s-]+/g, "_")
  console.log('Normalized code:', normalized)
  
  // Bảng mapping: Backend code → Frontend APP_ROLE
  const roleMapping: Record<string, AppRole> = {
    'MANAGER': APP_ROLE.RESTAURANT_ADMIN,  // Backend dùng MANAGER
    'RESTAURANT_ADMIN': APP_ROLE.RESTAURANT_ADMIN,
    'BRANCH_MANAGER': APP_ROLE.BRANCH_MANAGER,
    'WAITER': APP_ROLE.WAITER,
    'CASHIER': APP_ROLE.CASHIER,
    'PLATFORM_ADMIN': APP_ROLE.PLATFORM_ADMIN,
  }
  
  const mappedRole = roleMapping[normalized]
  console.log('Mapped role:', mappedRole)
  console.log('Is valid staff role:', mappedRole && STAFF_ROLE_SET.has(mappedRole))
  
  return mappedRole || null
}
