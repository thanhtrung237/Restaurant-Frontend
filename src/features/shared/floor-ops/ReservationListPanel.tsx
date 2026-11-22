import * as React from "react"
import * as DialogPrimitive from "@radix-ui/react-dialog"
import { CalendarCheck, X, Clock, Phone, Users, Minus, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { EmptyState } from "@/components/common/EmptyState"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/http"
import {
  useCancelReservation,
  useConfirmOpenSession,
} from "@/features/shared/floor-ops/api"
import type { TableSession } from "@/types/models"

interface ReservationListPanelProps {
  canCancel?: boolean
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Toàn bộ phiên đang hoạt động của chi nhánh; panel tự lọc ĐẶT TRƯỚC. */
  sessions: TableSession[]
  /** Phút giữ chỗ sau giờ hẹn, lấy từ cấu hình chi nhánh (BR-29, mặc định 15). */
  holdMinutes?: number
  /**
   * Mở modal đặt bàn mới. Trên mobile đây là lối vào DUY NHẤT tới modal đặt bàn:
   * FAB mở panel này, rồi từ nút ở chân panel mới sang modal.
   */
  onCreateReservation?: () => void
}

const DEFAULT_HOLD_MINUTES = 15
/** Nhịp cập nhật đồng hồ đếm ngược khi panel đang mở. */
const TICK_MS = 30_000

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  )
}

/**
 * Giờ hẹn hiển thị theo Figma: cùng ngày thì "19:00 hôm nay", khác ngày thì "19:00 12/10".
 * Danh sách giữ TOÀN BỘ lịch RESERVED (không lọc theo ngày) vì theo BR-29 lịch đặt trước
 * khoá bàn ngay khi đánh dấu — mọi lịch RESERVED đều đang chiếm bàn nên nhân viên cần
 * thấy hết, kể cả lịch của ngày khác.
 */
function formatReservationTime(value: string | undefined, now: number): string {
  if (!value) return "—"
  const date = new Date(value)
  const clock = date.toLocaleTimeString("vi-VN", {
    hour: "2-digit",
    minute: "2-digit",
  })
  if (isSameDay(date, new Date(now))) return `${clock} hôm nay`
  const day = String(date.getDate()).padStart(2, "0")
  const month = String(date.getMonth() + 1).padStart(2, "0")
  return `${clock} ${day}/${month}`
}

/**
 * Panel "Danh sách đặt bàn" (FR-TBL-03).
 *
 * Nguồn dữ liệu: chính mảng phiên đang hoạt động mà Sơ đồ bàn đã tải
 * (`GET /table-sessions/branch/{id}/open` — truy vấn của backend loại CLOSED/CANCELLED/
 * MERGED nên ĐÃ bao gồm ĐẶT TRƯỚC). Không phát sinh request mới, không cần endpoint mới.
 *
 * KHÔNG hiển thị trạng thái "Chờ xác nhận": luồng khách tự đặt nằm ngoài phạm vi bản đầu
 * (FR-TBL-03) — nhân viên là người nhập hộ nên lịch tạo ra luôn ở ĐẶT TRƯỚC.
 */
