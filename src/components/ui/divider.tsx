import * as React from "react"
import { cn } from "@/lib/utils"

export interface DividerProps extends React.HTMLAttributes<HTMLDivElement> {
  orientation?: "horizontal" | "vertical"
}

/**
 * Divider — khớp component "Divider" trong UI Component (Figma):
 * Đường phân cách mỏng 1px với màu border/default (#E9ECEF).
 */
export function Divider({ orientation = "horizontal", className, ...props }: DividerProps) {
  return (
    <div
      role="separator"
      data-orientation={orientation}
      className={cn(
        "shrink-0 bg-border-default",
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        className,
      )}
      {...props}
    />
  )
}
