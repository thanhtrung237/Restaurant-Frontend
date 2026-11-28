import * as React from "react"
import { TABLE_DISPLAY_STATUS_LABEL, type TableDisplayStatus } from "@/types/enums"
import type { DiningTable } from "@/types/models"
import { cn } from "@/lib/utils"
import { getTableGuestPath } from "@/app/router/paths/customer.paths"

import { User, QrCode, Printer, Pencil, ExternalLink } from "lucide-react"
import { Button } from "@/components/ui/button"
import { IconButton } from "@/components/ui/icon-button"
import { QRCodeSVG, QRCodeCanvas } from "qrcode.react"

// Kiểu đã chuyển sang `@/types/enums` để nằm cùng chỗ với map nhãn dùng chung;
// re-export ở đây để các nơi đang import từ TableCard không phải sửa.
export type { TableDisplayStatus }

export interface TableCardProps {
  table: DiningTable
  /** Trạng thái hiển thị mở rộng (nếu khác table.status) */
  displayStatus?: TableDisplayStatus
  /** Kiểu hiển thị thẻ: "status" (mặc định cho sơ đồ bàn) hoặc "qr" (cho quản lý bàn & QR) */
  variant?: "status" | "qr"
  /** Tên khu vực bàn (dùng cho variant="qr") */
  areaName?: string
  /** Callback in mã QR */
  onPrintQr?: (table: DiningTable) => void
  /** Callback sửa thông tin bàn */
  onEdit?: (table: DiningTable) => void
  /** Nhãn trạng thái tùy biến ghi đè */
  customStatusLabel?: string
  /** Ghi chú phụ, VD "Nhấn để mở bàn", "— khách · vừa quét QR", "↳ Đã gộp vào B01" */
  subLabel?: string
  /** Số phút đã ngồi — hiện dưới dạng "4 khách · 45 phút" */
  elapsedMinutes?: number
  /** Chuỗi thời gian / lịch hẹn tùy biến, VD "19:00 hôm nay" */
  timeText?: string
  /** Số lượng khách thực tế ngồi bàn (nếu khác table.capacity) */
  guestCount?: number
  /** Tạm tính hoá đơn hiện tại của bàn, VD "320.000VND" hoặc "—" */
  subtotal?: string
  /** Icon phụ góc trên bên phải (cạnh dot trạng thái) */
  topRightIcon?: React.ReactNode
  selected?: boolean
  compactOnMobile?: boolean
  disabled?: boolean
  onClick?: (table: DiningTable) => void
  className?: string
}

/**
 * Bộ màu theo trạng thái bàn — Khớp 100% component "Table Card" trong ảnh Figma:
 * - Nền thẻ bên trong có màu nhạt cùng tông với viền (tinted background) thay vì màu trắng tinh
 * - Viền màu bo nét rõ ràng bao quanh thẻ (Trống: xám nhạt, Chờ mở bàn: xanh dương, Đang phục vụ: đỏ cam, Chờ thanh toán: vàng cam)
 * - Chấm tròn góc trên cùng màu viền (kích thước lớn rõ nét)
 * - Chip pill bo tròn: viền mảnh cùng màu, nền trắng, chữ đậm cùng màu viền
 */
const CARD_STYLE_BY_DISPLAY_STATUS: Record<
  TableDisplayStatus,
  { border: string; dot: string; chip: string; bg: string; defaultLabel: string }
