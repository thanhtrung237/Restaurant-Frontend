import React from "react"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
import { Utensils, Receipt } from "lucide-react"
import { cn } from "@/lib/utils"
import type { PromotionApplyLevel } from "../types"

interface PromotionInfoCardProps {
  name: string
  onNameChange: (val: string) => void
  customerDescription: string
  onCustomerDescriptionChange: (val: string) => void
  applyLevel: PromotionApplyLevel
  onApplyLevelChange: (val: PromotionApplyLevel) => void
  code: string
  onCodeChange: (val: string) => void
  usageLimit: string
  onUsageLimitChange: (val: string) => void
}

/**
 * Card 1: Thông tin chương trình & Cấp áp dụng (BR-22)
 * Cấp áp dụng được chọn đầu tiên vì nó quyết định các điều kiện & hành động bên dưới.
 */
export const PromotionInfoCard: React.FC<PromotionInfoCardProps> = ({
  name,
  onNameChange,
  customerDescription,
  onCustomerDescriptionChange,
  applyLevel,
  onApplyLevelChange,
  code,
  onCodeChange,
  usageLimit,
  onUsageLimitChange,
}) => {
  return (
    <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-6">
      <div className="space-y-1">
        <h2 className="text-base font-bold text-text-primary tracking-tight">
          Cấp chương trình & Thông tin cơ bản
        </h2>
        <p className="text-xs text-text-tertiary">
          Chọn cấp áp dụng trước để hệ thống cấu hình các điều kiện và hành động phù hợp
        </p>
      </div>

      {/* 1. Chọn CẤP ÁP DỤNG lên đầu tiên dưới dạng 2 thẻ lớn */}
      <div className="space-y-2">
        <label className="text-sm font-semibold text-text-primary">
          Cấp áp dụng <span className="text-status-danger">*</span>
        </label>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {/* Option: Cấp Món */}
          <button
            type="button"
            onClick={() => onApplyLevelChange("dish")}
            className={cn(
              "flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer relative",
              applyLevel === "dish"
                ? "border-brand-primary bg-brand-primary-subtle/30 ring-2 ring-brand-primary/20 shadow-xs"
                : "border-border-default bg-surface-card hover:border-border-strong hover:bg-surface-muted/30",
            )}
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  applyLevel === "dish"
                    ? "bg-brand-primary text-white"
                    : "bg-surface-muted text-text-secondary",
                )}
              >
                <Utensils className="size-4" />
              </span>
              <span className="font-bold text-sm text-text-primary">Cấp Món</span>
            </div>
            <p className="text-xs text-text-tertiary leading-relaxed">
              Áp dụng cho món ăn hoặc danh mục. Hỗ trợ giảm %, số tiền hoặc Mua X tặng Y.
            </p>
          </button>

          {/* Option: Cấp Hóa đơn */}
          <button
            type="button"
            onClick={() => onApplyLevelChange("order")}
            className={cn(
              "flex flex-col items-start p-4 rounded-xl border text-left transition-all cursor-pointer relative",
              applyLevel === "order"
                ? "border-brand-primary bg-brand-primary-subtle/30 ring-2 ring-brand-primary/20 shadow-xs"
                : "border-border-default bg-surface-card hover:border-border-strong hover:bg-surface-muted/30",
            )}
          >
            <div className="flex items-center gap-2.5 mb-1.5">
              <span
                className={cn(
                  "flex size-8 shrink-0 items-center justify-center rounded-lg",
                  applyLevel === "order"
                    ? "bg-brand-primary text-white"
                    : "bg-surface-muted text-text-secondary",
                )}
              >
                <Receipt className="size-4" />
              </span>
              <span className="font-bold text-sm text-text-primary">Cấp Hóa đơn</span>
            </div>
            <p className="text-xs text-text-tertiary leading-relaxed">
              Áp dụng cho toàn bộ hóa đơn khi tổng tiền hàng đạt giá trị tối thiểu.
            </p>
          </button>
        </div>
      </div>

      <div className="border-t border-border-default/60 pt-4 space-y-4">
        {/* Tên chương trình */}
        <FormField label="Tên chương trình" htmlFor="promo-name" required>
          <Input
            id="promo-name"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="VD: Giảm 20% Khai trương / Combo Mua 2 Tặng 1"
          />
        </FormField>

        {/* Mô tả hiển thị cho khách */}
        <FormField
          label="Mô tả hiển thị cho khách"
          htmlFor="promo-desc"
          helperText="Hiển thị dưới tên chương trình trên thực đơn hoặc hóa đơn"
        >
          <Input
            id="promo-desc"
            value={customerDescription}
            onChange={(e) => onCustomerDescriptionChange(e.target.value)}
            placeholder="VD: Áp dụng từ 11:00 đến 14:00 các ngày trong tuần"
          />
        </FormField>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Mã khuyến mãi */}
          <FormField
            label="Mã khuyến mãi (Tùy chọn)"
            htmlFor="promo-code"
            helperText="Dùng để nhận diện chương trình. Hệ thống tự áp dụng khi đủ điều kiện."
          >
            <Input
              id="promo-code"
              value={code}
              onChange={(e) => onCodeChange(e.target.value.toUpperCase())}
              placeholder="VD: SUMMER2026"
              maxLength={50}
            />
          </FormField>

          {/* Giới hạn lượt sử dụng */}
          <FormField
            label="Giới hạn lượt sử dụng"
            htmlFor="promo-usage-limit"
            helperText="Để trống để không giới hạn"
          >
            <Input
              id="promo-usage-limit"
              type="number"
              min="0"
              value={usageLimit}
              onChange={(e) => onUsageLimitChange(e.target.value)}
              placeholder="VD: 500"
            />
          </FormField>
        </div>
      </div>
    </div>
  )
}