export function ReservationListPanel({
  open,
  onOpenChange,
  sessions,
  holdMinutes = DEFAULT_HOLD_MINUTES,
  onCreateReservation,
  canCancel = false,
}: ReservationListPanelProps) {
  const reservations = React.useMemo(
    () =>
      sessions
        .filter((s) => s.status === "RESERVED")
        .sort((a, b) =>
          (a.reservationTime ?? "").localeCompare(b.reservationTime ?? ""),
        ),
    [sessions],
  )

  // Mốc thời gian dùng chung cho cả phụ đề và đồng hồ đếm ngược từng dòng.
  // Khởi tạo lazy để không gọi Date.now() trong thân render; interval chỉ chạy khi panel
  // mở nên không tốn tài nguyên lúc đóng. Giá trị có thể cũ tối đa một nhịp (30 giây) —
  // chấp nhận được vì chỉ dùng để cảnh báo, không dùng để quyết định nghiệp vụ.
  const [now, setNow] = React.useState(() => Date.now())

  React.useEffect(() => {
    if (!open) return
    const timer = setInterval(() => setNow(Date.now()), TICK_MS)
    return () => clearInterval(timer)
  }, [open])

  // "Chờ nhận bàn" = đã tới giờ hẹn nhưng Phục vụ chưa xác nhận khách đến. Đây là phần
  // cần xử lý gấp: quá giờ hẹn + thời gian giữ chỗ là job nền tự huỷ (BR-29).
  const awaitingPickupCount = React.useMemo(
    () =>
      reservations.filter(
        (s) => s.reservationTime && new Date(s.reservationTime).getTime() <= now,
      ).length,
    [reservations, now],
  )

  const [sessionToOpen, setSessionToOpen] = React.useState<TableSession | null>(null)
  const [sessionToCancel, setSessionToCancel] = React.useState<TableSession | null>(null)

  return (
    <>
      <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
        <DialogPrimitive.Portal>
          <DialogPrimitive.Overlay className="fixed inset-0 z-50 bg-text-primary/40 data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0" />
          <DialogPrimitive.Content
            aria-label="Bàn đặt trước"
            className="fixed inset-y-0 right-0 z-50 flex w-full max-w-md flex-col bg-surface-card shadow-xl data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:slide-out-to-right data-[state=open]:slide-in-from-right"
          >
            <DialogPrimitive.Title className="sr-only">
              Bàn đặt trước
            </DialogPrimitive.Title>
            <DialogPrimitive.Description className="sr-only">
              Các bàn đang được giữ chỗ theo giờ hẹn
            </DialogPrimitive.Description>

            <div className="flex items-center justify-between border-b border-border-default px-5 py-4">
              <div className="flex items-center gap-2.5">
                <span className="flex size-9 items-center justify-center rounded-xl bg-brand-primary-subtle text-brand-primary">
                  <CalendarCheck className="size-4.5" />
                </span>
                <div>
                  <h2 className="text-base font-bold text-text-primary">
                    Bàn đặt trước
                  </h2>
                  <p className="text-xs text-text-tertiary">
                    {reservations.length} lượt đặt
                    {awaitingPickupCount > 0
                      ? ` · ${awaitingPickupCount} chờ nhận bàn`
                      : ""}
                  </p>
                </div>
              </div>
              <DialogPrimitive.Close
                aria-label="Đóng"
                className="flex size-9 items-center justify-center rounded-full bg-surface-muted text-text-secondary transition-colors hover:bg-border-strong"
              >
                <X className="size-4.5" />
              </DialogPrimitive.Close>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              {reservations.length === 0 ? (
                <EmptyState
                  icon={CalendarCheck}
                  title="Chưa có lịch đặt bàn"
                  description="Bấm nút Đặt bàn trên sơ đồ bàn để giữ chỗ cho khách."
                />
              ) : (
                <ReservationList
                  reservations={reservations}
                  holdMinutes={holdMinutes}
                  now={now}
                  onReceive={setSessionToOpen}
                  onCancel={canCancel ? setSessionToCancel : undefined}
                />
              )}
            </div>

            {onCreateReservation ? (
              <div className="border-t border-border-default p-4">
                <Button
                  className="w-full gap-2"
                  onClick={() => {
                    // Đóng panel trước để hai lớp dialog không chồng nhau.
                    onOpenChange(false)
                    onCreateReservation()
                  }}
                >
                  <Plus className="size-4" strokeWidth={2.5} />
                  Đặt bàn mới
                </Button>
              </div>
            ) : null}
          </DialogPrimitive.Content>
        </DialogPrimitive.Portal>
      </DialogPrimitive.Root>

      <ReceiveGuestDialog
        session={sessionToOpen}
        onClose={() => setSessionToOpen(null)}
      />
      <CancelReservationDialog
        session={canCancel ? sessionToCancel : null}
        onClose={() => setSessionToCancel(null)}
      />
    </>
  )
}

