import React from "react"
import { GripVertical, Pencil, Trash2 } from "lucide-react"
import { Switch } from "@/components/ui/switch"
import { IconButton } from "@/components/ui/icon-button"
import type { CategoryItem } from "../types"

interface DanhMucTabProps {
  categories: CategoryItem[]
  onToggleStatus?: (categoryId: number, newStatus: boolean) => void
  onEditCategory?: (category: CategoryItem) => void
  onDeleteCategory?: (category: CategoryItem) => void
}

/**
 * Tab "Danh mục" — Quản lý danh mục món ăn
 * Chuẩn theo file: QuanLy/Quản lý danh mục.png
 */
export const DanhMucTab: React.FC<DanhMucTabProps> = ({
  categories,
  onToggleStatus,
  onEditCategory,
  onDeleteCategory,
}) => {
  return (
    <div className="pt-1">
      <div className="overflow-hidden rounded-card border border-border-default bg-surface-card divide-y divide-border-default shadow-2xs">
        {categories.map((cat) => (
          <div
            key={cat.id}
            className="p-4 sm:px-6 flex items-center justify-between gap-3 hover:bg-surface-muted/30 transition-colors"
          >
            {/* Cụm trái: Icon kéo-thả + Vòng tròn STT + Tên & Mô tả */}
            <div className="flex items-center gap-3.5 min-w-0 flex-1">
              <GripVertical className="size-4 text-text-tertiary cursor-grab shrink-0 hover:text-text-primary" />

              <div className="size-7 sm:size-8 shrink-0 rounded-full bg-brand-primary-subtle text-brand-primary font-bold text-xs flex items-center justify-center">
                {cat.order}
              </div>

              <div className="min-w-0">
                <p className="font-semibold text-text-primary text-sm tracking-tight leading-snug truncate">
                  {cat.name}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5 truncate">
                  {cat.description}
                </p>
              </div>
            </div>

            {/* Cụm phải: Số món + Switch Hiện/Ẩn + Nút Sửa / Xoá */}
            <div className="flex items-center gap-4 sm:gap-6 shrink-0">
              {/* Số món */}
              <span className="text-sm text-text-secondary w-16 sm:w-20 text-right">
                {cat.dishCount} món
              </span>

              {/* Switch Hiện / Ẩn */}
              <div className="flex items-center gap-2">
                <Switch
                  checked={cat.isActive}
                  onCheckedChange={(checked) => onToggleStatus?.(cat.id, checked)}
                  className="cursor-pointer data-[state=checked]:bg-status-success"
                />
                <span
                  className={`text-sm font-medium w-8 ${
                    cat.isActive ? "text-text-secondary" : "text-text-tertiary"
                  }`}
                >
                  {cat.isActive ? "Hiện" : "Ẩn"}
                </span>
              </div>

              {/* Nút Sửa & Xoá */}
              <div className="flex items-center gap-1">
                <IconButton
                  type="button"
                  variant="subtle"
                  size="sm"
                  onClick={() => onEditCategory?.(cat)}
                  className="rounded-xl text-text-secondary hover:text-text-primary cursor-pointer size-8.5"
                  title="Chỉnh sửa danh mục"
                  aria-label="Chỉnh sửa danh mục"
                >
                  <Pencil className="size-3.5" />
                </IconButton>

                <IconButton
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => onDeleteCategory?.(cat)}
                  className="rounded-xl text-status-danger hover:bg-status-danger-subtle hover:text-status-danger cursor-pointer size-8.5"
                  title="Xoá danh mục"
                  aria-label="Xoá danh mục"
                >
                  <Trash2 className="size-3.5" />
                </IconButton>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
