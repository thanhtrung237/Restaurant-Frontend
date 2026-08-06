import { Minus, Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface QuantityStepperProps {
  value: number
  onChange?: (value: number) => void
  min?: number
  max?: number
  step?: number
  disabled?: boolean
  readOnly?: boolean
  className?: string
  /** Kiểu pill có viền bao ngoài như trong Cart Item Row, hoặc minimal chỉ có nút và số */
  variant?: "pill" | "simple"
}

/**
 * QuantityStepper — khớp component "Quantity Stepper" trong UI Component (Figma):
 * Hiển thị nút giảm (-), số lượng hiện tại và nút tăng (+) màu cam brand/primary (#F0522B).
 */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max = 99,
  step = 1,
  disabled = false,
  readOnly = false,
  className,
  variant = "pill",
}: QuantityStepperProps) {
  function handleDecrement() {
    if (disabled || readOnly || value <= min) return
    onChange?.(Math.max(min, value - step))
  }

  function handleIncrement() {
    if (disabled || readOnly || value >= max) return
    onChange?.(Math.min(max, value + step))
  }

  const isMin = value <= min
  const isMax = value >= max

  if (variant === "simple") {
    return (
      <div className={cn("inline-flex items-center gap-3 select-none", className)}>
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || isMin}
          aria-label="Giảm số lượng"
          className="flex size-7 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-text-tertiary"
        >
          <Minus className="size-3.5" />
        </button>
        <span className="min-w-5 text-center text-sm font-bold text-text-primary">
          {value}
        </span>
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || isMax}
          aria-label="Tăng số lượng"
          className="flex size-7 items-center justify-center rounded-full font-bold text-brand-primary transition-colors hover:bg-brand-primary-subtle disabled:cursor-not-allowed disabled:text-text-tertiary"
        >
          <Plus className="size-3.5" />
        </button>
      </div>
    )
  }

  return (
    <div
      className={cn(
        "inline-flex h-8 items-center gap-2.5 rounded-pill border border-border-default bg-surface-card px-2.5 py-1 select-none shadow-2xs",
        disabled && "opacity-50 cursor-not-allowed",
        readOnly && "cursor-default",
        className
      )}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || readOnly || isMin}
        aria-label="Giảm số lượng"
        className={cn(
          "flex size-5 items-center justify-center text-text-secondary transition-colors",
          readOnly ? "cursor-default text-text-tertiary" : "hover:text-text-primary disabled:cursor-not-allowed disabled:text-text-tertiary"
        )}
      >
        <Minus className="size-3" strokeWidth={2.5} />
      </button>
      <span className="min-w-4 text-center text-sm font-bold text-text-primary">
        {value}
      </span>
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || readOnly || isMax}
        aria-label="Tăng số lượng"
        className={cn(
          "flex size-5 items-center justify-center font-bold text-brand-primary transition-colors",
          readOnly ? "cursor-default text-brand-primary/60" : "hover:text-brand-primary-hover disabled:cursor-not-allowed disabled:text-text-tertiary"
        )}
      >
        <Plus className="size-3" strokeWidth={3} />
      </button>
    </div>
  )
}
