import React, { useState, useMemo } from "react"
import { Pencil, Utensils } from "lucide-react"
import { Chip } from "@/components/common/Chip"
import { Switch } from "@/components/ui/switch"
import { IconButton } from "@/components/ui/icon-button"
import {
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
} from "@/components/ui/table"
import type { DishItem } from "../types"

interface MonTabProps {
  dishes: DishItem[]
  searchTerm: string
  /** Tên danh mục lấy từ API, KHÔNG hard-code (FR-MNU-01: danh mục cấp nhà hàng). */
  categoryNames: string[]
  onToggleStatus?: (dishId: number, newStatus: boolean) => void
  onEditDish?: (dish: DishItem) => void
}

/** Nhãn chip "tất cả" — không phải tên danh mục thật. */
const ALL_CATEGORIES = "Tất cả"

/**
 * Tab "Món" — Quản lý danh sách món ăn gốc
 * Chuẩn theo file: QuanLy/Quản lý thực đơn.png
 */
export const MonTab: React.FC<MonTabProps> = ({
  dishes,
  searchTerm,
  categoryNames,
  onToggleStatus,
  onEditDish,
}) => {
  const [selectedCategory, setSelectedCategory] = useState(ALL_CATEGORIES)
  const categoryChips = useMemo(
    () => [ALL_CATEGORIES, ...categoryNames],
    [categoryNames],
  )

  // Lọc món theo danh mục và từ khoá tìm kiếm
  const filteredDishes = useMemo(() => {
    return dishes.filter((dish) => {
      // 1. Lọc theo danh mục
      if (selectedCategory !== ALL_CATEGORIES && dish.category !== selectedCategory) {
        return false
      }
      // 2. Lọc theo từ khoá
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase().trim()
        const matchName = dish.name.toLowerCase().includes(q)
        const matchDesc = dish.description?.toLowerCase().includes(q) || false
        const matchCat = dish.category.toLowerCase().includes(q)
        if (!matchName && !matchDesc && !matchCat) return false
      }
      return true
    })
  }, [dishes, selectedCategory, searchTerm])

  const formatPrice = (val: number) => {
    return `${val.toLocaleString("vi-VN")}đ`
  }

  return (
    <div className="space-y-4 pt-1">
      {/* 1. Thanh lọc Chip theo danh mục */}
      <div className="flex flex-wrap items-center gap-2">
        {categoryChips.map((cat) => (
          <Chip
            key={cat}
            selected={selectedCategory === cat}
            onClick={() => setSelectedCategory(cat)}
            className="cursor-pointer text-xs"
          >
            {cat}
          </Chip>
        ))}
      </div>

      {/* 2. Bảng hiển thị danh sách món ăn */}
      <div className="overflow-hidden rounded-card border border-border-default bg-surface-card shadow-2xs">
        <Table>
          <TableHeader>
            <TableRow className="bg-surface-muted/40 hover:bg-surface-muted/40 border-b border-border-default">
              <TableHead className="py-3.5 pl-6 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                MÓN
              </TableHead>
              <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                DANH MỤC
              </TableHead>
              <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                GIÁ
              </TableHead>
              <TableHead className="py-3.5 px-4 text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                TRẠNG THÁI
              </TableHead>
              <TableHead className="py-3.5 pr-6 pl-4 text-right text-[11px] font-bold tracking-wider text-text-tertiary uppercase">
                <span className="sr-only">Thao tác</span>
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredDishes.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-12 text-center text-text-tertiary">
                  Không tìm thấy món ăn nào phù hợp với bộ lọc
                </TableCell>
              </TableRow>
            ) : (
              filteredDishes.map((dish) => (
                <TableRow
                  key={dish.id}
                  className="hover:bg-surface-muted/30 transition-colors border-b border-border-default last:border-b-0"
                >
                  {/* Cột Món: Thumbnail + Tên + Mô tả ngắn */}
                  <TableCell className="py-3.5 pl-6">
                    <div className="flex items-center gap-3">
                      <div className="size-10 shrink-0 rounded-lg bg-surface-muted flex items-center justify-center text-text-tertiary">
                        <Utensils className="size-5 stroke-[1.75]" />
                      </div>
                      <div>
                        <p className="font-semibold text-text-primary text-sm tracking-tight leading-snug">
                          {dish.name}
                        </p>
                        {dish.description ? (
                          <p className="text-xs text-text-tertiary mt-0.5">
                            {dish.description}
                          </p>
                        ) : null}
                      </div>
                    </div>
                  </TableCell>

                  {/* Cột Danh mục */}
                  <TableCell className="py-3.5 px-4 text-sm text-text-secondary">
                    {dish.category}
                  </TableCell>

                  {/* Cột Giá */}
                  <TableCell className="py-3.5 px-4 text-sm font-bold text-text-primary">
                    {formatPrice(dish.price)}
                  </TableCell>

                  {/* Cột Trạng thái: Đang bán / Ngừng bán (DishStatus cấp NHÀ HÀNG).
                      KHÁC với "Còn hàng / Hết hàng" của Menu chi nhánh — cái đó là
                      BranchDishStock theo từng chi nhánh (FR-MNU-03). */}
                  <TableCell className="py-3.5 px-4">
                    <div className="flex items-center gap-2.5">
                      <Switch
                        checked={dish.isAvailable}
                        onCheckedChange={(checked) => onToggleStatus?.(dish.id, checked)}
                        className="cursor-pointer data-[state=checked]:bg-status-success"
                      />
                      <span
                        className={`text-sm font-medium ${
                          dish.isAvailable ? "text-status-success" : "text-text-tertiary"
                        }`}
                      >
                        {dish.isAvailable ? "Đang bán" : "Ngừng bán"}
                      </span>
                    </div>
                  </TableCell>

                  {/* Cột Thao tác: CHỈ Sửa.
                      KHÔNG có "Xoá món" — FR-MNU-02: "Món đã từng lên hóa đơn ở BẤT KỲ
                      chi nhánh nào KHÔNG xóa, chỉ ngừng bán". FE không biết món đã lên
                      hoá đơn chưa và BE cũng không chặn, nên bỏ hẳn khỏi thao tác thường
                      ngày; dùng công tắc Ngừng bán / Bán lại ở cột Trạng thái. */}
                  <TableCell className="py-3.5 pr-6 pl-4 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton
                        type="button"
                        variant="row"
                        size="row"
                        onClick={() => onEditDish?.(dish)}
                        className="cursor-pointer"
                        title="Chỉnh sửa món"
                        aria-label="Chỉnh sửa món"
                      >
                        <Pencil />
                      </IconButton>

                    </div>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
