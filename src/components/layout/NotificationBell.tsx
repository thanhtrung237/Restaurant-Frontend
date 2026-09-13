/**
 * NotificationBell — chuông thông báo real-time cho nhân viên.
 *
 * Hiển thị:
 *  - Icon chuông với badge số thông báo chưa đọc.
 *  - Dropdown danh sách thông báo khi bấm — click ngoài thì đóng.
 *  - Nhóm theo loại:
 *      + NEW_ORDER (Khách gửi order mới - FR-SRV-03)
 *      + PAYMENT_REQUESTED (Khách yêu cầu tính tiền - FR-CUS-10)
 *      + STAFF_CALL (Khách bấm "Báo nhân viên" - FR-CUS-07, có trạng thái Chờ xử lý -> Đã xử lý)
 *
 * Hỗ trợ các biến thể:
 *  - "header": Nút tròn nổi bật cạnh "Danh sách đặt" trên thanh tiêu đề bàn (Figma & ảnh thực tế)
 *  - "sidebar": Sidebar desktop
 *  - "rail": Sidebar thu gọn trên Tablet
 */

import * as React from "react"
import { Bell, X, CheckCheck, ShoppingBag, CreditCard, BellRing, Check } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  useNotificationStore,
  type StaffNotification,
  type NotificationType,
} from "@/stores/notification.store"

const TYPE_CONFIG: Record<
  NotificationType,
  { icon: React.ElementType; color: string; bg: string }
