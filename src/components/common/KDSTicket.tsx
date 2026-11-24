import { Scale } from "lucide-react"
import type { MouseEventHandler } from "react"
import { cn } from "@/lib/utils"

export type KDSTicketStatus = "pending" | "cooking" | "served" | "weighing" | "custom"

export interface KDSTicketProps {
  tableId: number
  tableName: string
  timeAgo: string
  dishName: string
  quantity?: number
  /** Ghi chú món (VD "Ít cay", "Không rau") — hiển thị màu cam như Figma */
  note?: string
  /** Dòng hướng dẫn phụ (VD "Bán theo cân · cần cân trước khi gửi bếp") */
  hint?: string
  /** Các tùy chọn đã chọn (size, topping, etc.) */
  options?: Array<{
    id: number
    optionItemId: number
    optionItemName: string
    priceSnapshot: number
  }>
  /** Nhãn trạng thái phụ hiển thị phía trên header (VD "Chờ cân") */
  badgeLabel?: string
  status?: KDSTicketStatus
  actionLabel?: string
  onAction?: MouseEventHandler<HTMLButtonElement>
  className?: string
}

const tableLabelColors = [
  "bg-sky-100 text-sky-950",
  "bg-emerald-100 text-emerald-950",
  "bg-violet-100 text-violet-950",
  "bg-rose-100 text-rose-950",
  "bg-cyan-100 text-cyan-950",
  "bg-indigo-100 text-indigo-950",
]

export function KDSTicket({
  tableId,
  tableName,
  timeAgo,
  dishName,
  quantity,
  note,
  hint,
  options,
  badgeLabel,
  status = "pending",
  actionLabel,
  onAction,
  className,
}: KDSTicketProps) {
  const tableLabel = /^\d+$/.test(tableName.trim()) ? `Bàn ${tableName.trim()}` : tableName
  // Tự động chọn nhãn và màu nút theo status nếu không chỉ định actionLabel
  let buttonLabel = actionLabel
  let buttonClass = ""

  switch (status) {
    case "pending":
      buttonLabel = buttonLabel ?? "Xác nhận"
      buttonClass = "bg-blue-700 text-white hover:bg-blue-800"
      break
    case "cooking":
      // Đặc tả: bếp KHÔNG thao tác trên hệ thống. Phục vụ là người chuyển
      // ĐANG CHẾ BIẾN → ĐÃ PHỤC VỤ, nên nhãn nút là "Đã phục vụ" (không phải
      // "Đánh dấu xong" — chữ đó ngụ ý bếp bấm báo nấu xong).
      buttonLabel = buttonLabel ?? "Đã phục vụ"
      buttonClass = "bg-amber-100 text-amber-950 hover:bg-amber-200"
      break
    case "served":
      buttonLabel = buttonLabel ?? "Đã phục vụ"
      buttonClass =
        "border border-status-success bg-transparent text-status-success hover:bg-status-success-subtle active:bg-status-success-subtle/80"
      break
    case "weighing":
      buttonLabel = buttonLabel ?? "Nhập số cân"
      buttonClass = "bg-amber-800 text-white hover:bg-amber-900"
      break
    default:
      buttonLabel = buttonLabel ?? "Thao tác"
      buttonClass = "bg-brand-primary text-white hover:bg-brand-primary-hover"
  }

  return (
    <article
      className={cn(
        "flex min-w-0 flex-col gap-2 rounded-card border border-border-default bg-surface-card px-3 py-2.5",
        status === "weighing" && "border-status-warning/50 bg-status-warning-subtle/40",
        className,
      )}
    >
      <div className="flex flex-wrap items-center justify-between gap-x-2 gap-y-1 text-xs text-text-secondary">
        <div className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-1">
          <span
            className={cn(
              "min-w-0 max-w-full rounded-md px-2 py-0.5 text-base font-bold leading-snug tabular-nums [overflow-wrap:anywhere] sm:text-lg",
              tableLabelColors[tableId % tableLabelColors.length],
            )}
          >
            {tableLabel}
          </span>
          {badgeLabel ? (
            <span className="rounded bg-amber-100 px-1.5 py-0.5 font-semibold text-amber-950">
              {badgeLabel}
            </span>
          ) : null}
        </div>
        <span className="shrink-0 tabular-nums">{timeAgo}</span>
      </div>
      <div className="flex min-w-0 items-center justify-between gap-2">
        <h3 className="min-w-0 break-words text-sm font-bold leading-snug text-text-primary">
          {quantity ?? 1}× {dishName}
        </h3>
        <button
          type="button"
          onClick={onAction}
          className={cn(
            "min-h-11 shrink-0 cursor-pointer rounded-md px-3 text-xs font-bold transition-colors outline-none focus-visible:ring-2 focus-visible:ring-brand-primary focus-visible:ring-offset-2",
            buttonClass,
          )}
        >
          {buttonLabel}
        </button>
      </div>

      {options?.length || note || hint ? (
        <div className="space-y-1 break-words text-xs text-text-secondary">
          {options?.length ? (
            <p>{options.map((option) => option.optionItemName).join(" · ")}</p>
          ) : null}
          {note ? <p className="font-semibold text-orange-900">Ghi chú: {note}</p> : null}
          {hint ? (
            <p className="flex items-start gap-1">
              {status === "weighing" ? (
                <Scale aria-hidden="true" className="size-3.5 shrink-0" />
              ) : null}
              <span className="min-w-0">{hint}</span>
            </p>
          ) : null}
        </div>
      ) : null}
    </article>
  )
}
