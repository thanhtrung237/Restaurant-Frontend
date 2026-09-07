import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { StaffHeader } from "./components/StaffHeader"
import { StaffTabs } from "./components/StaffTabs"
import { StaffFilterBar } from "./components/StaffFilterBar"
import { StaffTable } from "./components/StaffTable"
import { MOCK_STAFF_MEMBERS } from "./mock-data"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import type { StaffMember, StaffStatusFilter, StaffTabType } from "./types"

/**
 * Quản lý nhân viên — Màn hình thuộc Quản trị nhà hàng (restaurant-admin)
 * Nguồn: Desktop / Quản lý nhân viên.png
 */
export default function StaffManagementPage() {
  const [activeTab, setActiveTab] = useState<StaffTabType>("staff")
  const [searchTerm, setSearchTerm] = useState("")
  const [statusFilter, setStatusFilter] = useState<StaffStatusFilter>("ALL")
  const [selectedBranch, setSelectedBranch] = useState("Tất cả chi nhánh")
  const [selectedRole, setSelectedRole] = useState("Tất cả vai trò")

  // Lọc dữ liệu nhân viên theo từ khóa tìm kiếm, trạng thái, chi nhánh và vai trò
  const filteredStaff = useMemo(() => {
    return MOCK_STAFF_MEMBERS.filter((staff) => {
      // 1. Lọc theo từ khoá (tên, mã, username)
      if (searchTerm.trim()) {
        const query = searchTerm.toLowerCase().trim()
        const matchName = staff.fullName.toLowerCase().includes(query)
        const matchCode = staff.employeeCode.toLowerCase().includes(query)
        const matchUser = staff.username.toLowerCase().includes(query)
        if (!matchName && !matchCode && !matchUser) return false
      }

      // 2. Lọc theo trạng thái
      if (statusFilter === "ACTIVE" && staff.status !== "ACTIVE") return false
      if (statusFilter === "LOCKED" && staff.status !== "LOCKED") return false

      // 3. Lọc theo chi nhánh
      if (selectedBranch !== "Tất cả chi nhánh" && staff.branch !== selectedBranch) {
        return false
      }

      // 4. Lọc theo vai trò
      if (selectedRole !== "Tất cả vai trò" && staff.role !== selectedRole) {
        return false
      }

      return true
    })
  }, [searchTerm, statusFilter, selectedBranch, selectedRole])

  const handleAddStaff = () => {
    console.log("Thêm nhân viên mới")
  }

  const handleEditStaff = (staff: StaffMember) => {
    console.log("Chỉnh sửa nhân viên:", staff)
  }

  const handleMoreOptions = (staff: StaffMember) => {
    console.log("Tuỳ chọn nhân viên:", staff)
  }

  const navigate = useNavigate()

  const handleTabChange = (tab: StaffTabType) => {
    setActiveTab(tab)
    if (tab === "roles") {
      navigate(RESTAURANT_ADMIN_PATHS.ROLES_PERMISSIONS)
    } else if (tab === "audit-log") {
      navigate(RESTAURANT_ADMIN_PATHS.AUDIT_LOG)
    }
  }

  return (
    <div className="flex flex-col min-h-full bg-surface-ground p-6 lg:p-8 space-y-6">
      {/* 1. Header trang */}
      <StaffHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        onAddStaff={handleAddStaff}
        totalAccounts={12}
        totalRoles={5}
      />

      {/* 2. Thanh điều hướng Tabs */}
      <StaffTabs activeTab={activeTab} onTabChange={handleTabChange} />

      {/* 3. Nội dung theo từng tab */}
      {activeTab === "staff" ? (
        <div className="space-y-4">
          {/* Thanh lọc trạng thái và dropdowns */}
          <StaffFilterBar
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            selectedBranch={selectedBranch}
            onBranchChange={setSelectedBranch}
            selectedRole={selectedRole}
            onRoleChange={setSelectedRole}
          />

          {/* Bảng danh sách nhân viên */}
          <StaffTable
            staffMembers={filteredStaff}
            onEditStaff={handleEditStaff}
            onMoreOptions={handleMoreOptions}
          />
        </div>
      ) : activeTab === "roles" ? (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-12 text-center text-gray-500">
          <p className="font-medium text-gray-700">Vai trò & phân quyền</p>
          <p className="text-sm mt-1">Đang tải danh sách vai trò và bảng ma trận quyền...</p>
        </div>
      ) : (
        <div className="rounded-2xl border border-gray-200/80 bg-white p-12 text-center text-gray-500">
          <p className="font-medium text-gray-700">Nhật ký hoạt động</p>
          <p className="text-sm mt-1">Đang tải lịch sử thao tác của các tài khoản...</p>
        </div>
      )}
    </div>
  )
}
