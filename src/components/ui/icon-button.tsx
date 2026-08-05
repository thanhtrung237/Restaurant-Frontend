import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

const iconButtonVariants = cva(
  "inline-flex shrink-0 items-center justify-center transition-colors outline-none disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-40",
  {
    variants: {
      variant: {
        ghost: "text-text-secondary hover:bg-surface-muted hover:text-text-primary",
        subtle: "bg-surface-muted text-text-primary hover:bg-border-strong",
        outline: "border border-border-default bg-surface-card text-text-primary hover:bg-surface-muted",
        primary: "bg-brand-primary text-text-on-brand hover:bg-brand-primary-hover shadow-xs",
        danger: "bg-status-danger-subtle text-status-danger hover:bg-status-danger hover:text-white",
      },
      size: {
        sm: "size-8 rounded-md [&_svg]:size-4",
        default: "size-10 rounded-md [&_svg]:size-5",
        lg: "size-12 rounded-lg [&_svg]:size-6",
        pill: "size-10 rounded-full [&_svg]:size-5",
      },
    },
    defaultVariants: {
      variant: "ghost",
      size: "default",
    },
  }
)

export interface IconButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof iconButtonVariants> {}

/**
 * IconButton — khớp component "Icon Button" trong UI Component (Figma):
 * Nút chứa icon với kích thước vuông/tròn chuẩn, hiệu ứng hover nhẹ nhàng.
 */
const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        type="button"
        className={cn(iconButtonVariants({ variant, size }), className)}
        {...props}
      />
    )
  }
)
IconButton.displayName = "IconButton"

export { IconButton, iconButtonVariants }
