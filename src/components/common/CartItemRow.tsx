import { Soup } from "lucide-react"
import { QuantityStepper } from "@/components/common/QuantityStepper"
import { cn } from "@/lib/utils"

export interface CartItemRowProps {
  id?: string | number
  name: string
  optionsText?: string
  price: string | number
  quantity: number
  imageUrl?: string
  onQuantityChange?: (quantity: number) => void
  onRemove?: () => void
  className?: string
}

export function CartItemRow({
  name,
  optionsText,
  price,
  quantity,
  imageUrl,
  onQuantityChange,
  className,
}: CartItemRowProps) {
  const formattedPrice = typeof price === "number" ? `${price.toLocaleString("vi-VN")}VND` : price

  return (
    <div
      className={cn(
        "flex items-center justify-between gap-3.5 rounded-card border border-border-default bg-surface-card p-3.5 transition-colors",
        className,
      )}
    >
      {/* Cột trái: Thumbnail & Thông tin */}
      <div className="flex min-w-0 flex-1 items-center gap-3">
        <div className="relative size-14 shrink-0 overflow-hidden rounded-md bg-surface-muted">
          {imageUrl ? (
            <img src={imageUrl} alt={name} className="size-full object-cover" />
          ) : (
            <div className="flex size-full items-center justify-center bg-surface-muted text-text-tertiary text-xs">
              <Soup aria-hidden="true" className="size-5" />
            </div>
          )}
        </div>

        <div className="min-w-0 flex-1 space-y-0.5">
          <h4 className="truncate text-sm font-bold text-text-primary">{name}</h4>
          {optionsText ? (
            <p className="truncate text-xs text-text-tertiary">{optionsText}</p>
          ) : null}
          <p className="text-sm font-bold text-brand-primary">{formattedPrice}</p>
        </div>
      </div>

      {/* Cột phải: Quantity Stepper */}
      <div className="shrink-0">
        <QuantityStepper
          value={quantity}
          onChange={onQuantityChange}
          min={0}
          max={99}
          variant="pill"
        />
      </div>
    </div>
  )
}