/** Danh sách lịch đặt. Mốc thời gian `now` do panel cha giữ để phụ đề và từng dòng khớp nhau. */
function ReservationList({
  reservations,
  holdMinutes,
  now,
  onReceive,
  onCancel,
}: {
  reservations: TableSession[]
  holdMinutes: number
  now: number
  onReceive: (session: TableSession) => void
  onCancel?: (session: TableSession) => void
}) {
  return (
    <ul className="space-y-3">
      {reservations.map((session) => (
        <ReservationRow
          key={session.id}
          session={session}
          holdMinutes={holdMinutes}
          now={now}
          onReceive={() => onReceive(session)}
          onCancel={onCancel ? () => onCancel(session) : undefined}
        />
      ))}
    </ul>
  )
}

function ReservationRow({
  session,
  holdMinutes,
  now,
  onReceive,
  onCancel,
}: {
  session: TableSession
  holdMinutes: number
  now: number
  onReceive: () => void
  onCancel?: () => void
}) {
  // BR-29: quá giờ hẹn + thời gian giữ chỗ thì job nền tự huỷ. Cảnh báo trước để nhân
  // viên kịp gọi khách, thay vì để lịch biến mất không báo gì.
  const deadline = session.reservationTime
    ? new Date(session.reservationTime).getTime() + holdMinutes * 60_000
    : null
  const minutesLeft = deadline ? Math.round((deadline - now) / 60_000) : null
  const isExpiringSoon = minutesLeft !== null && minutesLeft <= 5

  return (
    <li className="rounded-card border border-border-default bg-surface-card p-3.5 shadow-2xs">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-bold text-text-primary">
            {session.tableName ?? `Bàn #${session.tableId}`}
            {session.reservationName ? ` · ${session.reservationName}` : ""}
          </p>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-tertiary">
            <span className="inline-flex items-center gap-1">
              <Clock className="size-3" />
              {formatReservationTime(session.reservationTime, now)}
            </span>
            {session.reservationPhone ? (
              <span className="inline-flex items-center gap-1">
                <Phone className="size-3" />
                {session.reservationPhone}
              </span>
            ) : null}
            {session.guestCount ? (
              <span className="inline-flex items-center gap-1">
                <Users className="size-3" />
                {session.guestCount} khách
              </span>
            ) : null}
          </div>
          {session.reservationNote ? (
            <p className="mt-1 truncate text-xs text-brand-primary">
              {session.reservationNote}
            </p>
          ) : null}
        </div>

        {isExpiringSoon ? (
          <span className="shrink-0 rounded-pill bg-status-warning-subtle px-2 py-0.5 text-[11px] font-bold text-status-warning">
            {minutesLeft !== null && minutesLeft > 0
              ? `Còn ${minutesLeft} phút`
              : "Quá giờ giữ"}
          </span>
        ) : null}
      </div>

      <div className="mt-3 flex items-center gap-2">
        <Button size="sm" className="flex-1" onClick={onReceive}>
          Nhận bàn
        </Button>
        {onCancel && <Button size="sm" variant="outline" className="flex-1" onClick={onCancel}>Huỷ đặt</Button>}
      </div>
    </li>
  )
}

/**
 * "Nhận bàn" — BR-29 bắt buộc nhập SỐ KHÁCH THỰC TẾ trước khi chuyển ĐẶT TRƯỚC sang
 * ĐANG PHỤC VỤ (số khách lúc đặt chỉ là dự kiến).
 */
