import React from "react"
import { cn } from "@/lib/utils"
import type { StaffTabType } from "../types"

interface StaffTabsProps {
  activeTab: StaffTabType
  onTabChange: (tab: StaffTabType) => void
  /**
   * Danh sách tab hiển thị. Mặc định đủ 3 tab (Quản trị nhà hàng — mục 4.3).
   * Quản lý chi nhánh chỉ có 2 tab (Nhân viên + Nhật ký hoạt động), KHÔNG có
   * "Vai trò & phân quyền" — truyền tabs rút gọn từ trang bọc ngoài.
   */
  tabs?: { id: StaffTabType; label: string }[]
}

const DEFAULT_TABS: { id: StaffTabType; label: string }[] = [
  { id: "staff", label: "Nhân viên" },
  { id: "roles", label: "Vai trò & phân quyền" },
  { id: "audit-log", label: "Nhật ký hoạt động" },
]

export const StaffTabs: React.FC<StaffTabsProps> = ({ activeTab, onTabChange, tabs = DEFAULT_TABS }) => {
  return (
    <div className="border-b border-gray-200">
      <nav className="flex space-x-8" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "py-3.5 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer relative",
                isActive
                  ? "border-[#EA4A2A] text-[#EA4A2A]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300"
              )}
            >
              {tab.label}
            </button>
          )
        })}
      </nav>
    </div>
  )
}
