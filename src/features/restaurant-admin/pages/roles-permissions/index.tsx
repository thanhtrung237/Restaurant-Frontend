import { useNavigate } from "react-router-dom"
import { RolesHeader } from "./components/RolesHeader"
import { PermissionLegend } from "./components/PermissionLegend"
import { PermissionMatrixTable } from "./components/PermissionMatrixTable"
import { StaffTabs } from "../staff-management/components/StaffTabs"
import { MOCK_PERMISSION_MATRIX } from "./mock-data"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import type { StaffTabType } from "../staff-management/types"

/**
 * Vai trò & phân quyền — Màn hình thuộc Quản trị nhà hàng (restaurant-admin)
 * Nguồn: Desktop / Vai trò & phân quyền.png
 */
export default function RolesPermissionsPage() {
  const navigate = useNavigate()

  const handleTabChange = (tab: StaffTabType) => {
    if (tab === "staff") {
      navigate(RESTAURANT_ADMIN_PATHS.STAFF_MANAGEMENT)
    } else if (tab === "roles") {
      navigate(RESTAURANT_ADMIN_PATHS.ROLES_PERMISSIONS)
    } else if (tab === "audit-log") {
      navigate(RESTAURANT_ADMIN_PATHS.AUDIT_LOG)
    }
  }

  const handleCreateRole = () => {
    console.log("Mở modal tạo vai trò mới")
  }

  const handleEditRolePermissions = (roleKey: string) => {
    console.log("Chỉnh sửa quyền cho vai trò:", roleKey)
  }

  return (
    <div className="flex flex-col min-h-full bg-surface-ground p-6 lg:p-8 space-y-6">
      {/* 1. Header trang */}
      <RolesHeader totalRoles={6} onCreateRole={handleCreateRole} />

      {/* 2. Thanh Tabs điều hướng */}
      <StaffTabs activeTab="roles" onTabChange={handleTabChange} />

      {/* 3. Chú thích các cấp độ quyền */}
      <PermissionLegend />

      {/* 4. Bảng ma trận phân quyền */}
      <PermissionMatrixTable
        data={MOCK_PERMISSION_MATRIX}
        onEditRolePermissions={handleEditRolePermissions}
      />
    </div>
  )
}
