import { matchPath } from "react-router-dom"
import { APP_ROLE, type AppRole } from "@/config/roles"
import {
  getNavGroupsForRole,
  type NavItem,
  type NavSurface,
} from "@/config/nav-items"

/**
 * Tiện ích suy ra menu cho MỌI biến thể điều hướng của khu vực nhân viên
 * (Sidebar, SidebarRail, NavDrawer, BottomNav).
 *
 * Nguyên tắc: `getNavGroupsForRole(role)` là NGUỒN DUY NHẤT. Các component điều hướng
 * không được tự khai báo danh sách mục — trước đây SidebarRail và NavDrawer mỗi bên giữ
 * một mảng hard-code riêng, nên vai trò nào cũng thấy đủ 8–9 mục kể cả khi không có quyền.
 */

/** Gộp mọi nhóm thành một danh sách phẳng, giữ nguyên thứ tự khai báo. */
export function flattenNavItems(
  role: AppRole,
  surface: NavSurface = "mobile",
): NavItem[] {
  return getNavGroupsForRole(role, surface).flatMap((group) => group.items)
}

/**
 * Mục đang active theo đường dẫn hiện tại.
 * So khớp theo tiền tố (`end: false`) để màn con — ví dụ `/order/:orderId` — vẫn nhận
 * đúng mục cha là "Gọi món & Chế biến". Ưu tiên path dài nhất để tránh mục có path ngắn
 * (thường là trang chủ của vai trò) nuốt hết các mục khác.
 */
export function findActiveNavItem(
  role: AppRole,
  pathname: string,
  surface: NavSurface = "mobile",
): NavItem | undefined {
  const matched = flattenNavItems(role, surface).filter((item) =>
    Boolean(matchPath({ path: item.path, end: false }, pathname)),
  )
  if (matched.length === 0) return undefined
  return matched.reduce((longest, item) =>
    item.path.length > longest.path.length ? item : longest,
  )
}

/**
 * true nếu mục menu này phải sáng với đường dẫn hiện tại — tính cả `activeAlsoOn`.
 * Khớp theo tiền tố để màn con (`/order/:id`) vẫn sáng đúng mục cha.
 */
export function isNavItemActive(item: NavItem, pathname: string): boolean {
  const paths = [item.path, ...(item.activeAlsoOn ?? [])]
  return paths.some((path) => Boolean(matchPath({ path, end: false }, pathname)))
}

/** Khoá đặc biệt của mục "Thêm" trên BottomNav — mở NavDrawer, không điều hướng. */
export const BOTTOM_NAV_MORE_KEY = "__more__"

/** Số mục tối đa hiển thị trực tiếp trên BottomNav trước khi cần gom vào "Thêm". */
const BOTTOM_NAV_MAX_DIRECT_ITEMS = 4

/**
 * Thứ tự ưu tiên trên BottomNav của Quản trị nhà hàng, theo Figma
 * "Sơ đồ bàn · Mobile (375)": Sơ đồ bàn · Báo cáo · Đơn món · Nhân viên · Thêm.
 * Figma đặt "Báo cáo" trước "Đơn món", khác thứ tự trong Sidebar, nên cần bảng riêng.
 */
const RESTAURANT_ADMIN_BOTTOM_NAV_ORDER = [
  "TABLE_MAP",
  "REPORTS",
  "ORDER_AND_PREP",
  "STAFF",
] as const

export interface BottomNavEntry {
  /** Đường dẫn điều hướng, hoặc `undefined` với mục "Thêm". */
  path?: string
  key: string
  label: string
  icon: NavItem["icon"]
}

/**
 * Danh sách mục cho BottomNav, đã lọc quyền.
 *
 * - Quản trị nhà hàng: đúng 4 mục theo Figma + "Thêm".
 * - Vai trò khác: 4 mục đầu theo thứ tự menu của vai trò + "Thêm".
 * - Vai trò có tối đa 4 mục: KHÔNG hiện "Thêm" (không có gì để gom).
 *   Với Thu ngân (2 mục) thì đăng xuất đi qua MobileHeader, không qua NavDrawer.
 */
export function getBottomNavItems(
  role: AppRole,
  moreLabel = "Thêm",
  moreIcon?: NavItem["icon"],
): BottomNavEntry[] {
  const all = flattenNavItems(role)

  let direct: NavItem[]
  if (role === APP_ROLE.RESTAURANT_ADMIN) {
    // Giữ đúng thứ tự Figma; mục nào thiếu quyền thì bỏ qua thay vì để trống chỗ.
    direct = RESTAURANT_ADMIN_BOTTOM_NAV_ORDER.map((permission) =>
      all.find((item) => item.permission === permission),
    ).filter((item): item is NavItem => Boolean(item))
  } else {
    direct = all.slice(0, BOTTOM_NAV_MAX_DIRECT_ITEMS)
  }

  const entries: BottomNavEntry[] = direct.map((item) => ({
    path: item.path,
    key: item.path,
    // Thanh dưới chỉ rộng ~75px mỗi mục ở màn 375px nên ưu tiên nhãn rút gọn.
    label: item.shortLabel ?? item.label,
    icon: item.icon,
  }))

  // Chỉ thêm "Thêm" khi thực sự còn mục bị gom lại.
  const hasHiddenItems = all.length > direct.length
  if (hasHiddenItems && moreIcon) {
    entries.push({ key: BOTTOM_NAV_MORE_KEY, label: moreLabel, icon: moreIcon })
  }

  return entries
}

/**
 * Phân hệ BẮT BUỘC phải có một chi nhánh cụ thể mới hoạt động được.
 *
 * Chỉ Quản trị NH mới chọn được "Tất cả chi nhánh" (branchId = null). Khi đang ở chế độ
 * tổng hợp mà mở các phân hệ này, `StaffLayout` hiện empty state "Chọn một chi nhánh để
 * tiếp tục" kèm BranchSwitcher — thay vì để trang tự gọi API với branchId rỗng rồi trắng
 * hoặc lỗi.
 *
 * Báo cáo KHÔNG nằm trong danh sách: đây chính là phân hệ xem tổng hợp nhiều chi nhánh.
 */
const BRANCH_SCOPED_PERMISSIONS = new Set<NavItem["permission"]>([
  "TABLE_MAP",
  "ORDER_AND_PREP",
])

/** true nếu mục menu này cần một chi nhánh cụ thể. */
export function navItemRequiresBranch(item: NavItem | undefined): boolean {
  if (!item?.permission) return false
  return BRANCH_SCOPED_PERMISSIONS.has(item.permission)
}
