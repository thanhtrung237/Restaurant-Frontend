import React from "react"
import { cn } from "@/lib/utils"
import type { MenuTabType } from "../types"

import { useAuthStore } from "@/stores/auth.store"
import { APP_ROLE } from "@/config/roles"

interface MenuTabsProps {
  activeTab: MenuTabType
  onTabChange: (tab: MenuTabType) => void
  showOptionGroupTab?: boolean
}

/**
 * Thanh chuyển đổi Tab trên màn hình Thực đơn
 * Khớp chuẩn cấu trúc như StaffTabs trong staff-management
 */
export const MenuTabs: React.FC<MenuTabsProps> = ({ activeTab, onTabChange, showOptionGroupTab }) => {
  const role = useAuthStore((s) => s.role)
  const canSeeOptionGroups = showOptionGroupTab ?? (role === APP_ROLE.RESTAURANT_ADMIN)

  const tabs: { id: MenuTabType; label: string }[] = [
    { id: "mon", label: "Món" },
    { id: "danh-muc", label: "Danh mục" },
    { id: "menu-chi-nhanh", label: "Menu chi nhánh" },
    ...(canSeeOptionGroups ? [{ id: "tuy-chon" as const, label: "Tùy chọn món" }] : []),
  ]
  return (
    // KHÔNG tự vẽ border-b: dải tab của PageHeader đã có đường kẻ dưới.
    <div>
      <nav className="flex space-x-8 overflow-x-auto whitespace-nowrap [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden" aria-label="Tabs">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "py-3 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer relative",
                isActive
                  ? "border-brand-primary text-brand-primary font-semibold"
                  : "border-transparent text-text-tertiary hover:text-text-primary hover:border-border-strong"
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
