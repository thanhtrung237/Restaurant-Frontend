import * as React from "react"
import { cva, type VariantProps } from "class-variance-authority"
import { cn } from "@/lib/utils"

/**
 * Button — khớp đúng component "Button" trong UI Component (Figma):
 * radius 12px, padding 12/20, gap 8px, font Be Vietnam Pro SemiBold.
 * 3 kiểu x 2 trạng thái = 6 state trong file gốc:
 *   primary / primary-disabled, outline / outline-disabled, link / link-disabled
 */
const buttonVariants = cva(
  "inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-button text-sm font-semibold transition-colors outline-none disabled:pointer-events-none disabled:cursor-not-allowed focus-visible:ring-2 focus-visible:ring-brand-primary/40 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        // Nền brand/primary, chữ text/on-brand, hover -> brand/primary-hover
        default:
          "bg-brand-primary text-text-on-brand hover:bg-brand-primary-hover disabled:bg-surface-muted disabled:text-text-tertiary",
        // Viền brand/primary, chữ brand/primary, nền trong suốt
        outline:
          "border border-brand-primary bg-transparent text-brand-primary hover:bg-brand-primary-subtle disabled:border-border-default disabled:text-text-tertiary disabled:hover:bg-transparent",
        // Chỉ chữ brand/primary, không nền không viền
        link: "bg-transparent text-brand-primary hover:text-brand-primary-hover disabled:text-text-tertiary underline-offset-4 hover:underline",
        // Giữ lại để tương thích chỗ khác trong app đang dùng destructive/secondary/ghost
        destructive: "bg-status-danger text-white hover:bg-status-danger/90",
        secondary: "bg-surface-muted text-text-primary hover:bg-border-default",
        ghost: "text-text-primary hover:bg-surface-muted",
      },
      size: {
        default: "h-11 px-5 py-3",
        sm: "h-9 rounded-md px-4 py-2 text-[13px]",
        lg: "h-12 px-6 py-3 text-base",
        icon: "size-11",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
)

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, ...props }, ref) => {
    return (
      <button
        ref={ref}
        data-slot="button"
        className={cn(buttonVariants({ variant, size }), className)}
        {...props}
      />
    )
  },
)
Button.displayName = "Button"

export { Button, buttonVariants }
