import * as React from "react"
import { Plus } from "lucide-react"
import { cn } from "@/lib/utils"

export interface FABProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  icon?: React.ReactNode
  label?: string
  /**
   * - "tall-pill": Nút viên thuốc đứng (như trong ảnh Figma FAB.png)
   * - "circle": Nút tròn tiêu chuẩn
   * - "extended": Nút kèm nhãn text mở rộng
   */
  variant?: "tall-pill" | "circle" | "extended"
  /** Có cố định ở góc màn hình không */
  fixed?: boolean
}

/**
 * FAB (Floating Action Button) — khớp component "FAB (nút nổi)" trong UI Component (Figma):
 * Nút hành động nổi màu cam brand/primary (#F0522B), bóng mờ, icon dấu cộng trắng.
 */
export function FAB({
  icon,
  label,
  variant = "tall-pill",
  fixed = false,
  className,
  ...props
}: FABProps) {
  const variantStyles = {
    "tall-pill": "h-14 w-8 rounded-pill shadow-md hover:shadow-lg",
    circle: "size-14 rounded-full shadow-md hover:shadow-lg",
    extended: "h-12 px-5 rounded-pill shadow-md hover:shadow-lg gap-2",
  }

  return (
    <button
      type="button"
      className={cn(
        "inline-flex shrink-0 items-center justify-center bg-brand-primary text-text-on-brand transition-all duration-200 hover:bg-brand-primary-hover active:scale-95 outline-none select-none",
        variantStyles[variant],
        fixed && "fixed bottom-6 right-6 z-40",
        className,
      )}
      {...props}
    >
      {icon ?? <Plus className="size-6 text-white" strokeWidth={2.5} />}
      {variant === "extended" && label ? <span className="text-sm font-bold">{label}</span> : null}
    </button>
  )
}
