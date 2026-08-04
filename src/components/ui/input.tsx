import * as React from "react"
import { cn } from "@/lib/utils"

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  error?: boolean | string
}

/**
 * Input — khớp component "Input" trong UI Component (Figma):
 * Radius 10px (rounded-token-md), border 1px border/default (#E9ECEF),
 * padding 12/16, text-text-primary, placeholder text-text-tertiary (#868E96),
 * Focus: viền brand/primary (#F0522B).
 * Error: viền status/danger (#F04438).
 * Disabled: nền surface/muted (#F1F3F5), text-text-tertiary.
 */
const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, error, disabled, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          "flex h-11 w-full rounded-md border border-border-default bg-surface-card px-4 py-2.5 text-sm text-text-primary placeholder:text-text-tertiary transition-colors outline-none",
          "focus:border-brand-primary focus:ring-1 focus:ring-brand-primary",
          "disabled:cursor-not-allowed disabled:border-transparent disabled:bg-surface-muted disabled:text-text-tertiary",
          error && "border-status-danger focus:border-status-danger focus:ring-status-danger",
          className
        )}
        ref={ref}
        disabled={disabled}
        {...props}
      />
    )
  }
)
Input.displayName = "Input"

export { Input }
