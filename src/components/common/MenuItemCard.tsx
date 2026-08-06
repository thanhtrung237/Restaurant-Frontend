import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MenuItemCardProps {
  id?: string | number
  name: string
  description?: string
  price: string | number
  originalPrice?: string | number
  discountPercent?: number | string
  imageUrl?: string
  onAdd?: () => void
  onClick?: () => void
  className?: string
  disabled?: boolean
  /** Hiển thị nhãn "Hết hàng" (hoặc nhãn khác) thay cho nút thêm — dùng cho món đã hết ở chi nhánh này */
  outOfStockLabel?: string
}

/**
 * MenuItemCard — khớp component "Menu Item Card" trong UI Component (Figma):
 * Thẻ món ăn hiển thị ảnh, tên món, mô tả ngắn, giá bán, giá gốc giảm giá và nút thêm (+) màu cam.
 */
export function MenuItemCard({
  name,
  description,
  price,
  originalPrice,
  discountPercent,
  imageUrl,
  onAdd,
  onClick,
  className,
  disabled = false,
  outOfStockLabel,
}: MenuItemCardProps) {
  // Định dạng theo đúng quy ước tiền tệ dùng chung trong toàn app: "45.000đ" (không phải "VND")
  const formattedPrice =
    typeof price === "number" ? `${price.toLocaleString("vi-VN")}đ` : price

  const formattedOriginalPrice =
    originalPrice !== undefined
      ? typeof originalPrice === "number"
        ? `${originalPrice.toLocaleString("vi-VN")}đ`
        : originalPrice
      : null

  const isOutOfStock = Boolean(outOfStockLabel)

  return (
    <div
      onClick={isOutOfStock ? undefined : onClick}
      className={cn(
        "group relative flex items-center justify-between gap-3 rounded-[18px] bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all sm:gap-3.5",
        onClick && !isOutOfStock && "cursor-pointer hover:shadow-md",
        disabled && "opacity-60",
        isOutOfStock && "cursor-not-allowed",
        className
      )}
    >
      {/* Cột trái: Ảnh món & Thông tin */}
      <div className="flex min-w-0 flex-1 items-center gap-3.5">
        {/* Ảnh thumbnail */}
        <div className="relative size-[72px] shrink-0 overflow-hidden rounded-[14px] bg-[#F1F3F5]">
          {imageUrl ? (
            <img
              src={imageUrl}
              alt={name}
              className="size-full object-cover transition-transform group-hover:scale-105"
            />
          ) : (
            <div className="size-full bg-[#F1F3F5]" />
          )}
        </div>

        {/* Nội dung text */}
        <div className="min-w-0 flex-1">
          {isOutOfStock ? (
            <span className="mb-1 inline-block w-fit rounded-full bg-[#FEEDEC] px-2 py-0.5 text-[11px] font-bold text-[#F04438]">
              {outOfStockLabel}
            </span>
          ) : null}

          <h4 className="truncate text-sm font-bold text-text-primary sm:text-base">
            {name}
          </h4>
          {description ? (
            <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-text-tertiary">
              {description}
            </p>
          ) : null}

          {/* Dòng giá */}
          <div className="mt-1 flex items-baseline gap-2">
            <span className="text-sm font-bold text-brand-primary sm:text-base">
              {formattedPrice}
            </span>
            {formattedOriginalPrice ? (
              <span className="text-xs font-normal text-text-tertiary line-through">
                {formattedOriginalPrice}
              </span>
            ) : null}
            {discountPercent && !formattedOriginalPrice ? (
              <span className="rounded-pill bg-brand-primary-subtle px-1.5 py-0.5 text-[11px] font-bold text-brand-primary">
                {typeof discountPercent === "number" ? `-${discountPercent}%` : discountPercent}
              </span>
            ) : null}
          </div>
        </div>
      </div>

      {/* Cột phải: Nút thêm món */}
      {isOutOfStock ? (
        <div
          aria-hidden="true"
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-[#F1F3F5] text-[#868E96]/40 cursor-not-allowed"
        >
          <Plus className="size-4" strokeWidth={2.5} />
        </div>
      ) : onAdd ? (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation()
            onAdd()
          }}
          disabled={disabled}
          aria-label={`Thêm ${name}`}
          className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white shadow-xs transition-all hover:bg-brand-primary-hover active:scale-90 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-tertiary"
        >
          <Plus className="size-4 text-white" strokeWidth={2.5} />
        </button>
      ) : null}
    </div>
  )
}