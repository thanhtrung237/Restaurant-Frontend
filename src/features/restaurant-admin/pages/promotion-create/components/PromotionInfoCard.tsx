import React from "react"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import type { PromotionApplyLevel } from "../types"

interface PromotionInfoCardProps {
  name: string
  onNameChange: (val: string) => void
  customerDescription: string
  onCustomerDescriptionChange: (val: string) => void
  applyLevel: PromotionApplyLevel
  onApplyLevelChange: (val: PromotionApplyLevel) => void
}

/**
 * Card "Thông tin chương trình"
 * Nguồn: QuanLy/Tạo khuyến mãi.png (Cột trái - Card 1)
 */
export const PromotionInfoCard: React.FC<PromotionInfoCardProps> = ({
  name,
  onNameChange,
  customerDescription,
  onCustomerDescriptionChange,
  applyLevel,
  onApplyLevelChange,
}) => {
  return (
    <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-5">
      <h2 className="text-base font-bold text-text-primary tracking-tight">
        Thông tin chương trình
      </h2>

      {/* Tên chương trình */}
      <FormField label="Tên chương trình" htmlFor="promo-name">
        <Input
          id="promo-name"
          value={name}
          onChange={(e) => onNameChange(e.target.value)}
          placeholder="Nhập tên chương trình khuyến mãi"
        />
      </FormField>

      {/* Mô tả hiển thị cho khách */}
      <FormField label="Mô tả hiển thị cho khách" htmlFor="promo-desc">
        <Input
          id="promo-desc"
          value={customerDescription}
          onChange={(e) => onCustomerDescriptionChange(e.target.value)}
          placeholder="Nhập mô tả hiển thị cho khách"
        />
      </FormField>

      {/* Cấp áp dụng (quyết định cách cộng dồn) */}
      <FormField label="Cấp áp dụng (quyết định cách cộng dồn)">
        <RadioGroup
          value={applyLevel}
          onValueChange={(val) => onApplyLevelChange(val as PromotionApplyLevel)}
          className="flex items-center gap-6 pt-1"
        >
          <div className="flex items-center gap-2">
            <RadioGroupItem value="dish" id="level-dish" className="cursor-pointer" />
            <label
              htmlFor="level-dish"
              className="text-sm font-medium text-text-primary cursor-pointer select-none"
            >
              Cấp món
            </label>
          </div>

          <div className="flex items-center gap-2">
            <RadioGroupItem value="order" id="level-order" className="cursor-pointer" />
            <label
              htmlFor="level-order"
              className="text-sm font-medium text-text-primary cursor-pointer select-none"
            >
              Cấp hóa đơn
            </label>
          </div>
        </RadioGroup>
      </FormField>
    </div>
  )
}
