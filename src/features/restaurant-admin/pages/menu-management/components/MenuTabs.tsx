import React from "react"
import { cn } from "@/lib/utils"
import type { MenuTabType } from "../types"

interface MenuTabsProps {
  activeTab: MenuTabType
  onTabChange: (tab: MenuTabType) => void
}

const TABS: { id: MenuTabType; label: string }[] = [
  { id: "mon", label: "Món" },
  { id: "danh-muc", label: "Danh mục" },
  { id: "menu-chi-nhanh", label: "Menu chi nhánh" },
]

/**
 * Thanh chuyển đổi Tab trên màn hình Thực đơn
 * Khớp chuẩn cấu trúc như StaffTabs trong staff-management
 */
export const MenuTabs: React.FC<MenuTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    <div className="border-b border-border-default">
      <nav className="flex space-x-8" aria-label="Tabs">
        {TABS.map((tab) => {
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
