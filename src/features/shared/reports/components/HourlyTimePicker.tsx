import { Clock } from "lucide-react"
import { cn } from "@/lib/utils"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export interface HourlyTimePickerProps {
  startHour: number
  endHour: number
  onStartHourChange: (hour: number) => void
  onEndHourChange: (hour: number) => void
  /**
   * "toolbar" — nút viền chữ nhật trong thanh công cụ của header trang (PC/Tablet).
   * "chip"    — viên thuốc gọn cho header mobile.
   */
  variant?: "toolbar" | "chip"
  className?: string
}

/**
 * HourlyTimePicker — Bộ chọn khung giờ cho báo cáo theo khung giờ.
 * 
 * Hiển thị "8h – 18h" và cho phép người dùng chọn giờ bắt đầu và kết thúc (0-23).
 */
export function HourlyTimePicker({
  startHour,
  endHour,
  onStartHourChange,
  onEndHourChange,
  variant = "toolbar",
  className,
}: HourlyTimePickerProps) {
  const hours = Array.from({ length: 24 }, (_, i) => i)

  const displayText = `${startHour}h – ${endHour}h`

  const handleStartHourChange = (value: string) => {
    const hour = parseInt(value, 10)
    onStartHourChange(hour)
    // Auto-adjust endHour if it's now less than startHour
    if (endHour < hour) {
      onEndHourChange(hour)
    }
  }

  const handleEndHourChange = (value: string) => {
    const hour = parseInt(value, 10)
    // Prevent setting end hour less than start hour
    if (hour >= startHour) {
      onEndHourChange(hour)
    }
  }

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "flex items-center gap-2 transition-colors",
            variant === "toolbar"
              ? "rounded-xl border border-border-default/90 bg-surface-card px-4 py-2 text-sm font-medium text-text-primary shadow-2xs hover:bg-surface-muted"
              : "rounded-pill bg-surface-muted px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-border-strong",
            className
          )}
        >
          <Clock
            className={cn(
              "shrink-0 text-text-tertiary",
              variant === "toolbar" ? "size-4" : "size-3.5"
            )}
          />
          <span className="truncate">{displayText}</span>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-64 p-4" align="end">
        <div className="space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Từ giờ
            </label>
            <Select
              value={String(startHour)}
              onValueChange={handleStartHourChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn giờ bắt đầu" />
              </SelectTrigger>
              <SelectContent>
                {hours.map((h) => (
                  <SelectItem key={h} value={String(h)}>
                    {h}h
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-text-primary">
              Đến giờ
            </label>
            <Select
              value={String(endHour)}
              onValueChange={handleEndHourChange}
            >
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Chọn giờ kết thúc" />
              </SelectTrigger>
              <SelectContent>
                {hours
                  .filter((h) => h >= startHour)
                  .map((h) => (
                    <SelectItem key={h} value={String(h)}>
                      {h}h
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
