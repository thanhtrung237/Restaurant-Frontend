import * as React from "react"
import { ChevronLeft, LogOut } from "lucide-react"
import { NotificationBell } from "@/components/layout/NotificationBell"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { BranchSwitcher } from "@/components/layout/BranchSwitcher"
import { useLogout } from "@/features/auth/hooks/useLogout"
import { useAuthStore } from "@/stores/auth.store"
import { cn } from "@/lib/utils"

export interface MobileHeaderProps {
  title: string
  /**
   * "back" — header màn con: nút quay lại tròn + tiêu đề (mặc định, giữ nguyên hành vi cũ).
   * "app"  — header trang chính của khu vực nhân viên, theo Figma
   *          "Sơ đồ bàn · Mobile (375)": avatar · tiêu đề + dòng phụ · chip chi nhánh ·
   *          nút đăng xuất · slot bên phải (chuông).
   */
  variant?: "back" | "app"
  /** Dòng phụ dưới tiêu đề. Dùng được với cả hai biến thể. */
  subtitle?: string
  /**
   * Điều khiển riêng của trang, đặt ở mép phải header — bộ lọc phạm vi (bộ chọn kỳ
   * "Hôm nay ▾" của màn Báo cáo, Figma) hoặc menu "⋯" chứa thao tác phụ của màn con.
   * Dùng được với cả hai biến thể.
   */
  headerActions?: React.ReactNode
  onBack?: () => void
  showBack?: boolean
  rightActions?: React.ReactNode
  className?: string
}

/**
 * MobileHeader — khớp component "Mobile Header" trong UI Component (Figma).
 */
export function MobileHeader({
  title,
  variant = "back",
  subtitle,
  headerActions,
  onBack,
  showBack = true,
  rightActions,
  className,
}: MobileHeaderProps) {
  if (variant === "app") {
    return (
      <AppMobileHeader
        title={title}
        subtitle={subtitle}
        headerActions={headerActions}
        rightActions={rightActions}
        className={className}
      />
    )
  }

  return (
    <header
      className={cn(
        // min-h thay vì h cố định: biến thể này nay có thể kèm dòng phụ.
        "sticky top-0 z-30 flex min-h-14 w-full items-center justify-between gap-2 border-b border-border-default bg-surface-card px-3 py-2 shadow-2xs",
        className,
      )}
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {showBack ? (
          <button
            type="button"
            onClick={onBack ?? (() => window.history.back())}
            aria-label="Quay lại"
            className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-primary transition-colors hover:bg-border-strong active:scale-95"
          >
            <ChevronLeft className="size-5" />
          </button>
        ) : null}
        <div className="min-w-0">
          <h2 className="wrap-anywhere text-base font-bold leading-tight text-text-primary">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 wrap-anywhere text-xs leading-tight text-text-tertiary">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {headerActions || rightActions ? (
        <div className="flex max-w-[40%] shrink-0 flex-wrap items-center justify-end gap-1">
          {headerActions}
          {rightActions}
        </div>
      ) : null}
    </header>
  )
}

/**
 * Biến thể "app" — dùng cho trang chính của khu vực nhân viên trên mobile.
 */
function AppMobileHeader({
  title,
  subtitle,
  headerActions,
  rightActions,
  className,
}: Pick<MobileHeaderProps, "title" | "subtitle" | "headerActions" | "rightActions" | "className">) {
  const account = useAuthStore((s) => s.account)
  const { logout, isLoggingOut } = useLogout()

  const initials =
    account?.fullName
      ?.split(" ")
      .slice(-2)
      .map((w) => w[0])
      .join("")
      .toUpperCase() || "QL"

  return (
    <header
      className={cn(
        "sticky top-0 z-30 grid w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1 border-b border-border-default bg-surface-card px-3 py-2 shadow-2xs",
        className,
      )}
    >
      <div className="flex min-w-0 items-center gap-2">
        <Avatar className="size-8 shrink-0 bg-surface-muted text-xs font-bold text-text-primary">
          <AvatarFallback className="bg-surface-muted text-text-primary">{initials}</AvatarFallback>
        </Avatar>
        <h1 className="min-w-0 wrap-anywhere text-base font-bold leading-tight text-text-primary">
          {title}
        </h1>
      </div>

      <div className="flex min-w-0 items-center justify-end gap-1">
        <BranchSwitcher
          variant="chip"
          compact
          className="min-h-10 min-w-0 max-w-24 justify-center"
        />
        <button
          type="button"
          onClick={() => void logout()}
          disabled={isLoggingOut}
          aria-label="Đăng xuất"
          title="Đăng xuất"
          className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-muted text-text-secondary transition-colors hover:bg-border-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="size-4" />
        </button>
        {rightActions ?? <NotificationBell className="size-11 shrink-0" />}
      </div>

      {subtitle ? (
        <p className="col-span-full wrap-anywhere text-xs leading-snug text-text-tertiary">
          {subtitle}
        </p>
      ) : null}

      {headerActions ? (
        <div className="col-span-full min-w-0 max-w-full">{headerActions}</div>
      ) : null}
    </header>
  )
}
