import { useState, useMemo } from "react"
import { useNavigate } from "react-router-dom"
import { AuditLogHeader } from "./components/AuditLogHeader"
import { AuditLogFilterBar } from "./components/AuditLogFilterBar"
import { AuditLogTable } from "./components/AuditLogTable"
import { StaffTabs } from "../staff-management/components/StaffTabs"
import { MOCK_AUDIT_LOGS } from "./mock-data"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import type { StaffTabType } from "../staff-management/types"

/**
 * Nhật ký hoạt động — Màn hình thuộc Quản trị nhà hàng (restaurant-admin)
 * Nguồn: Desktop / Nhật ký hoạt động.png
 */
export default function AuditLogPage() {
  const navigate = useNavigate()
  const [selectedAction, setSelectedAction] = useState("Tất cả thao tác")
  const [selectedStaff, setSelectedStaff] = useState("Mọi nhân viên")
  const [selectedDateRange, setSelectedDateRange] = useState("7 ngày qua")

  const handleTabChange = (tab: StaffTabType) => {
    if (tab === "staff") {
      navigate(RESTAURANT_ADMIN_PATHS.STAFF_MANAGEMENT)
    } else if (tab === "roles") {
      navigate(RESTAURANT_ADMIN_PATHS.ROLES_PERMISSIONS)
    } else if (tab === "audit-log") {
      navigate(RESTAURANT_ADMIN_PATHS.AUDIT_LOG)
    }
  }

  const handleExportLog = () => {
    console.log("Xuất file log hoạt động")
  }

  // Lọc danh sách nhật ký theo thao tác và nhân viên
  const filteredLogs = useMemo(() => {
    return MOCK_AUDIT_LOGS.filter((item) => {
      // 1. Lọc theo thao tác
      if (
        selectedAction !== "Tất cả thao tác" &&
        item.actionLabel !== selectedAction
      ) {
        return false
      }

      // 2. Lọc theo người thực hiện
      if (
        selectedStaff !== "Mọi nhân viên" &&
        item.performedByName !== selectedStaff
      ) {
        return false
      }

      return true
    })
  }, [selectedAction, selectedStaff, selectedDateRange])

  return (
    <div className="flex flex-col min-h-full bg-surface-ground p-6 lg:p-8 space-y-6">
      {/* 1. Header trang */}
      <AuditLogHeader onExportLog={handleExportLog} />

      {/* 2. Thanh Tabs điều hướng */}
      <StaffTabs activeTab="audit-log" onTabChange={handleTabChange} />

      {/* 3. Thanh dropdowns lọc */}
      <AuditLogFilterBar
        selectedAction={selectedAction}
        onActionChange={setSelectedAction}
        selectedStaff={selectedStaff}
        onStaffChange={setSelectedStaff}
        selectedDateRange={selectedDateRange}
        onDateRangeChange={setSelectedDateRange}
      />

      {/* 4. Bảng danh sách nhật ký */}
      <AuditLogTable logs={filteredLogs} />
    </div>
  )
}