> = {
  AVAILABLE: {
    border: "border-slate-200 dark:border-zinc-800 hover:border-slate-300",
    dot: "bg-[#9CA3AF]",
    chip: "border-slate-200 text-slate-600 bg-white dark:bg-zinc-800",
    bg: "bg-white dark:bg-zinc-900",
    defaultLabel: TABLE_DISPLAY_STATUS_LABEL.AVAILABLE,
  },
  INACTIVE: {
    border: "border-slate-200 dark:border-zinc-800",
    dot: "bg-[#CBD5E1]",
    chip: "border-slate-200 text-slate-400 bg-white dark:bg-zinc-800",
    bg: "bg-[#F8FAFC] dark:bg-zinc-900/40",
    defaultLabel: TABLE_DISPLAY_STATUS_LABEL.INACTIVE,
  },
  WAITING_OPEN: {
    border: "border-[#2E90FA] hover:border-blue-600",
    dot: "bg-[#2E90FA]",
    chip: "border-[#2E90FA] text-[#1570EF] bg-white dark:bg-zinc-800",
    bg: "bg-[#F5F9FF] dark:bg-blue-950/20",
    defaultLabel: TABLE_DISPLAY_STATUS_LABEL.WAITING_OPEN,
  },
  OCCUPIED: {
    border: "border-[#F0522B] hover:border-[#D8431F]",
    dot: "bg-[#F0522B]",
    chip: "border-[#F0522B] text-[#D8431F] bg-white dark:bg-zinc-800",
    bg: "bg-[#FFFAF8] dark:bg-[#F0522B]/10",
    defaultLabel: TABLE_DISPLAY_STATUS_LABEL.OCCUPIED,
  },
  AWAITING_PAYMENT: {
    border: "border-[#F59E0B] hover:border-amber-600",
    dot: "bg-[#F59E0B]",
    chip: "border-[#F59E0B] text-[#D97706] bg-white dark:bg-zinc-800",
    bg: "bg-[#FFFDF5] dark:bg-amber-950/20",
    defaultLabel: TABLE_DISPLAY_STATUS_LABEL.AWAITING_PAYMENT,
  },
  RESERVED: {
    border: "border-[#7F56D9] hover:border-purple-600",
    dot: "bg-[#7F56D9]",
    chip: "border-[#7F56D9] text-[#6941C6] bg-white dark:bg-zinc-800",
    bg: "bg-[#FAF8FF] dark:bg-purple-950/20",
    defaultLabel: TABLE_DISPLAY_STATUS_LABEL.RESERVED,
  },
  MERGED: {
    border: "border-slate-300 dark:border-zinc-700",
    dot: "bg-[#64748B]",
    chip: "border-slate-300 text-slate-500 bg-white dark:bg-zinc-800",
    bg: "bg-[#F8FAFC] dark:bg-zinc-900/60",
    defaultLabel: TABLE_DISPLAY_STATUS_LABEL.MERGED,
  },
}

export function getTableGuestUrl(qrCode: string) {
  const origin = typeof window !== "undefined" ? window.location.origin : "http://localhost:5173"
  return origin + getTableGuestPath(qrCode)
}

/**
 * Mã QR bàn có thể kéo thả (drag & drop) sang tab mới của trình duyệt
 * hoặc click để mở trực tiếp trang gọi món của bàn.
 */
export function DraggableTableQr({
  qrCode,
  tableName,
  size = 80,
}: {
  qrCode: string
  tableName: string
  size?: number
}) {
  const [dataUrl, setDataUrl] = React.useState<string>("")
  const [exportFailed, setExportFailed] = React.useState(false)
  const canvasRef = React.useRef<HTMLCanvasElement | null>(null)
  const tableUrl = getTableGuestUrl(qrCode)

  /**
   * Xuất Data URL từ canvas ngầm để trình duyệt hỗ trợ kéo ảnh và chuột phải lưu ảnh.
   *
   * Thất bại KHÔNG làm mất mã QR: nhánh dự phòng bên dưới vẫn vẽ `QRCodeSVG` quét được
   * bình thường. Thứ mất đi là ảnh PNG — tức thao tác kéo sang tab mới và lưu ảnh.
   */
  const exportDataUrl = React.useCallback(() => {
    if (!canvasRef.current) return
    try {
      setDataUrl(canvasRef.current.toDataURL("image/png"))
      setExportFailed(false)
    } catch (err) {
      // Giữ console.error: nay đã đi kèm khung báo lỗi + nút "Thử lại" cho người dùng.
      console.error("Failed to generate QR data URL", err)
      setDataUrl("")
      setExportFailed(true)
    }
  }, [])

  React.useEffect(() => {
    exportDataUrl()
  }, [exportDataUrl, qrCode, tableUrl])

  const handleDragStart = (e: React.DragEvent) => {
    // Đặt dataTransfer để khi kéo lên thanh Tab của Chrome/Edge sẽ mở tab mới đến URL bàn
    e.dataTransfer.setData("text/uri-list", tableUrl)
    e.dataTransfer.setData("text/plain", tableUrl)
  }

  return (
    <div className="relative group/qr flex flex-col items-center">
      {/* Hidden canvas để xuất ảnh PNG dataURL */}
      <div className="hidden">
        <QRCodeCanvas
          ref={canvasRef}
          value={tableUrl}
          size={size * 2}
          bgColor="#ffffff"
          fgColor="#111111"
          level="M"
        />
      </div>

      <a
        href={tableUrl}
        target="_blank"
        rel="noopener noreferrer"
        draggable={true}
        onDragStart={handleDragStart}
        title={`Kéo sang tab mới hoặc click để mở trang gọi món của ${tableName}`}
        className="rounded-md bg-white p-1 shadow-2xs hover:ring-2 hover:ring-brand-primary/50 transition-all cursor-grab active:cursor-grabbing block relative overflow-hidden"
      >
        {dataUrl ? (
          <img
            src={dataUrl}
            alt={`Mã QR ${tableName}`}
            style={{ width: size, height: size }}
            className="block select-none pointer-events-auto"
            draggable={true}
          />
        ) : (
          <QRCodeSVG value={tableUrl} size={size} bgColor="#ffffff" fgColor="#111111" level="M" />
        )}

        {/* Hover hint icon */}
        <div className="absolute inset-0 bg-black/15 opacity-0 group-hover/qr:opacity-100 flex items-center justify-center rounded-md transition-opacity pointer-events-none">
          <ExternalLink className="size-4 text-white drop-shadow-md" />
        </div>
      </a>

      {/* Chỉ xuất ảnh PNG lỗi — mã QV phía trên vẫn quét và in được, nên báo ở dạng
          dải cảnh báo nhỏ thay vì che mất mã. `print:hidden` để không lọt vào bản in. */}
      {exportFailed ? (
        <div className="mt-1 flex items-center gap-1.5 rounded-md bg-status-warning-subtle px-1.5 py-1 print:hidden">
          <span className="text-[10px] font-medium leading-tight text-status-warning">
            Không tạo được ảnh QR
          </span>
          <button
            type="button"
            onClick={(e) => {
              // Thẻ nằm trong <a>; chặn để bấm "Thử lại" không mở trang gọi món.
              e.preventDefault()
              e.stopPropagation()
              exportDataUrl()
            }}
            className="shrink-0 rounded px-1 text-[10px] font-bold text-brand-primary underline underline-offset-2 hover:text-brand-primary-hover cursor-pointer"
          >
            Thử lại
          </button>
        </div>
      ) : null}
    </div>
  )
}

