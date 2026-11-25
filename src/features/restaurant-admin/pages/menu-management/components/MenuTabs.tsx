import React from "react"
import { cn } from "@/lib/utils"
import type { MenuTabType } from "../types"

interface MenuTabsProps {
  activeTab: MenuTabType
  onTabChange: (tab: MenuTabType) => void
}

/**
 * Thanh chuyển đổi Tab trên màn hình Thực đơn
 * Khớp chuẩn cấu trúc như StaffTabs trong staff-management
 */
const tabs = [
  { id: "mon", label: "Thực đơn chung" },
  { id: "menu-chi-nhanh", label: "Theo chi nhánh" },
] as const

export const MenuTabs: React.FC<MenuTabsProps> = ({ activeTab, onTabChange }) => {
  return (
    // KHÔNG tự vẽ border-b: dải tab của PageHeader đã có đường kẻ dưới.
    <div>
      <nav className="flex gap-5 whitespace-nowrap sm:gap-8" aria-label="Phạm vi thực đơn">
        {tabs.map((tab) => {
          const isActive = tab.id === "mon" ? activeTab !== "menu-chi-nhanh" : activeTab === tab.id
          return (
            <button
              key={tab.id}
              type="button"
              aria-current={isActive ? "true" : undefined}
              onClick={() => onTabChange(tab.id)}
              className={cn(
                "py-3 px-1 border-b-2 font-medium text-sm transition-colors cursor-pointer relative",
                isActive
                  ? "border-brand-primary text-brand-primary font-semibold"
                  : "border-transparent text-text-tertiary hover:text-text-primary hover:border-border-strong",
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
