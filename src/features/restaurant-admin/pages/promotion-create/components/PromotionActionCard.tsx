import React, { useEffect } from "react"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectTrigger,
  SelectValue,
  SelectContent,
  SelectItem,
} from "@/components/ui/select"
import type { PromotionActionType, PromotionApplyLevel } from "../types"

interface PromotionActionCardProps {
  applyLevel: PromotionApplyLevel
  actionType: PromotionActionType
  onActionTypeChange: (val: PromotionActionType) => void
  discountValue: string
  onDiscountValueChange: (val: string) => void
  buyQty: string
  onBuyQtyChange: (val: string) => void
  getQty: string
  onGetQtyChange: (val: string) => void
}

/**
 * Card 3: Hành động giảm giá
 * Thay đổi theo Cấp Món (giảm %, giảm số tiền món, Mua X tặng Y)
 * hoặc Cấp Hóa đơn (giảm % hóa đơn, giảm số tiền hóa đơn).
 */
export const PromotionActionCard: React.FC<PromotionActionCardProps> = ({
  applyLevel,
  actionType,
  onActionTypeChange,
  discountValue,
  onDiscountValueChange,
  buyQty,
  onBuyQtyChange,
  getQty,
  onGetQtyChange,
}) => {
  const isDishLevel = applyLevel === "dish"

  // Cấp hóa đơn không có gift_dish: tự chuyển sang fixed_amount nếu đang ở gift_dish
  useEffect(() => {
    if (!isDishLevel && actionType === "gift_dish") {
      onActionTypeChange("fixed_amount")
    }
  }, [isDishLevel, actionType, onActionTypeChange])

  return (
    <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-5">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-text-primary tracking-tight">
          Hành động giảm giá
        </h2>
        <p className="text-xs text-text-tertiary">
          {isDishLevel
            ? "Mức ưu đãi áp dụng trên đơn giá của món ăn đủ điều kiện"
            : "Mức ưu đãi áp dụng trên tổng hóa đơn"}
        </p>
      </div>

      <div className="space-y-4">
        {/* Loại hành động */}
        <FormField label="Hình thức giảm" required>
          <Select
            value={actionType}
            onValueChange={(val) => onActionTypeChange(val as PromotionActionType)}
          >
            <SelectTrigger className="w-full h-11 cursor-pointer">
              <SelectValue placeholder="Chọn hình thức giảm" />
            </SelectTrigger>
            <SelectContent>
              {isDishLevel ? (
                <>
                  <SelectItem value="percentage" className="cursor-pointer">
                    Giảm theo % món ăn
                  </SelectItem>
                  <SelectItem value="fixed_amount" className="cursor-pointer">
                    Giảm số tiền cố định theo món ăn (VNĐ)
                  </SelectItem>
                  <SelectItem value="gift_dish" className="cursor-pointer">
                    Mua X tặng Y (Combo tặng món)
                  </SelectItem>
                </>
              ) : (
                <>
                  <SelectItem value="percentage" className="cursor-pointer">
                    Giảm theo % toàn hóa đơn
                  </SelectItem>
                  <SelectItem value="fixed_amount" className="cursor-pointer">
                    Giảm số tiền cố định toàn hóa đơn (VNĐ)
                  </SelectItem>
                </>
              )}
            </SelectContent>
          </Select>
        </FormField>

        {/* Các ô nhập tương ứng */}
        {actionType === "gift_dish" && isDishLevel ? (
          <div className="rounded-xl border border-brand-primary/20 bg-brand-primary-subtle/20 p-4 space-y-3">
            <span className="text-xs font-semibold text-brand-primary block">
              Cấu hình Mua X tặng Y
            </span>
            <div className="grid grid-cols-2 gap-4">
              <FormField label="Số lượng mua (X)" htmlFor="buy-qty" required>
                <Input
                  id="buy-qty"
                  type="number"
                  min={1}
                  value={buyQty}
                  onChange={(e) => onBuyQtyChange(e.target.value)}
                  placeholder="2"
                />
              </FormField>

              <FormField label="Số lượng tặng (Y)" htmlFor="get-qty" required>
                <Input
                  id="get-qty"
                  type="number"
                  min={1}
                  value={getQty}
                  onChange={(e) => onGetQtyChange(e.target.value)}
                  placeholder="1"
                />
              </FormField>
            </div>
            <p className="text-xs text-text-tertiary">
              Khách gọi đủ {Number(buyQty) || 2} + {Number(getQty) || 1} món thì {Number(getQty) || 1} món sẽ được miễn phí (giảm 100% giá {Number(getQty) || 1} món).
            </p>
          </div>
        ) : actionType === "percentage" ? (
          <FormField
            label="Tỷ lệ giảm (%)"
            htmlFor="discount-pct"
            required
            helperText="Từ 1% đến 100%"
          >
            <div className="relative">
              <Input
                id="discount-pct"
                type="number"
                min={1}
                max={100}
                value={discountValue}
                onChange={(e) => onDiscountValueChange(e.target.value)}
                placeholder="VD: 15"
                className="pr-9"
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-sm font-semibold text-text-tertiary">
                %
              </span>
            </div>
          </FormField>
        ) : (
          <FormField
            label="Số tiền giảm (VNĐ)"
            htmlFor="discount-val"
            required
            helperText="Nhập số tiền giảm bằng VNĐ (hệ thống tự chặn không giảm vượt quá tiền món/hóa đơn)"
          >
            <Input
              id="discount-val"
              value={discountValue}
              onChange={(e) => onDiscountValueChange(e.target.value)}
              placeholder="VD: 20.000đ"
            />
          </FormField>
        )}
      </div>
    </div>
  )
}
