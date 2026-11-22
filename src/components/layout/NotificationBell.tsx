import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Bell, BellRing, CheckCheck, ChevronDown, CreditCard, Ellipsis, ShoppingBag, Trash2, X } from "lucide-react"
import { Popover, PopoverClose, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { getNotificationTableLabel, useStaffInbox, type StaffNotification } from "@/api/staff-notifications.api"
import { getTableSession } from "@/api/table-sessions.api"
import { getNotificationDestination } from "@/features/shared/floor-ops/notification-navigation"
import { useAuthStore } from "@/stores/auth.store"
import { useNotificationRing } from "@/stores/notification.store"
import { useToast } from "@/hooks/use-toast"
import { isApiStatus } from "@/lib/http"
import { cn } from "@/lib/utils"

const config = {
  NEW_ORDER: { title: "Có món mới", icon: ShoppingBag, tone: "bg-brand-primary-subtle text-brand-primary" },
  PAYMENT_REQUESTED: { title: "Yêu cầu tính tiền", icon: CreditCard, tone: "bg-status-success-subtle text-status-success" },
  DISCOUNT_APPROVAL: { title: "Yêu cầu duyệt chiết khấu", icon: CreditCard, tone: "bg-brand-primary-subtle text-brand-primary" },
  PAYMENT_QR_OPENED: { title: "Khách đã mở mã QR thanh toán", icon: CreditCard, tone: "bg-brand-primary-subtle text-brand-primary" },
  BANK_PAYMENT_VERIFIED: { title: "Ngân hàng đã xác nhận thanh toán", icon: CreditCard, tone: "bg-status-success-subtle text-status-success" },
  STAFF_CALL: { title: "Khách gọi nhân viên", icon: BellRing, tone: "bg-status-warning-subtle text-status-warning" },
} as const

function timeAgo(createdAt: string) {
  const minutes = Math.max(0, Math.floor((Date.now() - Date.parse(createdAt)) / 60_000))
  if (minutes < 1) return "vừa xong"
  if (minutes < 60) return `${minutes} phút trước`
  if (minutes < 1440) return `${Math.floor(minutes / 60)} giờ trước`
  return `${Math.floor(minutes / 1440)} ngày trước`
}

function groupNotifications(notifications: StaffNotification[]) {
  const groups = new Map<string, StaffNotification[]>()
  for (const item of notifications) {
    const key = item.type === "NEW_ORDER" ? `orders-${item.tableSessionId}` : `event-${item.id}`
    const group = groups.get(key)
    if (group) group.push(item)
    else groups.set(key, [item])
  }
  return Array.from(groups.entries())
}

const headerButton = "flex size-8 items-center justify-center rounded-lg text-text-secondary hover:bg-surface-muted focus-visible:outline-2 focus-visible:outline-brand-primary"
const rowButton = "flex min-w-0 w-full items-center gap-3 px-3.5 py-3 text-left hover:bg-surface-muted focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-brand-primary disabled:opacity-60"
const ended = new Set(["CLOSED", "CANCELLED", "MERGED"])

export function NotificationBell({ variant = "header", className }: {
  variant?: "header" | "sidebar" | "rail"
  className?: string
}) {
  const { branchId, enabled, inbox, action } = useStaffInbox()
  const ringingBranch = useNotificationRing((state) => state.ringingBranch)
  const stop = useNotificationRing((state) => state.stop)
  const ringing = ringingBranch != null && ringingBranch === branchId
  const navigate = useNavigate()
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [openingId, setOpeningId] = useState<number | null>(null)
  const notifications = inbox.data ?? []
  const unread = notifications.filter((item) => !item.read).length
  const isHeader = variant === "header"
  const isRail = variant === "rail"

  function update(request: Parameters<typeof action.mutate>[0]) {
    action.mutate(request, {
      onError: () => toast({ title: "Không cập nhật được thông báo", variant: "danger" }),
    })
  }

  async function openNotification(item: StaffNotification) {
    if (openingId != null) return
    setOpeningId(item.id)
    const accountId = useAuthStore.getState().account?.id
    const stillCurrent = () => {
      const current = useAuthStore.getState()
      return current.branchId === item.branchId && current.account?.id === accountId
    }
    function finish() {
      if (!item.read) update({ type: "read", id: item.id })
      setOpen(false)
    }
    try {
      const session = await getTableSession(item.tableSessionId)
      if (!stillCurrent()) return
      if (session.pickedUpAt || (ended.has(session.status) && !(session.takeaway && session.status === "CLOSED")) ||
          session.branchId !== item.branchId) {
        finish()
        toast({ title: "Phiên bàn đã kết thúc", variant: "info" })
        return
      }
      const destination = getNotificationDestination(item, session, useAuthStore.getState().role)
      if (destination) {
        finish()
        navigate(destination)
      } else {
        toast({ title: "Bạn không có quyền mở màn hình này", variant: "info" })
      }
    } catch (error) {
      if (!stillCurrent()) return
      if (isApiStatus(error, 404)) {
        finish()
        toast({ title: "Phiên bàn không còn khả dụng", variant: "info" })
      } else {
        toast({ title: "Không mở được phiên bàn", description: "Vui lòng thử lại.", variant: "danger" })
      }
    } finally {
      setOpeningId(null)
    }
  }

  return (
    <Popover open={open} onOpenChange={(next) => {
      setOpen(next)
      if (next) {
        stop()
        if (enabled) void inbox.refetch()
      }
    }}>
      <PopoverTrigger asChild>
        <button type="button" title="Thông báo" aria-label="Thông báo" className={cn(
          "relative flex items-center justify-center transition-colors",
          isHeader && "size-10 rounded-full border border-border-default bg-surface-card text-text-secondary hover:bg-surface-muted shadow-2xs",
          isRail && "size-11 rounded-xl text-text-tertiary hover:bg-surface-muted",
          variant === "sidebar" && "size-8 rounded-lg text-text-tertiary hover:bg-surface-muted",
          ringing && "border-brand-primary text-brand-primary ring-2 ring-brand-primary/40",
          className,
        )}>
          <Bell className={cn(isRail ? "size-5" : "size-4", ringing && "animate-bell-ring")} />
          {unread > 0 && <span className="absolute -top-1 -right-1 flex size-4.5 items-center justify-center rounded-full bg-brand-primary text-[10px] font-bold text-white">{unread > 9 ? "9+" : unread}</span>}
        </button>
      </PopoverTrigger>
      <PopoverContent
        aria-label="Thông báo"
        side={isHeader ? "bottom" : isRail ? "right" : "top"}
        align={variant === "sidebar" ? "start" : "end"}
        sideOffset={8}
        collisionPadding={12}
        className="flex max-h-[var(--radix-popover-content-available-height)] w-84 max-w-[var(--radix-popover-content-available-width)] flex-col overflow-hidden rounded-2xl border-border-default bg-surface-card p-0 shadow-2xl sm:w-96"
      >
        <div className="flex shrink-0 items-center justify-between border-b border-border-default/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="text-sm font-bold">Thông báo</span>
            {unread > 0 && <span className="rounded-full bg-brand-primary/10 px-2 py-0.5 text-xs font-bold text-brand-primary">{unread} mới</span>}
          </div>
          <div className="flex items-center gap-1">
            {unread > 0 && <button type="button" disabled={action.isPending} onClick={() => update({ type: "readAll" })}
              title="Đánh dấu đã đọc tất cả" aria-label="Đánh dấu đã đọc tất cả" className={headerButton}><CheckCheck className="size-4" /></button>}
            {notifications.length > 0 && <DropdownMenu>
              <DropdownMenuTrigger aria-label="Tùy chọn thông báo" title="Tùy chọn thông báo" className={headerButton}><Ellipsis className="size-4" /></DropdownMenuTrigger>
              <DropdownMenuContent className="w-48">
                <DropdownMenuItem variant="danger" icon={<Trash2 />} disabled={action.isPending} onClick={() => update({ type: "hideAll" })}>
                  Ẩn tất cả của tôi
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>}
            <PopoverClose type="button" aria-label="Đóng thông báo" title="Đóng thông báo" className={headerButton}><X className="size-4" /></PopoverClose>
          </div>
        </div>

        <div className="min-h-0 max-h-96 overflow-y-auto divide-y divide-border-default/40">
          {!enabled ? <p className="p-5 text-sm text-text-secondary">Chọn chi nhánh để xem thông báo.</p>
            : inbox.isPending ? <p role="status" className="p-5 text-sm text-text-secondary">Đang tải thông báo…</p>
            : inbox.isError && notifications.length === 0 ? (
              <div className="p-5 text-sm"><p role="alert">Không tải được thông báo.</p>
                <button type="button" className="mt-2 font-semibold underline" onClick={() => void inbox.refetch()}>Thử lại</button></div>
            ) : notifications.length === 0 ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center">
                <Bell className="size-6 text-text-secondary" aria-hidden="true" />
                <p className="text-sm font-medium">Chưa có thông báo nào</p>
                <p className="text-xs text-text-secondary">Món mới, yêu cầu tính tiền và gọi nhân viên sẽ xuất hiện tại đây.</p>
              </div>
            ) : groupNotifications(notifications).map(([key, items]) => (
              <NotificationGroup key={key} items={items} busy={openingId != null} onOpen={openNotification} />
            ))}
        </div>
      </PopoverContent>
    </Popover>
  )
}

