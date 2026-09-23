import * as React from "react"
import { CalendarCheck, Minus, Plus } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useToast } from "@/hooks/use-toast"
import { getErrorMessage } from "@/lib/http"
import { useCreateTableSession } from "@/features/shared/floor-ops/api"
import type { DiningTable } from "@/types/models"

interface ReservationModalProps {
  isOpen: boolean
  /** Danh sách bàn CÓ THỂ đặt (đã lọc bàn trống ở nơi gọi). */
  availableTables: DiningTable[]
  /** Bàn chọn sẵn khi mở modal từ một thẻ bàn cụ thể. */
  defaultTableId?: number
  onClose: () => void
}

/** `datetime-local` cần chuỗi "YYYY-MM-DDTHH:mm" theo giờ ĐỊA PHƯƠNG, không phải ISO/UTC. */
function toLocalInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return (
    `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}` +
    `T${pad(date.getHours())}:${pad(date.getMinutes())}`
  )
}

/**
 * Modal "Đặt bàn trước" (FR-TBL-03).
 *
 * Dùng luồng đặt bàn theo PHIÊN (`POST /table-sessions` kèm nhóm `reservation*`).
 * KHÔNG dùng `POST /tables/{id}/reserve`: luồng đó ghi tên/SĐT vào cột `customer_name`
 * / `customer_phone` mà `TableSessionResponse` không trả về, nên sơ đồ bàn và panel danh
 * sách đặt sẽ trống cột khách — xem docs/be-issues.md mục 2.
 *
 * Hai ràng buộc backend KHÔNG kiểm, phải chặn tại đây:
 *  1. Bàn phải đang trống (BR-29). Backend chỉ chặn khi bàn còn phiên đang hoạt động.
 *  2. Giờ hẹn không được ở quá khứ. Backend không validate, mà `TableSessionScheduler`
 *     sẽ tự huỷ phiên quá giờ giữ chỗ trong vòng 1 phút ⇒ lịch biến mất không báo gì.
 */
export function ReservationModal({
  isOpen,
  availableTables,
  defaultTableId,
  onClose,
}: ReservationModalProps) {
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-md rounded-2xl border border-border-default/60 bg-surface-card p-6 shadow-xl sm:max-w-md gap-0"
      >
        {/* Form đặt ở component con: mỗi lần mở modal là một lần mount mới nên state tự
            khởi tạo lại, không cần effect reset. */}
        <ReservationForm
          availableTables={availableTables}
          defaultTableId={defaultTableId}
          onClose={onClose}
        />
      </DialogContent>
    </Dialog>
  )
}

