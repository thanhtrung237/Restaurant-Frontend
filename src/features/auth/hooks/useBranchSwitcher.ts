import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useAssignmentsByAccount } from "@/api/assignments.api"
import { useAuthStore } from "@/stores/auth.store"
import { APP_ROLE, mapRoleCodeToAppRole, type AppRole } from "@/config/roles"
import { ROLE_HOME } from "@/app/router/RoleHomeRedirect"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import { hasPermission, type PermissionKey } from "@/config/permissions"

/**
 * Một lựa chọn trong menu "Chuyển chi nhánh".
 * Mỗi lựa chọn ứng với MỘT ASSIGNMENT của tài khoản đang đăng nhập — không phải
 * danh sách toàn bộ chi nhánh của nhà hàng (BR-18: chỉ thao tác được trên chi nhánh
 * được phân công).
 */
export interface BranchChoice {
  assignmentId: number
  branchId: number | null
  /** Tên đầy đủ, vd "Chi nhánh Quận 1". */
  name: string
  /** Chữ viết tắt hiển thị trong chip/avatar, vd "Q1". */
  shortName: string
  /** Dòng phụ = tên vai trò của chính assignment đó, vd "Quản lý chi nhánh". */
  roleLabel: string
  role: AppRole
  /** true với mục ảo "Tất cả chi nhánh" (chỉ Quản trị NH). */
  isAllBranches: boolean
}

/** Mục ảo "Tất cả chi nhánh" — không ứng với assignment nào. */
export const ALL_BRANCHES_ASSIGNMENT_ID = -1

/**
 * Rút gọn tên chi nhánh thành nhãn ngắn cho chip: "Chi nhánh Quận 1" -> "Q1".
 * Ưu tiên mã chi nhánh nếu backend có trả về.
 */
function toShortName(name: string): string {
  // KHÔNG dùng branchCode: Figma ("Sơ đồ bàn · Mobile 375") hiện "Q1" — suy từ TÊN chi
  // nhánh, không phải mã "CN001". Mã dài hơn ~35px, đủ để đẩy tiêu đề trang thành "B...".
  const stripped = name.replace(/^chi\s*nh[áa]nh\s*/i, "").trim()
  if (!stripped) return name.slice(0, 2).toUpperCase()
  const words = stripped.split(/\s+/)
  if (words.length === 1) return words[0].slice(0, 2).toUpperCase()
  // "Quận 1" -> "Q1", "Thủ Đức" -> "TĐ"
  const last = words[words.length - 1]
  const head = words[0][0].toUpperCase()
  return /^\d+$/.test(last) ? `${head}${last}` : `${head}${last[0].toUpperCase()}`
}

/**
 * Nguồn dữ liệu + hành động cho việc đổi chi nhánh đang làm việc (FR-ADM-04:
 * "Nhân viên có nhiều phân công chi nhánh: chọn chi nhánh làm việc ngay sau khi đăng
 * nhập, đổi được bất kỳ lúc nào qua thanh trên cùng").
 *
 * Dùng chung cho Sidebar (đầy đủ), SidebarRail và MobileHeader (dạng chip).
 */
export function useBranchSwitcher() {
  const navigate = useNavigate()
  const account = useAuthStore((s) => s.account)
  const role = useAuthStore((s) => s.role)
  const branchId = useAuthStore((s) => s.branchId)
  const assignmentId = useAuthStore((s) => s.assignmentId)
  const setSession = useAuthStore((s) => s.setSession)
  const accessToken = useAuthStore((s) => s.accessToken)

  const { data: assignments = [] } = useAssignmentsByAccount(account?.id)

  const choices = React.useMemo<BranchChoice[]>(() => {
    const mapped = assignments
      .map((assignment): BranchChoice | null => {
        const mappedRole = mapRoleCodeToAppRole(assignment.roleCode)
        if (!mappedRole) return null
        const name = assignment.branchName ?? "Toàn nhà hàng"
        return {
          assignmentId: assignment.id,
          branchId: assignment.branchId ?? null,
          name,
          shortName: toShortName(name),
          // Quyết định: KHÔNG gọi thêm API để lấy số bàn/trạng thái chi nhánh.
          // Dòng phụ dùng tên vai trò của chính assignment đó.
          roleLabel: assignment.roleName ?? "",
          role: mappedRole,
          isAllBranches: false,
        }
      })
      .filter((choice): choice is BranchChoice => choice !== null)

    // "Tất cả chi nhánh · Xem tổng hợp" CHỈ dành cho Quản trị nhà hàng.
    if (role === APP_ROLE.RESTAURANT_ADMIN && mapped.length > 0) {
      return [
        {
          assignmentId: ALL_BRANCHES_ASSIGNMENT_ID,
          branchId: null,
          name: "Tất cả chi nhánh",
          shortName: "TC",
          roleLabel: "Xem tổng hợp",
          role: APP_ROLE.RESTAURANT_ADMIN,
          isAllBranches: true,
        },
        ...mapped,
      ]
    }
    return mapped
  }, [assignments, role])

  const activeChoice = React.useMemo(
    () => choices.find((c) => c.assignmentId === assignmentId) ?? choices[0],
    [choices, assignmentId],
  )

  /** Tài khoản chỉ có 1 phân công thì hiển thị tên, không mở dropdown. */
  const canSwitch = choices.length > 1

  const switchTo = React.useCallback(
    (choice: BranchChoice) => {
      if (!account || !accessToken) return
      if (choice.assignmentId === assignmentId) return

      setSession({
        account,
        role: choice.role,
        branchId: choice.branchId,
        accessToken,
        assignmentId: choice.assignmentId,
      })

      // Chọn "Tất cả chi nhánh" -> đi thẳng Báo cáo (phạm vi tổng hợp), vì phần lớn
      // màn vận hành bắt buộc có branchId.
      if (choice.isAllBranches) {
        navigate(RESTAURANT_ADMIN_PATHS.REPORTS)
        return
      }

      // Vai trò có thể khác nhau giữa các chi nhánh. Nếu trang đang mở không còn thuộc
      // quyền của vai trò mới thì đưa về trang chủ của vai trò đó thay vì để 403.
      if (choice.role !== role) {
        navigate(ROLE_HOME[choice.role])
      }
    },
    [account, accessToken, assignmentId, role, setSession, navigate],
  )

  return {
    choices,
    activeChoice,
    canSwitch,
    switchTo,
    /** true khi đang ở chế độ tổng hợp (chưa chọn chi nhánh cụ thể). */
    isAllBranches: branchId === null && role === APP_ROLE.RESTAURANT_ADMIN,
  }
}

/**
 * Trang bắt buộc phải có chi nhánh cụ thể (sơ đồ bàn, KDS, thanh toán...) dùng cờ này
 * để hiện empty state "Chọn một chi nhánh để tiếp tục" thay vì lỗi/trang trắng.
 */
export function useRequiresBranch(permission?: PermissionKey): boolean {
  const role = useAuthStore((s) => s.role)
  const branchId = useAuthStore((s) => s.branchId)
  if (branchId !== null) return false
  if (permission && !hasPermission(role, permission)) return false
  return true
}
