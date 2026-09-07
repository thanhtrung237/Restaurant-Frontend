import React from "react"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { PromotionTarget } from "../types"

interface PromotionConditionCardProps {
  applyTarget: PromotionTarget
  onApplyTargetChange: (val: PromotionTarget) => void
  minOrderValue: string
  onMinOrderValueChange: (val: string) => void
  minQuantity: string
  onMinQuantityChange: (val: string) => void
}

/**
 * Card "Điều kiện áp dụng"
 * Nguồn: QuanLy/Tạo khuyến mãi.png (Cột trái - Card 2)
 */
export const PromotionConditionCard: React.FC<PromotionConditionCardProps> = ({
  applyTarget,
  onApplyTargetChange,
  minOrderValue,
  onMinOrderValueChange,
  minQuantity,
  onMinQuantityChange,
}) => {
  return (
    <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-5">
      <h2 className="text-base font-bold text-text-primary tracking-tight">
        Điều kiện áp dụng
      </h2>

      {/* Áp cho */}
      <FormField label="Áp cho">
        <Select
          value={applyTarget}
          onValueChange={(val) => onApplyTargetChange(val as PromotionTarget)}
        >
          <SelectTrigger className="w-full h-11 cursor-pointer">
            <SelectValue placeholder="Chọn phạm vi áp dụng" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all_order" className="cursor-pointer">
              Toàn hóa đơn
            </SelectItem>
            <SelectItem value="category" className="cursor-pointer">
              Theo danh mục món ăn
            </SelectItem>
            <SelectItem value="specific_dish" className="cursor-pointer">
              Theo món ăn cụ thể
            </SelectItem>
          </SelectContent>
        </Select>
      </FormField>

      {/* Giá trị hóa đơn tối thiểu & Số lượng tối thiểu */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Giá trị hóa đơn tối thiểu" htmlFor="min-order-val">
          <Input
            id="min-order-val"
            value={minOrderValue}
            onChange={(e) => onMinOrderValueChange(e.target.value)}
            placeholder="0đ"
          />
        </FormField>

        <FormField label="Số lượng tối thiểu" htmlFor="min-quantity">
          <Input
            id="min-quantity"
            type="number"
            min={1}
            value={minQuantity}
            onChange={(e) => onMinQuantityChange(e.target.value)}
            placeholder="1"
          />
        </FormField>
      </div>
    </div>
  )
}
