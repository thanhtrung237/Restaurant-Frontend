import * as React from "react"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

export interface ChipProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  selected?: boolean
  label?: string
  icon?: LucideIcon
}

export function Chip({
  selected = false,
  label,
  icon: Icon,
  children,
  className,
  disabled,
  ...props
}: ChipProps) {
  return (
    <button
      type="button"
      disabled={disabled}
      aria-pressed={selected}
      className={cn(
        "inline-flex h-8 shrink-0 items-center justify-center gap-1.5 rounded-pill px-4 py-1.5 text-xs font-semibold transition-all outline-none",
        selected
          ? "bg-brand-primary text-text-on-brand shadow-xs"
          : "border border-border-default bg-surface-card text-text-secondary hover:border-border-strong hover:text-text-primary",
        disabled && "cursor-not-allowed opacity-50",
        className,
      )}
      {...props}
    >
      {Icon ? <Icon className="size-3.5" /> : null}
      {label ?? children}
    </button>
  )
}
