import React, { useState, useMemo } from "react"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Badge } from "@/components/ui/badge"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import { Search, Info } from "lucide-react"
import type { PromotionApplyLevel, PromotionTarget } from "../types"
import type { Category, Dish } from "@/types/models"

interface PromotionConditionCardProps {
  applyLevel: PromotionApplyLevel
  applyTarget: PromotionTarget
  onApplyTargetChange: (val: PromotionTarget) => void
  selectedCategories: number[]
  onSelectedCategoriesChange: (ids: number[]) => void
  selectedDishes: number[]
  onSelectedDishesChange: (ids: number[]) => void
  minOrderValue: string
  onMinOrderValueChange: (val: string) => void
  minQuantity: string
  onMinQuantityChange: (val: string) => void
  categories?: Category[]
  isLoadingCategories?: boolean
  dishes?: Dish[]
  isLoadingDishes?: boolean
}

/**
 * Card 2: Điều kiện áp dụng
 * Tự động thay đổi theo Cấp MÓN (chọn danh mục/món, số lượng tối thiểu)
 * hoặc Cấp HÓA ĐƠN (cố định toàn hóa đơn, giá trị đơn tối thiểu).
 */
export const PromotionConditionCard: React.FC<PromotionConditionCardProps> = ({
  applyLevel,
  applyTarget,
  onApplyTargetChange,
  selectedCategories,
  onSelectedCategoriesChange,
  selectedDishes,
  onSelectedDishesChange,
  minOrderValue,
  onMinOrderValueChange,
  minQuantity,
  onMinQuantityChange,
  categories = [],
  isLoadingCategories = false,
  dishes = [],
  isLoadingDishes = false,
}) => {
  const [catSearch, setCatSearch] = useState("")
  const [dishSearch, setDishSearch] = useState("")

  // Filter categories
  const filteredCategories = useMemo(() => {
    if (!catSearch.trim()) return categories
    const q = catSearch.toLowerCase()
    return categories.filter((c) => c.name.toLowerCase().includes(q))
  }, [categories, catSearch])

  // Filter dishes
  const filteredDishes = useMemo(() => {
    if (!dishSearch.trim()) return dishes
    const q = dishSearch.toLowerCase()
    return dishes.filter(
      (d) => d.name.toLowerCase().includes(q) || d.categoryName?.toLowerCase().includes(q)
    )
  }, [dishes, dishSearch])

  const isDishLevel = applyLevel === "dish"

  const handleToggleCategory = (id: number) => {
    if (selectedCategories.includes(id)) {
      onSelectedCategoriesChange(selectedCategories.filter((item) => item !== id))
    } else {
      onSelectedCategoriesChange([...selectedCategories, id])
    }
  }

  const handleSelectAllCategories = () => {
    if (selectedCategories.length === categories.length) {
      onSelectedCategoriesChange([])
    } else {
      onSelectedCategoriesChange(categories.map((c) => c.id))
    }
  }

  const handleToggleDish = (id: number) => {
    if (selectedDishes.includes(id)) {
      onSelectedDishesChange(selectedDishes.filter((item) => item !== id))
    } else {
      onSelectedDishesChange([...selectedDishes, id])
    }
  }

  const handleSelectAllDishes = () => {
    if (selectedDishes.length === dishes.length) {
      onSelectedDishesChange([])
    } else {
      onSelectedDishesChange(dishes.map((d) => d.id))
    }
  }

  return (
    <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-text-primary tracking-tight">
          Điều kiện áp dụng
        </h2>
        <p className="text-xs text-text-tertiary">
          {isDishLevel
            ? "Xác định món ăn hoặc danh mục đủ điều kiện nhận khuyến mãi"
            : "Điều kiện áp dụng cho tổng giá trị hóa đơn"}
        </p>
      </div>

      {isDishLevel ? (
        // ================= CẤP MÓN =================
        <div className="space-y-4">
          <FormField label="Áp dụng cho" required>
            <Select
              value={applyTarget}
              onValueChange={(val) => onApplyTargetChange(val as PromotionTarget)}
            >
              <SelectTrigger className="w-full h-11 cursor-pointer">
                <SelectValue placeholder="Chọn phạm vi món" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all_order" className="cursor-pointer">
                  Tất cả món ăn trong thực đơn
                </SelectItem>
                <SelectItem value="category" className="cursor-pointer">
                  Theo danh mục món ăn (chọn nhiều)
                </SelectItem>
                <SelectItem value="specific_dish" className="cursor-pointer">
                  Theo món ăn cụ thể (chọn nhiều)
                </SelectItem>
              </SelectContent>
            </Select>
          </FormField>

          {/* Chọn danh mục */}
          {applyTarget === "category" && (
            <div className="rounded-xl border border-border-default p-4 bg-surface-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">
                    Danh mục áp dụng
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedCategories.length} đã chọn
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllCategories}
                  className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                >
                  {selectedCategories.length === categories.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
              </div>

              {/* Ô tìm kiếm danh mục */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-tertiary" />
                <Input
                  value={catSearch}
                  onChange={(e) => setCatSearch(e.target.value)}
                  placeholder="Tìm danh mục..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Danh sách danh mục */}
              {isLoadingCategories ? (
                <div className="py-4 text-center text-xs text-text-tertiary">Đang tải danh mục...</div>
              ) : categories.length === 0 ? (
                <div className="py-4 text-center text-xs text-text-tertiary">Chưa có danh mục nào</div>
              ) : (
                <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                  {filteredCategories.map((cat) => {
                    const isChecked = selectedCategories.includes(cat.id)
                    return (
                      <label
                        key={cat.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-card transition-colors cursor-pointer border border-transparent hover:border-border-default text-xs"
                      >
                        <div className="flex items-center gap-2.5">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleCategory(cat.id)}
                          />
                          <span className="font-medium text-text-primary">{cat.name}</span>
                        </div>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Chọn món cụ thể */}
          {applyTarget === "specific_dish" && (
            <div className="rounded-xl border border-border-default p-4 bg-surface-muted/20 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-semibold text-text-primary">
                    Món ăn áp dụng
                  </span>
                  <Badge variant="secondary" className="text-xs">
                    {selectedDishes.length} đã chọn
                  </Badge>
                </div>
                <button
                  type="button"
                  onClick={handleSelectAllDishes}
                  className="text-xs font-semibold text-brand-primary hover:underline cursor-pointer"
                >
                  {selectedDishes.length === dishes.length ? "Bỏ chọn tất cả" : "Chọn tất cả"}
                </button>
              </div>

              {/* Ô tìm kiếm món */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-tertiary" />
                <Input
                  value={dishSearch}
                  onChange={(e) => setDishSearch(e.target.value)}
                  placeholder="Tìm theo tên món hoặc danh mục..."
                  className="pl-9 h-9 text-xs"
                />
              </div>

              {/* Danh sách món */}
              {isLoadingDishes ? (
                <div className="py-4 text-center text-xs text-text-tertiary">Đang tải món...</div>
              ) : dishes.length === 0 ? (
                <div className="py-4 text-center text-xs text-text-tertiary">Chưa có món ăn nào</div>
              ) : (
                <div className="max-h-52 overflow-y-auto space-y-1 pr-1">
                  {filteredDishes.map((dish) => {
                    const isChecked = selectedDishes.includes(dish.id)
                    return (
                      <label
                        key={dish.id}
                        className="flex items-center justify-between p-2 rounded-lg hover:bg-surface-card transition-colors cursor-pointer border border-transparent hover:border-border-default text-xs"
                      >
                        <div className="flex items-center gap-2.5 min-w-0">
                          <Checkbox
                            checked={isChecked}
                            onCheckedChange={() => handleToggleDish(dish.id)}
                          />
                          <span className="font-medium text-text-primary truncate">{dish.name}</span>
                          {dish.categoryName && (
                            <span className="text-[11px] text-text-tertiary bg-surface-muted px-1.5 py-0.5 rounded">
                              {dish.categoryName}
                            </span>
                          )}
                        </div>
                        <span className="shrink-0 text-text-secondary font-semibold ml-2">
                          {dish.basePrice?.toLocaleString("vi-VN")}đ
                        </span>
                      </label>
                    )
                  })}
                </div>
              )}
            </div>
          )}

          {/* Số lượng tối thiểu */}
          <FormField
            label="Số lượng món tối thiểu"
            htmlFor="min-quantity"
            helperText="Khách phải gọi từ số lượng này trở lên để nhận khuyến mãi (mặc định: 1)"
          >
            <Input
              id="min-quantity"
              type="number"
              min={1}
              value={minQuantity}
              onChange={(e) => onMinQuantityChange(e.target.value)}
              placeholder="VD: 1 hoặc 2"
            />
          </FormField>
        </div>
      ) : (
        // ================= CẤP HÓA ĐƠN =================
        <div className="space-y-4">
          <div className="flex items-start gap-2.5 p-3.5 rounded-xl bg-surface-muted/40 border border-border-default text-xs text-text-secondary">
            <Info className="size-4 text-brand-primary shrink-0 mt-0.5" />
            <p>
              Khuyến mãi cấp Hóa đơn được áp dụng cho <strong className="text-text-primary">toàn bộ hóa đơn</strong> sau khi đã tính các khuyến mãi cấp món (nếu có).
            </p>
          </div>

          <FormField
            label="Giá trị hóa đơn tối thiểu"
            htmlFor="min-order-val"
            helperText="Hóa đơn phải đạt từ số tiền này trở lên để được giảm giá (để trống hoặc 0đ nếu không yêu cầu)"
          >
            <Input
              id="min-order-val"
              value={minOrderValue}
              onChange={(e) => onMinOrderValueChange(e.target.value)}
              placeholder="VD: 200.000đ"
            />
          </FormField>
        </div>
      )}
    </div>
  )
}
