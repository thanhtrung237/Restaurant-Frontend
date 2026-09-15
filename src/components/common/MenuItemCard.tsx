import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MenuItemCardProps {
  id?: string | number
  name: string
  description?: string
  price: string | number
  originalPrice?: string | number
  discountPercent?: number | string
  /** Tên chương trình khuyến mãi — hiển thị nhãn nhỏ dưới giá (vd: "Combo trưa -20%") */
  promotionLabel?: string
  imageUrl?: string
  onAdd?: () => void
  onClick?: () => void
  className?: string
  /**
   * Khoá nút thêm món (và làm mờ thẻ). Dùng khi phiên đã yêu cầu tính tiền — xem QĐ-09.
   * Mặc định `false` nên các màn khác dùng thẻ này không đổi hành vi.
   */
  disabled?: boolean
  /** Chú thích hiện khi rê vào nút bị khoá — nói lý do, không để người dùng đoán. */
  disabledReason?: string
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
  promotionLabel,
  imageUrl,
  onAdd,
  onClick,
  className,
  disabled = false,
  disabledReason,
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

  return (
    <div
      onClick={onClick}
      className={cn(
        "group relative flex items-center justify-between gap-3 rounded-[18px] bg-white p-3.5 shadow-[0_2px_8px_rgba(0,0,0,0.02)] transition-all sm:gap-3.5",
        onClick && "cursor-pointer hover:shadow-md",
        disabled && "opacity-60",
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
          {/* Nhãn tên chương trình KM — chỉ hiện khi còn lượt (BE filter sẵn) */}
          {promotionLabel ? (
            <div className="mt-1 inline-flex items-center gap-1 rounded-full bg-status-success-subtle px-2 py-0.5">
              <span className="text-[10px] font-bold text-status-success">🏷 {promotionLabel}</span>
            </div>
          ) : null}
        </div>
      </div>

      {/*
        Cột phải: Nút thêm món.
        `title` đặt ở thẻ bọc vì nút đang `disabled` thì trình duyệt không hiện tooltip của chính nó.
      */}
      {onAdd ? (
        <span
          title={disabled ? disabledReason : undefined}
          className="inline-flex shrink-0"
          onClick={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              onAdd()
            }}
            disabled={disabled}
            aria-label={disabled && disabledReason ? `Thêm ${name} — ${disabledReason}` : `Thêm ${name}`}
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-brand-primary text-white shadow-xs transition-all hover:bg-brand-primary-hover active:scale-90 disabled:cursor-not-allowed disabled:bg-surface-muted disabled:text-text-tertiary"
          >
            {/* `currentColor` để icon xám theo nút khi bị khoá — tô trắng cứng thì nền xám + icon trắng gần như vô hình */}
            <Plus className="size-4" strokeWidth={2.5} />
          </button>
        </span>
      ) : null}
    </div>
  )
}