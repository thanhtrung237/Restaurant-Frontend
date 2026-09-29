import * as React from "react"
import { Calendar as CalendarIcon } from "lucide-react"
import { format } from "date-fns"
import { vi } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"

export interface TimeRangeDropdownProps {
  value: string // Ngày theo định dạng "dd/MM/yyyy"
  onChange: (dateString: string) => void // Callback nhận ngày theo định dạng "dd/MM/yyyy"
  /**
   * "toolbar" — nút viền chữ nhật trong thanh công cụ của header trang (PC/Tablet).
   * "chip"    — viên thuốc gọn cho header mobile, theo Figma "Báo cáo · Mobile (375)".
   */
  variant?: "toolbar" | "chip"
  className?: string
}

/**
 * Bộ chọn ngày báo cáo (Date Picker).
 *
 * Thay thế dropdown khoảng thời gian chung chung bằng calendar để chọn ngày cụ thể.
 */
export function TimeRangeDropdown({
  value,
  onChange,
  variant = "toolbar",
  className,
}: TimeRangeDropdownProps) {
  const [open, setOpen] = React.useState(false)
  const [tempDate, setTempDate] = React.useState<Date | undefined>()

  // Parse value string to Date object
  const selectedDate = React.useMemo(() => {
    try {
      const [day, month, year] = value.split("/")
      return new Date(Number(year), Number(month) - 1, Number(day))
    } catch {
      return new Date()
    }
  }, [value])

  // Initialize temp date when popover opens
  React.useEffect(() => {
    if (open) {
      setTempDate(selectedDate)
    }
  }, [open, selectedDate])

  const handleSelect = (date: Date | undefined) => {
    setTempDate(date)
  }

  const handleConfirm = () => {
    if (tempDate) {
      const formatted = format(tempDate, "dd/MM/yyyy", { locale: vi })
      onChange(formatted)
    }
    setOpen(false)
  }

  const handleCancel = () => {
    setTempDate(selectedDate)
    setOpen(false)
  }

  const displayText = React.useMemo(() => {
    try {
      return format(selectedDate, "dd/MM/yyyy", { locale: vi })
    } catch {
      return value
    }
  }, [selectedDate, value])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          className={cn(
            "flex items-center gap-2 transition-colors justify-start text-left font-normal",
            variant === "toolbar"
              ? "rounded-xl border border-border-default/90 bg-surface-card px-4 py-2 text-sm font-medium text-text-primary shadow-2xs hover:bg-surface-muted h-auto"
              : "rounded-pill bg-surface-muted px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-border-strong h-auto",
            className
          )}
        >
          <CalendarIcon
            className={cn(
              "shrink-0 text-text-tertiary",
              variant === "toolbar" ? "size-4" : "size-3.5"
            )}
          />
          <span className="truncate">{displayText}</span>
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="center" side="bottom">
        <div className="flex flex-col">
          <Calendar
            mode="single"
            selected={tempDate}
            onSelect={handleSelect}
            locale={vi}
          />
          <div className="flex items-center justify-end gap-2 border-t border-border-default p-3">
            <Button
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="text-sm"
            >
              Hủy
            </Button>
            <Button
              size="sm"
              onClick={handleConfirm}
              disabled={!tempDate}
              className="bg-brand-primary text-text-on-brand hover:bg-brand-primary-hover text-sm"
            >
              Xác nhận
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
