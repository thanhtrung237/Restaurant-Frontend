import React from "react"
import { Plus, MapPin } from "lucide-react"
import { Button } from "@/components/ui/button"
import { SearchInput } from "@/components/common/SearchInput"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { MenuTabType } from "../types"

interface MenuHeaderProps {
  activeTab: MenuTabType
  searchTerm: string
  onSearchChange: (value: string) => void
  onAddDish?: () => void
  onAddCategory?: () => void
  onAddOptionGroup?: () => void
  branches: { id: number; name: string }[]
  selectedBranchId: number | null
  onBranchChange: (branchId: number) => void
}

/**
 * Header màn hình Thực đơn
 * Tự động thích ứng tiêu đề, mô tả và cụm công cụ bên phải theo từng tab (Món, Danh mục, Menu chi nhánh)
 */
export const MenuHeaderActions: React.FC<MenuHeaderProps> = ({
  activeTab,
  searchTerm,
  onSearchChange,
  onAddDish,
  onAddCategory,
  onAddOptionGroup,
  branches,
  selectedBranchId,
  onBranchChange,
}) => {
  return (
    // CHỈ cụm điều khiển bên phải — tiêu đề/dòng phụ do PageHeader lo.
    <>
      {activeTab === "mon" ? (
        <>
          <div className="w-56 sm:w-64">
            <SearchInput
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onClear={() => onSearchChange("")}
              placeholder="Tìm món..."
              variant="pill"
              size="default"
            />
          </div>

          <Button type="button" onClick={onAddDish} className="h-10 shrink-0 gap-1.5 px-4">
            <Plus className="size-4 stroke-[2.5]" />
            <span>Thêm món</span>
          </Button>
        </>
      ) : activeTab === "danh-muc" ? (
        <Button type="button" onClick={onAddCategory} className="h-10 shrink-0 gap-1.5 px-4">
          <Plus className="size-4 stroke-[2.5]" />
          <span>Thêm danh mục</span>
        </Button>
      ) : activeTab === "tuy-chon" ? (
        <>
          <div className="w-56 sm:w-64">
            <SearchInput
              value={searchTerm}
              onChange={(e) => onSearchChange(e.target.value)}
              onClear={() => onSearchChange("")}
              placeholder="Tìm nhóm tùy chọn..."
              variant="pill"
              size="default"
            />
          </div>

          <Button type="button" onClick={onAddOptionGroup} className="h-10 shrink-0 gap-1.5 px-4">
            <Plus className="size-4 stroke-[2.5]" />
            <span>Thêm nhóm tùy chọn</span>
          </Button>
        </>
      ) : (
        <Select
          value={selectedBranchId?.toString() ?? ""}
          onValueChange={(val) => onBranchChange(Number(val))}
        >
          <SelectTrigger className="h-10 w-52 rounded-xl border-border-default bg-surface-card font-medium text-text-primary hover:border-border-strong sm:w-56">
            <div className="flex items-center gap-2 truncate">
              <MapPin className="size-4 shrink-0 text-text-tertiary" />
              <SelectValue placeholder="Chọn chi nhánh" />
            </div>
          </SelectTrigger>
          <SelectContent>
            {branches.map((branch) => (
              <SelectItem key={branch.id} value={branch.id.toString()} className="cursor-pointer">
                {branch.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      )}
    </>
  )
}