function ReceiveGuestDialog({
  session,
  onClose,
}: {
  session: TableSession | null
  onClose: () => void
}) {
  return (
    <Dialog open={Boolean(session)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {session ? <ReceiveGuestForm session={session} onClose={onClose} /> : null}
      </DialogContent>
    </Dialog>
  )
}

function ReceiveGuestForm({
  session,
  onClose,
}: {
  session: TableSession
  onClose: () => void
}) {
  const { toast } = useToast()
  const confirmOpenMutation = useConfirmOpenSession()
  const [guestCount, setGuestCount] = React.useState(() => session.guestCount ?? 2)
  const [error, setError] = React.useState<string | null>(null)

  async function handleConfirm() {
    if (guestCount < 1) {
      setError("Số khách thực tế phải từ 1 trở lên.")
      return
    }
    try {
      await confirmOpenMutation.mutateAsync({
        id: session.id,
        body: { guestCount },
      })
      toast({
        title: "Đã nhận bàn",
        description: `${session.tableName ?? "Bàn"} chuyển sang Đang phục vụ.`,
        variant: "success",
      })
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle>Nhận bàn {session.tableName ?? ""}</DialogTitle>
        <DialogDescription>
          Khách đặt {session.guestCount ?? "—"} chỗ. Nhập số khách THỰC TẾ đã tới để chốt
          phiên phục vụ.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2 py-1">
        <span className="block text-sm font-semibold text-text-primary">
          Số khách thực tế
        </span>
        <div className="inline-flex items-center gap-3">
          <button
            type="button"
            onClick={() => setGuestCount((n) => Math.max(1, n - 1))}
            disabled={guestCount <= 1}
            aria-label="Giảm số khách"
            className="flex size-8 items-center justify-center rounded-md border border-border-strong bg-surface-card text-text-secondary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
          >
            <Minus className="size-4" strokeWidth={2.5} />
          </button>
          <span className="min-w-8 text-center text-lg font-bold text-text-primary">
            {guestCount}
          </span>
          <button
            type="button"
            onClick={() => setGuestCount((n) => n + 1)}
            aria-label="Tăng số khách"
            className="flex size-8 items-center justify-center rounded-md border border-brand-primary/40 bg-brand-primary-subtle font-bold text-brand-primary transition-colors hover:border-brand-primary hover:bg-brand-primary-subtle/80"
          >
            <Plus className="size-4" strokeWidth={3} />
          </button>
        </div>
        {error ? (
          <p className="text-sm font-medium text-status-danger">{error}</p>
        ) : null}
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onClose}>
          Huỷ
        </Button>
        <Button
          onClick={() => void handleConfirm()}
          disabled={confirmOpenMutation.isPending}
        >
          {confirmOpenMutation.isPending ? "Đang mở bàn..." : "Xác nhận nhận bàn"}
        </Button>
      </DialogFooter>
    </>
  )
}

/** "Huỷ đặt" — bảng 2.2 của đặc tả: huỷ TAY bắt buộc ghi lý do. */
function CancelReservationDialog({
  session,
  onClose,
}: {
  session: TableSession | null
  onClose: () => void
}) {
  return (
    <Dialog open={Boolean(session)} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        {session ? (
          <CancelReservationForm session={session} onClose={onClose} />
        ) : null}
      </DialogContent>
    </Dialog>
  )
}

function CancelReservationForm({
  session,
  onClose,
}: {
  session: TableSession
  onClose: () => void
}) {
  const { toast } = useToast()
  const cancelMutation = useCancelReservation()
  const [reason, setReason] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  async function handleConfirm() {
    if (!reason.trim()) {
      setError("Vui lòng nhập lý do huỷ đặt bàn.")
      return
    }
    try {
      await cancelMutation.mutateAsync({
        id: session.id,
        body: { reason: reason.trim() },
      })
      toast({
        title: "Đã huỷ đặt bàn",
        description: `${session.tableName ?? "Bàn"} đã được giải phóng.`,
        variant: "success",
      })
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <>
      <DialogHeader>
        <DialogTitle className="text-status-danger">
          Huỷ đặt bàn {session.tableName ?? ""}
        </DialogTitle>
        <DialogDescription>
          {session.reservationName ? `Khách: ${session.reservationName}. ` : ""}
          Bàn sẽ được giải phóng ngay cho khách vãng lai.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-2 py-1">
        <label
          htmlFor="cancel-reservation-reason"
          className="block text-sm font-semibold text-text-primary"
        >
          Lý do huỷ <span className="text-status-danger">*</span>
        </label>
        <Input
          id="cancel-reservation-reason"
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder="VD: Khách báo không tới"
          className="h-11 rounded-lg border-border-strong/80 text-sm"
        />
        {error ? (
          <p className="text-sm font-medium text-status-danger">{error}</p>
        ) : null}
      </div>

      <DialogFooter className="gap-2 sm:gap-0">
        <Button variant="outline" onClick={onClose}>
          Không huỷ
        </Button>
        <Button
          variant="destructive"
          onClick={() => void handleConfirm()}
          disabled={cancelMutation.isPending || !reason.trim()}
        >
          {cancelMutation.isPending ? "Đang huỷ..." : "Xác nhận huỷ"}
        </Button>
      </DialogFooter>
    </>
  )
}