/**
 * TableCard — Khớp 100% component "Table Card" trong Figma:
 * - Hàng 1: Tên bàn (B01...) bên trái, góc phải là icon phụ (nếu có) + chấm tròn trạng thái.
 * - Hàng 2: Chip bo tròn (pill) viền mảnh màu chuẩn.
 * - Hàng 3: Dòng thông tin phụ: "4 khách · 45 phút", "— khách · vừa quét QR", "Nhấn để mở bàn"...
 * - Hàng cuối: "Tạm tính" (trái) và số tiền (phải, font-bold text-text-primary).
 */
export function TableCard({
  table,
  displayStatus,
  customStatusLabel,
  subLabel,
  elapsedMinutes,
  timeText,
  guestCount,
  subtotal,
  topRightIcon,
  selected,
  onClick,
  className,
  variant = "status",
  compactOnMobile = false,
  disabled = false,
  areaName,
  onPrintQr,
  onEdit,
}: TableCardProps) {
  // Giao diện riêng cho màn hình Quản lý bàn & QR theo Figma Desktop / Quản lý bàn & QR.png
  if (variant === "qr") {
    const isAvailable = table.status === "AVAILABLE"
    const isInactive = table.status === "INACTIVE"
    return (
      <div
        className={cn(
          "group relative flex flex-col justify-between rounded-card border border-border-default bg-surface-card p-4 transition-all duration-200 shadow-2xs hover:shadow-xs",
          className,
        )}
      >
        <div>
          {/* Hàng 1: Mã bàn + chấm trạng thái */}
          <div className="flex w-full items-center justify-between">
            <span className="text-base font-bold text-text-primary tracking-tight">
              {table.name}
            </span>
            <span
              className={cn(
                "size-2 rounded-full shrink-0",
                isAvailable ? "bg-status-success" : "bg-border-strong",
              )}
            />
          </div>

          {/* Hàng 2: Số chỗ · Khu vực */}
          <div className="mt-1 flex items-center gap-1.5 text-xs text-text-tertiary">
            <User className="size-3.5 shrink-0" />
            <span>
              {table.capacity} chỗ · {areaName || "Chưa phân khu"}
            </span>
          </div>

          {/* Hàng 3: Mã QR — Cho phép kéo thả ra tab khác hoặc click để mở trang gọi món */}
          <div className="my-3.5 flex items-center justify-center rounded-xl bg-surface-muted h-[104px] text-text-primary p-2 overflow-hidden">
            {isInactive ? (
              <span className="text-center text-sm font-medium text-text-secondary">
                Ngừng sử dụng
              </span>
            ) : table.qrCode ? (
              <DraggableTableQr qrCode={table.qrCode} tableName={table.name} size={76} />
            ) : (
              <QrCode className="size-10 stroke-[1.75] text-text-tertiary" />
            )}
          </div>
        </div>

        {/* Hàng 4: Thao tác In QR + Sửa */}
        <div className="flex items-center gap-2 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isInactive}
            onClick={() => onPrintQr?.(table)}
            className="flex-1 h-9 rounded-xl border-border-default bg-surface-card text-xs font-medium text-text-primary hover:bg-surface-muted hover:border-border-strong cursor-pointer"
          >
            <Printer className="size-3.5 mr-1.5" />
            In QR
          </Button>
          <IconButton
            type="button"
            variant="subtle"
            size="sm"
            onClick={() => onEdit?.(table)}
            className="rounded-xl text-text-secondary hover:text-text-primary cursor-pointer size-9"
            title="Chỉnh sửa bàn"
            aria-label="Chỉnh sửa bàn"
          >
            <Pencil className="size-4" />
          </IconButton>
        </div>
      </div>
    )
  }

  const currentStatus: TableDisplayStatus = displayStatus || table.status
  const style =
    CARD_STYLE_BY_DISPLAY_STATUS[currentStatus] || CARD_STYLE_BY_DISPLAY_STATUS.AVAILABLE

  // Nhãn chip PHẢI theo currentStatus (displayStatus mở rộng), không phải table.status thô —
  // vì table.status chỉ mang nghĩa VẬT LÝ (BE set OCCUPIED ngay khi có session WAITING_FOR_OPEN/
  // WAITING_FOR_PAY). style.defaultLabel đã map đúng nhãn cho cả 7 trạng thái hiển thị.
  const statusText = customStatusLabel || style.defaultLabel

  // Tạo dòng thông tin khách & thời gian nếu không truyền subLabel tường minh
  let calculatedInfoLine: string | null = null
  if (!subLabel) {
    const guests = guestCount ?? table.capacity
    if (timeText) {
      calculatedInfoLine = `${timeText}${guests ? ` · ${guests} khách` : ""}`
    } else if (guests && elapsedMinutes !== undefined) {
      calculatedInfoLine = `${guests} khách · ${elapsedMinutes} phút`
    } else if (guests && currentStatus === "OCCUPIED") {
      calculatedInfoLine = `${guests} khách`
    } else if (guestCount && currentStatus === "AWAITING_PAYMENT") {
      calculatedInfoLine = `${guestCount} khách`
    }
  }

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick ? () => onClick(table) : undefined}
      className={cn(
        "group relative flex w-full flex-col rounded-[16px] border-[1.5px] text-left transition-colors cursor-pointer shadow-xs focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-primary disabled:cursor-default",
        compactOnMobile ? "min-h-24 min-w-0 p-2.5 lg:min-h-48 lg:p-5" : "h-48 p-5",
        style.border,
        style.bg,
        selected && "ring-2 ring-brand-primary ring-offset-2",
        className,
      )}
    >
      {/* Hàng 1: Tên bàn + Chấm tròn trạng thái góc trên phải */}
      <div className="flex w-full items-start justify-between gap-1.5">
        <span
          className={cn(
            "min-w-0 break-words font-bold tracking-tight text-text-primary",
            compactOnMobile ? "text-base leading-snug lg:text-2xl" : "text-2xl",
          )}
        >
          {table.name}
        </span>
        <div className="flex items-center gap-1.5 shrink-0">
          {topRightIcon}
          <span
            className={cn(
              "rounded-full",
              compactOnMobile ? "mt-1 size-2.5 lg:size-3.5" : "size-3.5",
              style.dot,
            )}
          />
        </div>
      </div>

      <div
        className={cn(
          "flex w-full flex-wrap items-center gap-x-2 gap-y-0.5",
          compactOnMobile ? "mt-1 lg:mt-2" : "mt-2",
        )}
      >
        <span
          className={cn(
            "inline-flex max-w-full items-center rounded-pill border py-0.5 text-xs font-semibold shadow-2xs",
            compactOnMobile
              ? "px-1.5 leading-tight lg:px-3.5 lg:leading-normal"
              : "px-3.5 tracking-wide",
            style.chip,
          )}
        >
          {statusText}
        </span>
        {table.capacity != null && table.capacity > 0 ? (
          <span className="whitespace-nowrap text-xs font-medium text-text-secondary">
            {table.capacity} chỗ
          </span>
        ) : null}
      </div>

      {/* Hàng 3: Dòng thông tin phụ (Số khách · Số phút / Nhấn để mở bàn / vừa quét QR) */}
      <div
        className={cn(
          "break-words font-medium",
          compactOnMobile
            ? "mt-1 text-xs text-text-secondary lg:mt-3.5 lg:min-h-5 lg:text-sm"
            : "mt-3.5 min-h-5 text-sm text-text-tertiary",
        )}
      >
        {subLabel || calculatedInfoLine}
      </div>

      {/* Hàng cuối: Tạm tính */}
      {subtotal !== undefined ? (
        <div
          className={cn(
            "mt-auto flex w-full flex-wrap items-center justify-between gap-x-2 pt-2",
            compactOnMobile && subtotal === "—" && "hidden lg:flex",
          )}
        >
          <span className="text-sm text-[#94A3B8] dark:text-zinc-500">Tạm tính</span>
          <span
            className={cn(
              "font-bold text-text-primary",
              compactOnMobile ? "text-sm lg:text-xl" : "text-xl",
            )}
          >
            {subtotal}
          </span>
        </div>
      ) : null}
    </button>
  )
}