> = {
  NEW_ORDER: {
    icon: ShoppingBag,
    color: "text-brand-primary",
    bg: "bg-brand-primary-subtle",
  },
  PAYMENT_REQUESTED: {
    icon: CreditCard,
    color: "text-status-success",
    bg: "bg-status-success-subtle",
  },
  STAFF_CALL: {
    icon: BellRing,
    color: "text-[#D97706]",
    bg: "bg-[#FEF3C7]",
  },
  ITEM_STATUS_CHANGED: {
    icon: Bell,
    color: "text-text-secondary",
    bg: "bg-surface-muted",
  },
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000)
  if (diff < 60) return "vừa xong"
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`
  return `${Math.floor(diff / 86400)} ngày trước`
}

interface NotificationBellProps {
  /** "header" = trên thanh tiêu đề kế nút Danh sách đặt, "sidebar" = desktop layout, "rail" = tablet layout */
  variant?: "header" | "sidebar" | "rail"
  className?: string
}

export function NotificationBell({ variant = "header", className }: NotificationBellProps) {
  const { notifications, unreadCount, isRinging, stopRinging, markAllRead, clearAll } = useNotificationStore()
  const [open, setOpen] = React.useState(false)
  const ref = React.useRef<HTMLDivElement>(null)

  // Đóng dropdown khi click ngoài
  React.useEffect(() => {
    function onClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false)
      }
    }
    if (open) document.addEventListener("mousedown", onClickOutside)
    return () => document.removeEventListener("mousedown", onClickOutside)
  }, [open])

  function handleToggle() {
    setOpen((v) => !v)
    stopRinging()
  }

  const isHeader = variant === "header"
  const isRail = variant === "rail"

  return (
    <div ref={ref} className={cn("relative inline-block", className)}>
      {/* Nút chuông */}
      <button
        type="button"
        onClick={handleToggle}
        title="Thông báo"
        aria-label="Thông báo"
        className={cn(
          "relative flex items-center justify-center transition-colors cursor-pointer",
          isHeader &&
            "size-10 rounded-full border border-border-default bg-surface-card text-text-secondary hover:bg-surface-muted hover:text-text-primary shadow-2xs",
          isRail &&
            "size-11 rounded-xl text-text-tertiary hover:bg-surface-muted hover:text-text-primary",
          !isHeader && !isRail &&
            "size-8 rounded-lg text-text-tertiary hover:bg-surface-muted hover:text-text-primary",
          isRinging &&
            "border-brand-primary text-brand-primary ring-2 ring-brand-primary/40 shadow-[0_0_12px_rgba(240,82,43,0.35)]",
        )}
      >
        <Bell
          className={cn(
            isHeader ? "size-4" : isRail ? "size-5" : "size-4.5",
            isRinging && "animate-bell-ring text-brand-primary",
          )}
        />
        {unreadCount > 0 && (
          <span
            className={cn(
              "absolute flex items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white shadow-xs",
              isHeader
                ? "-top-1 -right-1 size-4.5"
                : "-right-0.5 -top-0.5 size-4.5",
              isRinging && "animate-bounce",
            )}
          >
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {/* Dropdown panel */}
      {open && (
        <div
          className={cn(
            "absolute z-50 w-84 sm:w-96 rounded-2xl border border-border-default bg-surface-card shadow-2xl overflow-hidden",
            // Chuông "header" nằm trên đầu trang → mở xuống dưới.
            // Chuông "sidebar"/"rail" nằm ở CHÂN màn hình → phải mở LÊN trên (bottom-*),
            // nếu mở xuống (top-*) thì bảng thông báo nằm ngoài màn hình, bấm chuông không thấy gì.
            isHeader
              ? "right-0 top-full mt-2"
              : isRail
                ? "left-full bottom-0 ml-2"
                : "left-0 bottom-full mb-2",
          )}
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-default/60 px-4 py-3 bg-surface-card">
            <div className="flex items-center gap-2">
              <span className="text-sm font-bold text-text-primary">Thông báo</span>
              {unreadCount > 0 ? (
                <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-bold text-brand-primary">
                  {unreadCount} mới
                </span>
              ) : null}
            </div>
            <div className="flex items-center gap-1">
              {unreadCount > 0 && (
                <button
                  type="button"
                  onClick={markAllRead}
                  title="Đánh dấu đã đọc tất cả"
                  className="flex size-7 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-muted hover:text-brand-primary cursor-pointer"
                >
                  <CheckCheck className="size-4" />
                </button>
              )}
              {notifications.length > 0 && (
                <button
                  type="button"
                  onClick={clearAll}
                  title="Xoá tất cả thông báo"
                  className="flex size-7 items-center justify-center rounded-lg text-text-tertiary transition-colors hover:bg-surface-muted hover:text-status-danger cursor-pointer"
                >
                  <X className="size-4" />
                </button>
              )}
            </div>
          </div>

          {/* Danh sách */}
          <div className="max-h-[min(24rem,calc(100vh-10rem))] overflow-y-auto divide-y divide-border-default/40">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center gap-2 py-10 text-center px-4">
                <div className="flex size-12 items-center justify-center rounded-full bg-surface-muted text-text-tertiary">
                  <Bell className="size-6" />
                </div>
                <p className="text-sm font-medium text-text-primary">Chưa có thông báo nào</p>
                <p className="text-xs text-text-tertiary">
                  Các sự kiện gọi món, yêu cầu tính tiền và gọi nhân viên sẽ xuất hiện tại đây theo thời gian thực.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <NotificationItem key={n.id} notification={n} />
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}

function NotificationItem({ notification: n }: { notification: StaffNotification }) {
  const { markRead, toggleResolved } = useNotificationStore()
  const cfg = TYPE_CONFIG[n.type] ?? TYPE_CONFIG.STAFF_CALL
  const Icon = cfg.icon

  const isStaffCall = n.type === "STAFF_CALL"
  const isResolved = n.status === "RESOLVED"

  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 p-3.5 transition-colors text-left",
        !n.read ? "bg-[#FFF9F6]" : "hover:bg-surface-muted/60",
      )}
      onClick={() => markRead(n.id)}
    >
      <div className="flex items-start gap-3">
        <span
          className={cn(
            "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-full",
            cfg.bg,
          )}
        >
          <Icon className={cn("size-4", cfg.color)} />
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-1">
            <p className="text-xs font-bold text-text-primary">{n.title}</p>
            <span className="text-[10px] text-text-tertiary shrink-0">
              {timeAgo(n.createdAt)}
            </span>
          </div>

          <p className="mt-0.5 text-xs text-text-secondary leading-relaxed">
            {n.body}
          </p>

          {/* Đối với Báo nhân viên (FR-CUS-07): Cho phép chuyển trạng thái Chờ xử lý -> Đã xử lý */}
          {isStaffCall && (
            <div className="mt-2 flex items-center justify-between gap-2 pt-1 border-t border-border-default/40">
              <span
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11px] font-semibold",
                  isResolved
                    ? "bg-[#ECFDF3] text-[#027A48]"
                    : "bg-[#FEF3F2] text-[#B42318]",
                )}
              >
                <span
                  className={cn(
                    "size-1.5 rounded-full",
                    isResolved ? "bg-[#12B76A]" : "bg-[#F04438] animate-pulse",
                  )}
                />
                {isResolved ? "Đã xử lý" : "Chờ xử lý"}
              </span>

              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  toggleResolved(n.id)
                }}
                className={cn(
                  "inline-flex items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold transition-colors cursor-pointer",
                  isResolved
                    ? "bg-surface-muted text-text-tertiary hover:bg-surface-muted/80"
                    : "bg-brand-primary text-white hover:bg-brand-primary-hover shadow-2xs active:scale-95",
                )}
              >
                {isResolved ? (
                  "Đánh dấu chờ xử lý"
                ) : (
                  <>
                    <Check className="size-3" />
                    <span>Xong</span>
                  </>
                )}
              </button>
            </div>
          )}
        </div>

        {!n.read && (
          <span className="mt-1 size-2 shrink-0 rounded-full bg-brand-primary" />
        )}
      </div>
    </div>
  )
}