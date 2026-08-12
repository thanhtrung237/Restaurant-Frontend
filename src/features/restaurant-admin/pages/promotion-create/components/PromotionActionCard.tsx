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
import type { PromotionActionType } from "../types"

interface PromotionActionCardProps {
  actionType: PromotionActionType
  onActionTypeChange: (val: PromotionActionType) => void
  discountValue: string
  onDiscountValueChange: (val: string) => void
}

/**
 * Card "Hành động"
 * Nguồn: QuanLy/Tạo khuyến mãi.png (Cột trái - Card 3)
 */
export const PromotionActionCard: React.FC<PromotionActionCardProps> = ({
  actionType,
  onActionTypeChange,
  discountValue,
  onDiscountValueChange,
}) => {
  return (
    <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-5">
      <h2 className="text-base font-bold text-text-primary tracking-tight">
        Hành động
      </h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Loại */}
        <FormField label="Loại">
          <Select
            value={actionType}
            onValueChange={(val) => onActionTypeChange(val as PromotionActionType)}
          >
            <SelectTrigger className="w-full h-11 cursor-pointer">
              <SelectValue placeholder="Chọn loại giảm" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="fixed_amount" className="cursor-pointer">
                Giảm số tiền theo hóa đơn
              </SelectItem>
              <SelectItem value="percentage" className="cursor-pointer">
                Giảm theo % hóa đơn
              </SelectItem>
              <SelectItem value="gift_dish" className="cursor-pointer">
                Tặng món ăn kèm
              </SelectItem>
            </SelectContent>
          </Select>
        </FormField>

        {/* Giá trị giảm */}
        <FormField label="Giá trị giảm" htmlFor="discount-val">
          <Input
            id="discount-val"
            value={discountValue}
            onChange={(e) => onDiscountValueChange(e.target.value)}
            placeholder="20.000đ"
          />
        </FormField>
      </div>
    </div>
  )
}
