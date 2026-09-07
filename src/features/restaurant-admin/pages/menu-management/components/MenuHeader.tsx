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
import { MOCK_BRANCH_OPTIONS } from "../mock-data"
import type { MenuTabType } from "../types"

interface MenuHeaderProps {
  activeTab: MenuTabType
  searchTerm: string
  onSearchChange: (value: string) => void
  onAddDish?: () => void
  onAddCategory?: () => void
  selectedBranch: string
  onBranchChange: (branch: string) => void
  totalDishes?: number
  totalCategories?: number
}

/**
 * Header màn hình Thực đơn
 * Tự động thích ứng tiêu đề, mô tả và cụm công cụ bên phải theo từng tab (Món, Danh mục, Menu chi nhánh)
 */
export const MenuHeader: React.FC<MenuHeaderProps> = ({
  activeTab,
  searchTerm,
  onSearchChange,
  onAddDish,
  onAddCategory,
  selectedBranch,
  onBranchChange,
  totalDishes = 42,
  totalCategories = 6,
}) => {
  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      {/* Cột trái: Tiêu đề và mô tả */}
      <div>
        {activeTab === "mon" ? (
          <>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Thực đơn</h1>
            <p className="text-sm text-text-tertiary mt-0.5">
              {totalDishes} món · {totalCategories} danh mục
            </p>
          </>
        ) : activeTab === "danh-muc" ? (
          <>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Danh mục</h1>
            <p className="text-sm text-text-tertiary mt-0.5">
              {totalCategories} danh mục · dùng chung mọi chi nhánh · kéo–thả để sắp thứ tự
            </p>
          </>
        ) : (
          <>
            <h1 className="text-2xl font-bold text-text-primary tracking-tight">Menu chi nhánh</h1>
            <p className="text-sm text-text-tertiary mt-0.5">
              Đè giá / tạm ẩn / thêm món riêng cho chi nhánh (BR-17)
            </p>
          </>
        )}
      </div>

      {/* Cột phải: Công cụ theo từng tab */}
      <div className="flex items-center gap-3">
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

            <Button
              type="button"
              onClick={onAddDish}
              className="cursor-pointer gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold shrink-0"
            >
              <Plus className="size-4 stroke-[2.5]" />
              <span>Thêm món</span>
            </Button>
          </>
        ) : activeTab === "danh-muc" ? (
          <Button
            type="button"
            onClick={onAddCategory}
            className="cursor-pointer gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold shrink-0"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>Thêm danh mục</span>
          </Button>
        ) : (
          <Select value={selectedBranch} onValueChange={onBranchChange}>
            <SelectTrigger className="w-52 sm:w-56 h-10 rounded-xl border-border-default bg-surface-card text-text-primary font-medium hover:border-border-strong cursor-pointer">
              <div className="flex items-center gap-2 truncate">
                <MapPin className="size-4 text-text-tertiary shrink-0" />
                <SelectValue placeholder="Chọn chi nhánh" />
              </div>
            </SelectTrigger>
            <SelectContent>
              {MOCK_BRANCH_OPTIONS.map((branch) => (
                <SelectItem key={branch} value={branch} className="cursor-pointer">
                  {branch}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        )}
      </div>
    </div>
  )
}
