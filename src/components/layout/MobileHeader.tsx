import * as React from "react"
import { ChevronLeft, Bell, LogOut } from "lucide-react"
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
        "sticky top-0 z-30 flex min-h-14 w-full items-center justify-between gap-2.5 border-b border-border-default bg-surface-card px-4 py-2 shadow-2xs",
        className,
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
        <div className="min-w-0">
          <h2 className="truncate text-base font-bold leading-tight text-text-primary">
            {title}
          </h2>
          {subtitle ? (
            <p className="mt-0.5 truncate text-xs leading-tight text-text-tertiary">
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>

      {headerActions || rightActions ? (
        <div className="flex shrink-0 items-center gap-2">
          {headerActions}
          {rightActions}
        </div>
      ) : null}
    </header>
  )
}

/**
 * Biến thể "app" — dùng cho trang chính của khu vực nhân viên trên mobile.
 * Nút chuông hiện CHỈ là chỗ giữ chỗ: panel thông báo nằm ngoài phạm vi task này.
 */
function AppMobileHeader({
  title,
  subtitle,
  headerActions,
  rightActions,
  className,
}: Pick<
  MobileHeaderProps,
  "title" | "subtitle" | "headerActions" | "rightActions" | "className"
>) {
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
        "sticky top-0 z-30 flex w-full items-center gap-2.5 border-b border-border-default bg-surface-card px-4 py-2.5 shadow-2xs",
        className,
      )}
    >
      <Avatar className="size-10 shrink-0 bg-surface-muted text-xs font-bold text-text-primary">
        <AvatarFallback className="bg-surface-muted text-text-primary">
          {initials}
        </AvatarFallback>
      </Avatar>

      <div className="min-w-0 flex-1">
        <h1 className="truncate text-[17px] font-bold leading-tight text-text-primary">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-0.5 truncate text-xs leading-tight text-text-tertiary">
            {subtitle}
          </p>
        ) : null}
      </div>

      <div className="flex shrink-0 items-center gap-2">
        {headerActions}
        <BranchSwitcher variant="chip" />

        <button
          type="button"
          onClick={() => void logout()}
          disabled={isLoggingOut}
          aria-label="Đăng xuất"
          title="Đăng xuất"
          className="flex size-9 items-center justify-center rounded-full bg-surface-muted text-text-secondary transition-colors hover:bg-border-strong disabled:cursor-not-allowed disabled:opacity-60"
        >
          <LogOut className="size-4" />
        </button>

        {/* Chuông chỉ hiện khi trang KHÔNG có điều khiển riêng — đúng Figma: "Sơ đồ bàn ·
            Mobile" có chuông, còn "Báo cáo · Mobile" (đã có chip kỳ) thì không. Ở 375px
            nhồi cả hai sẽ ép tiêu đề trang cụt còn một chữ. */}
        {rightActions ?? (headerActions ? null : (
          <button
            type="button"
            aria-label="Thông báo"
            title="Thông báo"
            className="relative flex size-9 items-center justify-center rounded-full border border-border-default bg-surface-card text-text-secondary transition-colors hover:bg-surface-muted"
          >
            <Bell className="size-4" />
          </button>
        ))}
      </div>
    </header>
  )
}
