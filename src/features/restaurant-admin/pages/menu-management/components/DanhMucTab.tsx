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
/**
 * Lý do khoá nút xoá. Nêu rõ khi phần chênh lệch đến từ món RIÊNG chi nhánh, vì người
 * dùng nhìn tab "Món" (chỉ món cấp nhà hàng) sẽ không hiểu vì sao danh mục "trống" mà
 * vẫn không xoá được.
 */
function buildBlockedDeleteHint(cat: CategoryItem): string {
  const branchOnly = cat.totalDishCount - cat.dishCount
  const suffix =
    branchOnly > 0 ? ` (trong đó ${branchOnly} món riêng chi nhánh)` : ""
  return `Danh mục còn ${cat.totalDishCount} món${suffix}, chuyển hoặc ngừng bán món trước`
}

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

              {/* Figma có dòng mô tả nhưng CategoryResponse của BE không có trường này
                  — bỏ khỏi UI thay vì hiện rỗng (xem docs/todo.md). */}
              <p className="min-w-0 truncate text-sm font-semibold leading-snug tracking-tight text-text-primary">
                {cat.name}
              </p>
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
                  variant="row"
                  size="row"
                  onClick={() => onEditCategory?.(cat)}
                  className="cursor-pointer"
                  title="Chỉnh sửa danh mục"
                  aria-label="Chỉnh sửa danh mục"
                >
                  <Pencil />
                </IconButton>

                {/* FR-MNU-01: không cho xoá danh mục còn món. Backend KHÔNG chặn —
                    deleteCategory soft-delete kéo theo toàn bộ món — nên chốt chặn ở đây.
                    Đếm theo TỔNG số món (kể cả món riêng chi nhánh) vì BE xoá cả chúng. */}
                <IconButton
                  type="button"
                  variant="row-danger"
                  size="row"
                  disabled={cat.totalDishCount > 0}
                  onClick={() => onDeleteCategory?.(cat)}
                  className="cursor-pointer"
                  title={
                    cat.totalDishCount > 0
                      ? buildBlockedDeleteHint(cat)
                      : "Xoá danh mục"
                  }
                  aria-label={
                    cat.totalDishCount > 0
                      ? buildBlockedDeleteHint(cat)
                      : `Xoá danh mục ${cat.name}`
                  }
                >
                  <Trash2 />
                </IconButton>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
