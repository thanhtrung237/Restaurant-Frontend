import * as React from "react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Minus, Plus } from "lucide-react"
import type { DiningTable, TableSession } from "@/types/models"
import {
  useCreateTableSession,
  openSessionLegacy,
  useConfirmOpenSession,
} from "@/features/shared/floor-ops/api"
import { useAuthStore } from "@/stores/auth.store"
import { useToast } from "@/hooks/use-toast"

interface OpenTableModalProps {
  isOpen: boolean
  table: DiningTable | null
  session?: TableSession | null // Session nếu bàn đang ở trạng thái WAITING_FOR_OPEN
  onClose: () => void
  onConfirm?: (id: number, guestCount: number, note?: string) => void
}

/**
 * OpenTableModal — Khớp 100% modal "Mở bàn" trong Figma (Desktop / Mở bàn):
 * - Tiêu đề: "Mở bàn {Tên bàn}" hoặc "Xác nhận mở bàn {Tên bàn}" (nếu có session)
 * - Phụ đề: "Khu vực tầng 1 · Sức chứa {N} khách"
 * - Bộ đếm số lượng khách: nút - / + màu cam thương hiệu
 * - Ô nhập ghi chú (tùy chọn)
 * - Dòng thông báo trạng thái: "Bàn sẽ chuyển sang trạng [• Đang phục vụ]"
 * - Nút Hủy và Xác nhận mở bàn (cam brand)
 *
 * API:
 * - Nếu table có session WAITING_FOR_OPEN: gọi POST /table-sessions/{id}/confirm-open
 * - Nếu không: gọi POST /table-sessions/legacy để mở bàn ngay
 */
