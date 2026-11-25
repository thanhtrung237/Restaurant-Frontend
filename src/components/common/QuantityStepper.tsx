import { useState } from "react"
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
  /** Khi có nhãn, số lượng có thể nhập trực tiếp. */
  inputLabel?: string
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
  inputLabel,
  variant = "pill",
}: QuantityStepperProps) {
  const [isInputEmpty, setInputEmpty] = useState(false)
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
  const editable = Boolean(inputLabel) && !readOnly && Boolean(onChange)
  const quantity = editable ? (
    <input
      type="text"
      inputMode="numeric"
      aria-label={inputLabel}
      autoComplete="off"
      value={isInputEmpty ? "" : value}
      disabled={disabled}
      onFocus={(event) => event.currentTarget.select()}
      onBlur={() => setInputEmpty(false)}
      onKeyDown={(event) => {
        if (event.key === "Enter") {
          event.preventDefault()
          event.currentTarget.blur()
        }
      }}
      onChange={(event) => {
        const text = event.currentTarget.value
        if (!/^\d*$/.test(text)) return
        setInputEmpty(text === "")
        if (text) onChange?.(Math.min(max, Math.max(min, Number(text))))
      }}
      className={cn(
        "w-14 rounded-md border border-border-strong bg-surface-card text-center text-sm font-bold tabular-nums text-text-primary outline-none focus:border-brand-primary focus:ring-2 focus:ring-brand-primary/30",
        variant === "simple" ? "h-9" : "h-6",
      )}
    />
  ) : (
    <span
      className={cn(
        "text-center text-sm font-bold text-text-primary",
        variant === "simple" ? "min-w-5" : "min-w-4",
      )}
    >
      {value}
    </span>
  )

  if (variant === "simple") {
    return (
      <div
        className={cn(
          "inline-flex items-center select-none",
          editable ? "shrink-0 gap-1.5" : "gap-3",
          className,
        )}
      >
        <button
          type="button"
          onClick={handleDecrement}
          disabled={disabled || isMin}
          aria-label="Giảm số lượng"
          className={cn(
            "flex items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:text-text-tertiary",
            editable ? "size-9" : "size-7",
          )}
        >
          <Minus className="size-3.5" />
        </button>
        {quantity}
        <button
          type="button"
          onClick={handleIncrement}
          disabled={disabled || isMax}
          aria-label="Tăng số lượng"
          className={cn(
            "flex items-center justify-center rounded-full font-bold text-brand-primary transition-colors hover:bg-brand-primary-subtle disabled:cursor-not-allowed disabled:text-text-tertiary",
            editable ? "size-9" : "size-7",
          )}
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
        className,
      )}
    >
      <button
        type="button"
        onClick={handleDecrement}
        disabled={disabled || readOnly || isMin}
        aria-label="Giảm số lượng"
        className={cn(
          "flex size-5 items-center justify-center text-text-secondary transition-colors",
          readOnly
            ? "cursor-default text-text-tertiary"
            : "hover:text-text-primary disabled:cursor-not-allowed disabled:text-text-tertiary",
        )}
      >
        <Minus className="size-3" strokeWidth={2.5} />
      </button>
      {quantity}
      <button
        type="button"
        onClick={handleIncrement}
        disabled={disabled || readOnly || isMax}
        aria-label="Tăng số lượng"
        className={cn(
          "flex size-5 items-center justify-center font-bold text-brand-primary transition-colors",
          readOnly
            ? "cursor-default text-brand-primary/60"
            : "hover:text-brand-primary-hover disabled:cursor-not-allowed disabled:text-text-tertiary",
        )}
      >
        <Plus className="size-3" strokeWidth={3} />
      </button>
    </div>
  )
}
