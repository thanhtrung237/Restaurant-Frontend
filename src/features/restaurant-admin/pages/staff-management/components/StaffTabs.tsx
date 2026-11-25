import React from "react"
import { useNavigate } from "react-router-dom"
import { BRANCH_MANAGER_PATHS, RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import { APP_ROLE } from "@/config/roles"
import { cn } from "@/lib/utils"
import { useAuthStore } from "@/stores/auth.store"
import type { StaffTabType } from "../types"

interface StaffTabsProps {
  activeTab: StaffTabType
  onTabChange: (tab: StaffTabType) => void
  tabs?: { id: StaffTabType; label: string }[]
}

const DEFAULT_TABS: { id: StaffTabType; label: string }[] = [
  { id: "staff", label: "Nhân viên" },
  { id: "roles", label: "Vai trò & phân quyền" },
  { id: "audit-log", label: "Nhật ký hoạt động" },
]
const ADMIN_TAB_PATHS: Record<StaffTabType, string> = {
  staff: RESTAURANT_ADMIN_PATHS.STAFF_MANAGEMENT,
  roles: RESTAURANT_ADMIN_PATHS.ROLES_PERMISSIONS,
  "audit-log": RESTAURANT_ADMIN_PATHS.AUDIT_LOG,
}
const BRANCH_TAB_PATHS: Partial<Record<StaffTabType, string>> = {
  staff: BRANCH_MANAGER_PATHS.STAFF,
  roles: BRANCH_MANAGER_PATHS.ROLES_PERMISSIONS,
  "audit-log": BRANCH_MANAGER_PATHS.AUDIT_LOG,
}

export function StaffNavigationTabs({ activeTab }: { activeTab: StaffTabType }) {
  const navigate = useNavigate()
  const isBranchManager = useAuthStore((state) => state.role === APP_ROLE.BRANCH_MANAGER)
  const paths = isBranchManager ? BRANCH_TAB_PATHS : ADMIN_TAB_PATHS

  return (
    <StaffTabs
      activeTab={activeTab}
      onTabChange={(tab) => {
        const path = paths[tab]
        if (path) navigate(path)
      }}
    />
  )
}

export const StaffTabs: React.FC<StaffTabsProps> = ({
  activeTab,
  onTabChange,
  tabs = DEFAULT_TABS,
}) => {
  return (
    // KHÔNG tự vẽ border-b: dải tab của PageHeader đã có đường kẻ dưới.
    <div>
      {/* Cuộn ngang ở màn hẹp để 3 tab không bị xuống dòng / tràn ngang trang */}
      <nav
        className="flex space-x-8 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        aria-label="Tabs"
      >
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? "page" : undefined}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "py-3.5 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer relative",
                isActive
                  ? "border-[#EA4A2A] text-[#EA4A2A]"
                  : "border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300",
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
