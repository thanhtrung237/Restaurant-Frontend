import * as React from "react"
import { Search, X } from "lucide-react"
import { cn } from "@/lib/utils"

export interface SearchInputProps extends Omit<
  React.InputHTMLAttributes<HTMLInputElement>,
  "size"
> {
  onClear?: () => void
  variant?: "pill" | "rounded"
  size?: "sm" | "default" | "lg"
}

/**
 * SearchInput — khớp component "Search" trong UI Component (Figma):
 * Ô tìm kiếm bo tròn dáng pill, nền surface/muted (#F1F3F5), icon kính lúp bên trái,
 * placeholder "Tìm kiếm..." màu text/tertiary.
 */
export const SearchInput = React.forwardRef<HTMLInputElement, SearchInputProps>(
  (
    {
      className,
      value,
      onChange,
      onClear,
      placeholder = "Tìm kiếm...",
      variant = "pill",
      size = "default",
      ...props
    },
    ref,
  ) => {
    const hasValue = value !== undefined && value !== ""

    const sizeClasses = {
      sm: "h-8 text-xs pl-8 pr-7",
      default: "h-10 text-sm pl-9 pr-8",
      lg: "h-12 text-base pl-11 pr-10",
    }

    const iconSizes = {
      sm: "size-3.5 left-2.5",
      default: "size-4 left-3",
      lg: "size-5 left-3.5",
    }

    return (
      <div className="relative flex w-full items-center">
        <Search
          className={cn("pointer-events-none absolute text-text-tertiary", iconSizes[size])}
        />
        <input
          ref={ref}
          type="text"
          value={value}
          onChange={onChange}
          placeholder={placeholder}
          className={cn(
            "w-full bg-surface-muted text-text-primary placeholder:text-text-tertiary transition-all outline-none",
            "focus:bg-surface-card focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary border border-transparent",
            variant === "pill" ? "rounded-pill" : "rounded-md",
            sizeClasses[size],
            className,
          )}
          {...props}
        />
        {hasValue && onClear ? (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2.5 flex size-5 items-center justify-center rounded-full text-text-tertiary hover:bg-surface-muted hover:text-text-primary"
            aria-label="Xóa nội dung tìm kiếm"
          >
            <X className="size-3" />
          </button>
        ) : null}
      </div>
    )
  },
)
SearchInput.displayName = "SearchInput"