function ReservationForm({
  availableTables,
  defaultTableId,
  onClose,
}: Omit<ReservationModalProps, "isOpen">) {
  const { toast } = useToast()
  const createSessionMutation = useCreateTableSession()

  // Khởi tạo một lần lúc mount.
  const [minTime] = React.useState(() => toLocalInputValue(new Date()))
  const [tableId, setTableId] = React.useState<number | undefined>(
    () => defaultTableId ?? availableTables[0]?.id,
  )
  const [customerName, setCustomerName] = React.useState("")
  const [customerPhone, setCustomerPhone] = React.useState("")
  const [reservationTime, setReservationTime] = React.useState(() => {
    // Mặc định hẹn sau 1 tiếng cho tròn số, nhân viên sửa lại được.
    const inOneHour = new Date(Date.now() + 60 * 60 * 1000)
    inOneHour.setSeconds(0, 0)
    return toLocalInputValue(inOneHour)
  })
  const [guestCount, setGuestCount] = React.useState(2)
  const [note, setNote] = React.useState("")
  const [error, setError] = React.useState<string | null>(null)

  const selectedTable = availableTables.find((t) => t.id === tableId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)

    if (!tableId) {
      setError("Vui lòng chọn bàn cần đặt.")
      return
    }
    if (!customerName.trim()) {
      setError("Vui lòng nhập tên khách đặt bàn.")
      return
    }
    if (!customerPhone.trim()) {
      setError("Vui lòng nhập số điện thoại khách.")
      return
    }
    if (!reservationTime) {
      setError("Vui lòng chọn giờ hẹn.")
      return
    }
    if (new Date(reservationTime).getTime() < Date.now()) {
      setError("Giờ hẹn phải ở tương lai. Lịch đặt quá giờ sẽ bị hệ thống tự huỷ.")
      return
    }

    try {
      await createSessionMutation.mutateAsync({
        tableId,
        reservationName: customerName.trim(),
        reservationPhone: customerPhone.trim(),
        // Backend nhận LocalDateTime nên gửi nguyên chuỗi giờ địa phương, không đổi sang UTC.
        reservationTime,
        reservedGuestCount: guestCount,
        reservationNote: note.trim() || undefined,
      })
      toast({
        title: "Đã đặt bàn",
        description: `${selectedTable?.name ?? "Bàn"} · ${customerName.trim()}`,
        variant: "success",
      })
      onClose()
    } catch (err) {
      setError(getErrorMessage(err))
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <DialogHeader className="gap-1 text-left">
        <DialogTitle className="flex items-center gap-2 text-xl font-bold text-text-primary">
          <CalendarCheck className="size-5 text-brand-primary" />
          Đặt bàn trước
        </DialogTitle>
        <DialogDescription className="text-sm font-normal text-text-secondary">
          Giữ chỗ cho khách theo giờ hẹn. Bàn sẽ bị khoá cho tới khi khách đến hoặc quá
          giờ giữ chỗ.
        </DialogDescription>
      </DialogHeader>

      <div className="space-y-4">
        {/* Chọn bàn */}
        <div className="space-y-2">
          <label
            htmlFor="reservation-table"
            className="block text-sm font-semibold text-text-primary"
          >
            Bàn <span className="text-status-danger">*</span>
          </label>
          {availableTables.length === 0 ? (
            <p className="rounded-lg bg-surface-muted px-3 py-2.5 text-sm text-text-tertiary">
              Không còn bàn trống để đặt trước.
            </p>
          ) : (
            <select
              id="reservation-table"
              value={tableId ?? ""}
              onChange={(e) => setTableId(Number(e.target.value))}
              className="h-11 w-full rounded-lg border border-border-strong/80 bg-surface-card px-3 text-sm text-text-primary outline-none focus-visible:ring-2 focus-visible:ring-brand-primary/30"
            >
              {availableTables.map((table) => (
                <option key={table.id} value={table.id}>
                  {table.name}
                  {table.capacity ? ` · ${table.capacity} chỗ` : ""}
                </option>
              ))}
            </select>
          )}
        </div>

        {/* Tên + SĐT khách — backend bắt buộc cả hai */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <label
              htmlFor="reservation-name"
              className="block text-sm font-semibold text-text-primary"
            >
              Tên khách <span className="text-status-danger">*</span>
            </label>
            <Input
              id="reservation-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              placeholder="VD: Anh Minh"
              className="h-11 rounded-lg border-border-strong/80 text-sm"
            />
          </div>
          <div className="space-y-2">
            <label
              htmlFor="reservation-phone"
              className="block text-sm font-semibold text-text-primary"
            >
              Số điện thoại <span className="text-status-danger">*</span>
            </label>
            <Input
              id="reservation-phone"
              type="tel"
              inputMode="tel"
              value={customerPhone}
              onChange={(e) => setCustomerPhone(e.target.value)}
              placeholder="09xxxxxxxx"
              className="h-11 rounded-lg border-border-strong/80 text-sm"
            />
          </div>
        </div>

        {/* Giờ hẹn */}
        <div className="space-y-2">
          <label
            htmlFor="reservation-time"
            className="block text-sm font-semibold text-text-primary"
          >
            Giờ hẹn <span className="text-status-danger">*</span>
          </label>
          <Input
            id="reservation-time"
            type="datetime-local"
            value={reservationTime}
            min={minTime}
            onChange={(e) => setReservationTime(e.target.value)}
            className="h-11 rounded-lg border-border-strong/80 text-sm"
          />
        </div>

        {/* Số khách dự kiến */}
        <div className="space-y-2">
          <span className="block text-sm font-semibold text-text-primary">
            Số khách dự kiến
          </span>
          <div className="inline-flex items-center gap-3">
            <button
              type="button"
              onClick={() => setGuestCount((n) => Math.max(1, n - 1))}
              disabled={guestCount <= 1}
              aria-label="Giảm số khách"
              className="flex size-7 items-center justify-center rounded-md border border-border-strong bg-surface-card text-text-secondary transition-colors hover:bg-surface-muted disabled:cursor-not-allowed disabled:opacity-40"
            >
              <Minus className="size-3.5" strokeWidth={2.5} />
            </button>
            <span className="min-w-6 text-center text-base font-bold text-text-primary">
              {guestCount}
            </span>
            <button
              type="button"
              onClick={() => setGuestCount((n) => n + 1)}
              aria-label="Tăng số khách"
              className="flex size-7 items-center justify-center rounded-md border border-brand-primary/40 bg-brand-primary-subtle font-bold text-brand-primary transition-colors hover:border-brand-primary hover:bg-brand-primary-subtle/80"
            >
              <Plus className="size-3.5" strokeWidth={3} />
            </button>
          </div>
        </div>

        {/* Ghi chú */}
        <div className="space-y-2">
          <label
            htmlFor="reservation-note"
            className="block text-sm font-semibold text-text-primary"
          >
            Ghi chú (tuỳ chọn)
          </label>
          <Input
            id="reservation-note"
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="VD: Sinh nhật, cần ghế trẻ em"
            className="h-11 rounded-lg border-border-strong/80 text-sm"
          />
        </div>

        {error ? (
          <p className="rounded-lg border border-status-danger/20 bg-status-danger-subtle px-3 py-2.5 text-sm font-medium text-status-danger">
            {error}
          </p>
        ) : null}

        <div className="flex items-center justify-between border-t border-border-default/60 pt-4">
          <span className="text-sm text-text-secondary">Bàn sẽ chuyển sang trạng</span>
          <span className="inline-flex items-center gap-1.5 rounded-pill border border-[#7F56D9]/40 bg-[#FAF8FF] px-2.5 py-1 text-xs font-semibold text-[#6941C6]">
            <span className="size-1.5 rounded-full bg-[#7F56D9]" />
            Đặt trước
          </span>
        </div>
      </div>

      <div className="flex items-center justify-end gap-3 pt-2">
        <Button type="button" variant="outline" onClick={onClose}>
          Huỷ
        </Button>
        <Button
          type="submit"
          disabled={createSessionMutation.isPending || availableTables.length === 0}
        >
          {createSessionMutation.isPending ? "Đang lưu..." : "Xác nhận đặt bàn"}
        </Button>
      </div>
    </form>
  )
}
