import * as React from "react"
import { ChevronLeft } from "lucide-react"
import { cn } from "@/lib/utils"

export interface MobileHeaderProps {
  title: string
  onBack?: () => void
  showBack?: boolean
  rightActions?: React.ReactNode
  className?: string
}

/**
 * MobileHeader — khớp component "Mobile Header" trong UI Component (Figma):
 * Header mobile với nút quay lại hình tròn (<), tiêu đề màn hình ("Tên màn hình"),
 * và khu vực hành động phụ bên phải.
 */
export function MobileHeader({
  title,
  onBack,
  showBack = true,
  rightActions,
  className,
}: MobileHeaderProps) {
  return (
    <header
      className={cn(
        "sticky top-0 z-30 flex h-14 w-full items-center justify-between border-b border-border-default bg-surface-card px-4 shadow-2xs",
        className
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {showBack ? (
          <button
            type="button"
            onClick={onBack ?? (() => window.history.back())}
            aria-label="Quay lại"
            className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-primary transition-colors hover:bg-border-strong active:scale-95"
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : null}
        <h2 className="truncate text-base font-bold text-text-primary">
          {title}
        </h2>
      </div>

      {rightActions ? (
        <div className="flex shrink-0 items-center gap-2">
          {rightActions}
        </div>
      ) : null}
    </header>
  )
}
