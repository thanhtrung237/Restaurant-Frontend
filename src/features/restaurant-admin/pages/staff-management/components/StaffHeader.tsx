import React from "react"
import { Plus } from "lucide-react"
import { SearchInput } from "@/components/common/SearchInput"

interface StaffHeaderProps {
  searchTerm: string
  onSearchChange: (value: string) => void
  onAddStaff?: () => void
  totalAccounts?: number
  totalRoles?: number
  /** Quản lý chi nhánh chỉ XEM danh sách nhân viên — ẩn nút "Thêm nhân viên" (mục 4.3). */
  showAddButton?: boolean
}

export const StaffHeader: React.FC<StaffHeaderProps> = ({
  searchTerm,
  onSearchChange,
  onAddStaff,
  totalAccounts = 12,
  totalRoles = 5,
  showAddButton = true,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Nhân viên</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {totalAccounts} tài khoản · phân theo {totalRoles} vai trò
        </p>
      </div>

      <div className="flex items-center gap-3">
        <div className="w-64 sm:w-72">
          <SearchInput
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            onClear={() => onSearchChange("")}
            placeholder="Tìm nhân viên..."
            variant="pill"
            size="default"
            className="bg-[#F3F4F6] text-sm text-gray-800 placeholder:text-gray-400 focus:bg-white"
          />
        </div>

        {showAddButton && (
          <button
            type="button"
            onClick={onAddStaff}
            className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-[#EA4A2A] hover:bg-[#d93f20] text-white font-medium text-sm rounded-xl transition-all shadow-xs cursor-pointer shrink-0"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>Thêm nhân viên</span>
          </button>
        )}
      </div>
    </div>
  )
}