export function OpenTableModal({ isOpen, table, session, onClose }: OpenTableModalProps) {
  const { toast } = useToast()
  const branchId = useAuthStore((s) => s.branchId)
  const [guestCount, setGuestCount] = React.useState<number>(2)
  const [note, setNote] = React.useState<string>("")

  const createSessionMutation = useCreateTableSession()
  const confirmOpenMutation = useConfirmOpenSession()

  // Kiểm tra xem có phải là xác nhận mở bàn hay không
  const isConfirmMode = !!session

  // Reset dữ liệu mỗi khi mở modal bàn mới.
  // Nếu bàn đã có session (khách đã gửi yêu cầu mở bàn) → lấy số khách/ghi chú khách đã
  // nhập từ session đó, KHÔNG lấy table.capacity (đó là sức chứa tối đa của bàn, không
  // phải số khách thực tế khách chọn).
  React.useEffect(() => {
    if (table) {
      setGuestCount(session?.guestCount ?? table.capacity ?? 2)
      setNote(session?.note ?? "")
    }
  }, [table, session, isOpen])

  if (!table) return null

  function handleDecrement() {
    if (guestCount > 1) {
      setGuestCount((prev) => prev - 1)
    }
  }

  function handleIncrement() {
    const maxCapacity = (table?.capacity ?? 4) * 2 // cho phép xếp thêm khách phụ
    if (guestCount < maxCapacity) {
      setGuestCount((prev) => prev + 1)
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!table || !branchId) return

    try {
      if (isConfirmMode && session) {
        // Bàn đã có session WAITING_FOR_OPEN/RESERVED (khách đã quét QR hoặc đã đặt trước)
        // → phải xác nhận session đó, KHÔNG được tạo session mới qua /legacy (sẽ 409 Conflict)
        await confirmOpenMutation.mutateAsync({
          id: session.id,
          body: {
            guestCount,
            note: note.trim() || undefined,
          },
        })
      } else {
        // Bàn trống, chưa có session nào → nhân viên mở tại quầy (walk-in)
        await openSessionLegacy({
          tableId: table.id,
          guestCount,
          note: note.trim() || undefined,
        })
      }

      toast({
        title: "Mở bàn thành công",
        description: `Bàn ${table.name} đã chuyển sang trạng thái Đang phục vụ (${guestCount} khách).`,
        variant: "success",
      })

      onClose()
    } catch (error) {
      toast({
        title: "Lỗi mở bàn",
        description: error instanceof Error ? error.message : "Không thể mở bàn, vui lòng thử lại.",
        variant: "danger",
      })
    }
  }

  const subtitle = `${table.areaName || "Khu vực tầng 1"} · Sức chứa ${table.capacity ?? 4} khách`

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent
        showCloseButton={false}
        className="w-full max-w-md rounded-2xl border border-border-default/60 bg-surface-card p-6 shadow-xl sm:max-w-md gap-0"
      >
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Header */}
          <DialogHeader className="gap-1 text-left">
            <DialogTitle className="text-xl font-bold text-text-primary">
              {isConfirmMode ? "Xác nhận mở bàn" : "Mở bàn"} {table.name}
            </DialogTitle>
            <DialogDescription className="text-sm font-normal text-text-secondary">
              {subtitle}
            </DialogDescription>
          </DialogHeader>

          {/* Body */}
          <div className="space-y-5">
            {/* Field: Số lượng khách */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-primary block">
                Số lượng khách
              </label>
              <div className="flex items-center gap-4">
                <div className="inline-flex items-center gap-3">
                  <button
                    type="button"
                    onClick={handleDecrement}
                    disabled={guestCount <= 1}
                    className="flex size-7 items-center justify-center rounded-md border border-border-strong bg-surface-card text-text-secondary transition-colors hover:bg-surface-muted disabled:opacity-40 disabled:cursor-not-allowed"
                    aria-label="Giảm số lượng"
                  >
                    <Minus className="size-3.5" strokeWidth={2.5} />
                  </button>
                  <span className="min-w-6 text-center text-base font-bold text-text-primary">
                    {guestCount}
                  </span>
                  <button
                    type="button"
                    onClick={handleIncrement}
                    className="flex size-7 items-center justify-center rounded-md border border-brand-primary/40 bg-brand-primary-subtle text-brand-primary font-bold transition-colors hover:bg-brand-primary-subtle/80 hover:border-brand-primary"
                    aria-label="Tăng số lượng"
                  >
                    <Plus className="size-3.5" strokeWidth={3} />
                  </button>
                </div>
              </div>
            </div>

            {/* Field: Ghi chú */}
            <div className="space-y-2">
              <label className="text-sm font-semibold text-text-primary block">
                Ghi chú (tùy chọn)
              </label>
              <Input
                type="text"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                placeholder="VD: Khách quen, cần ghế trẻ em"
                className="h-11 rounded-lg border-border-strong/80 bg-surface-card text-sm text-text-primary placeholder:text-text-tertiary focus-visible:ring-brand-primary/30"
              />
            </div>

            {/* Trạng thái chuyển đổi */}
            <div className="flex items-center justify-between border-t border-border-default/60 pt-4">
              <span className="text-sm text-text-secondary">Bàn sẽ chuyển sang trạng</span>
              <span className="inline-flex items-center gap-1.5 rounded-pill border border-[#F04438]/40 bg-[#FEEDEC] px-2.5 py-1 text-xs font-semibold text-[#F04438]">
                <span className="size-1.5 rounded-full bg-[#F04438]" />
                Đang phục vụ
              </span>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              className="h-10 min-w-20 rounded-button border-border-strong text-text-secondary hover:bg-surface-muted hover:text-text-primary"
            >
              Hủy
            </Button>
            <Button
              type="submit"
              disabled={createSessionMutation.isPending || confirmOpenMutation.isPending}
              className="h-10 rounded-button bg-brand-primary px-5 font-semibold text-text-on-brand hover:bg-brand-primary-hover shadow-xs disabled:opacity-50"
            >
              {createSessionMutation.isPending || confirmOpenMutation.isPending
                ? "Đang xử lý..."
                : "Xác nhận mở bàn"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