function NotificationGroup({ items, busy, onOpen }: {
  items: StaffNotification[]
  busy: boolean
  onOpen: (item: StaffNotification) => Promise<void>
}) {
  const first = items[0]
  const table = getNotificationTableLabel(first.tableName, first.tableSessionId)
  const { title, icon: Icon, tone } = config[first.type]
  if (items.length === 1) {
    const description = first.orderId ? `${table} · Lượt gọi #${first.orderId}`
      : first.dishName ? `${table} · Món “${first.dishName}”` : table
    return (
      <button type="button" disabled={busy} onClick={() => void onOpen(first)} className={cn(rowButton, !first.read && "bg-brand-primary-subtle/40")}>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", tone)}><Icon aria-hidden="true" className="size-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{title}</span>
          <span className="block text-xs text-text-secondary">{description}</span>
          {first.resolvedAt && <span className="block text-xs text-status-success">Đã xử lý</span>}
        </span>
        <span className="text-xs text-text-secondary">{timeAgo(first.createdAt)}</span>
      </button>
    )
  }
  const unread = items.filter((item) => !item.read).length
  return (
    <details className="group">
      <summary className={cn(rowButton, "cursor-pointer list-none [&::-webkit-details-marker]:hidden", unread > 0 && "bg-brand-primary-subtle/40")}>
        <span className={cn("flex size-8 shrink-0 items-center justify-center rounded-full", tone)}><Icon aria-hidden="true" className="size-4" /></span>
        <span className="min-w-0 flex-1">
          <span className="block text-sm font-semibold">{table}</span>
          <span className="block text-xs text-text-secondary">{items.length} lượt gọi{unread > 0 ? ` · ${unread} chưa đọc` : ""}</span>
        </span>
        <ChevronDown aria-hidden="true" className="size-4 text-text-secondary group-open:rotate-180" />
      </summary>
      <ul className="divide-y divide-border-default/40 border-t border-border-default/40">
        {items.map((item) => <li key={item.id}>
          <button type="button" disabled={busy} onClick={() => void onOpen(item)}
            className={cn(rowButton, "pl-11 text-xs", !item.read && "font-semibold")}>
            <span className="flex-1">Lượt gọi #{item.orderId}</span>
            <span className="text-text-secondary">{timeAgo(item.createdAt)}</span>
          </button>
        </li>)}
      </ul>
    </details>
  )
}
