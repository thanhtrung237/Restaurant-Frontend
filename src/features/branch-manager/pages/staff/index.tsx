import { useState, useMemo } from "react"
import { useAuthStore } from "@/stores/auth.store"
import { StaffHeader } from "@/features/restaurant-admin/pages/staff-management/components/StaffHeader"
import { StaffTabs } from "@/features/restaurant-admin/pages/staff-management/components/StaffTabs"
import { StaffTable } from "@/features/restaurant-admin/pages/staff-management/components/StaffTable"
import { MOCK_STAFF_MEMBERS } from "@/features/restaurant-admin/pages/staff-management/mock-data"
import { AuditLogFilterBar } from "@/features/restaurant-admin/pages/audit-log/components/AuditLogFilterBar"
import { AuditLogTable } from "@/features/restaurant-admin/pages/audit-log/components/AuditLogTable"
import { MOCK_AUDIT_LOGS } from "@/features/restaurant-admin/pages/audit-log/mock-data"
import type { StaffTabType } from "@/features/restaurant-admin/pages/staff-management/types"

/** branchId (auth.store) → nhãn chi nhánh ngắn dùng trong dữ liệu mock (staff.branch / log.branchName) */
const BRANCH_LABEL_BY_ID: Record<number, string> = {
  1: "Quận 1",
  2: "Quận 3",
  3: "Thủ Đức",
}

/** Chỉ 2 tab — KHÔNG có "Vai trò & phân quyền" (chỉ Quản trị NH mới có, mục 4.3) */
const BRANCH_MANAGER_STAFF_TABS: { id: StaffTabType; label: string }[] = [
  { id: "staff", label: "Nhân viên" },
  { id: "audit-log", label: "Nhật ký hoạt động" },
]

/**
 * Nhân viên — Màn hình thuộc Quản lý chi nhánh (branch-manager)
 * QL chi nhánh CHỈ XEM (không thêm/sửa/khoá tài khoản) danh sách nhân viên và nhật ký
 * hoạt động của CHI NHÁNH MÌNH — theo bảng phân quyền theo màn hình (mục 4.2/4.3).
 * Tái sử dụng component từ restaurant-admin/staff-management & audit-log.
 */
export default function BranchManagerStaffPage() {
  const branchId = useAuthStore((s) => s.branchId) || 1
  const branchLabel = BRANCH_LABEL_BY_ID[branchId] || "Quận 1"

  const [activeTab, setActiveTab] = useState<StaffTabType>("staff")
  const [searchTerm, setSearchTerm] = useState("")

  // Tab "Nhật ký hoạt động" — bộ lọc riêng
  const [selectedAction, setSelectedAction] = useState("Tất cả thao tác")
  const [selectedStaff, setSelectedStaff] = useState("Mọi nhân viên")
  const [selectedDateRange, setSelectedDateRange] = useState("7 ngày qua")

  // Chỉ nhân viên thuộc chi nhánh mình
  const branchStaff = useMemo(
    () => MOCK_STAFF_MEMBERS.filter((s) => s.branch === branchLabel),
    [branchLabel]
  )

  const filteredStaff = useMemo(() => {
    if (!searchTerm.trim()) return branchStaff
    const query = searchTerm.toLowerCase().trim()
    return branchStaff.filter(
      (staff) =>
        staff.fullName.toLowerCase().includes(query) ||
        staff.employeeCode.toLowerCase().includes(query) ||
        staff.username.toLowerCase().includes(query)
    )
  }, [branchStaff, searchTerm])

  // Chỉ nhật ký thuộc chi nhánh mình
  const branchLogs = useMemo(
    () => MOCK_AUDIT_LOGS.filter((log) => log.branchName === branchLabel),
    [branchLabel]
  )

  const filteredLogs = useMemo(() => {
    return branchLogs.filter((item) => {
      if (selectedAction !== "Tất cả thao tác" && item.actionLabel !== selectedAction) return false
      if (selectedStaff !== "Mọi nhân viên" && item.performedByName !== selectedStaff) return false
      return true
    })
  }, [branchLogs, selectedAction, selectedStaff, selectedDateRange])

  return (
    <div className="flex flex-col min-h-full bg-surface-ground p-6 lg:p-8 space-y-6">
      <StaffHeader
        searchTerm={searchTerm}
        onSearchChange={setSearchTerm}
        totalAccounts={branchStaff.length}
        totalRoles={1}
        showAddButton={false}
      />

      <StaffTabs activeTab={activeTab} onTabChange={setActiveTab} tabs={BRANCH_MANAGER_STAFF_TABS} />

      {activeTab === "staff" ? (
        <StaffTable staffMembers={filteredStaff} readOnly />
      ) : (
        <div className="space-y-4">
          <AuditLogFilterBar
            selectedAction={selectedAction}
            onActionChange={setSelectedAction}
            selectedStaff={selectedStaff}
            onStaffChange={setSelectedStaff}
            selectedDateRange={selectedDateRange}
            onDateRangeChange={setSelectedDateRange}
          />
          <AuditLogTable logs={filteredLogs} />
        </div>
      )}
    </div>
  )
}
