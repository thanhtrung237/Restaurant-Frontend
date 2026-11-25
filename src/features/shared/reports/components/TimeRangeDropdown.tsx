import * as React from "react"
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  ChevronDown,
  ArrowRight,
} from "lucide-react"
import {
  format,
  subDays,
  addMonths,
  startOfDay,
  endOfDay,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  differenceInCalendarDays,
  isSameDay,
  isAfter,
  isBefore,
} from "date-fns"
import { vi } from "date-fns/locale"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

export interface DateRangeValue {
  from: Date
  to: Date
}

export type PresetKey =
  "today" | "yesterday" | "7days" | "thisMonth" | "thisYear" | "lastYear" | "custom"

interface PresetOption {
  key: PresetKey
  label: string
  getRange: (now: Date) => { from: Date; to: Date }
}

export const PRESET_OPTIONS: PresetOption[] = [
  {
    key: "today",
    label: "Hôm nay",
    getRange: (now) => ({
      from: startOfDay(now),
      to: endOfDay(now),
    }),
  },
  {
    key: "yesterday",
    label: "Hôm qua",
    getRange: (now) => {
      const y = subDays(now, 1)
      return {
        from: startOfDay(y),
        to: endOfDay(y),
      }
    },
  },
  {
    key: "7days",
    label: "7 ngày",
    getRange: (now) => ({
      from: startOfDay(subDays(now, 6)),
      to: endOfDay(now),
    }),
  },
  {
    key: "thisMonth",
    label: "Tháng này",
    getRange: (now) => ({
      from: startOfMonth(now),
      to: endOfDay(now),
    }),
  },
  {
    key: "thisYear",
    label: "Năm nay",
    getRange: (now) => ({
      from: new Date(now.getFullYear(), 0, 1),
      to: endOfDay(now),
    }),
  },
  {
    key: "lastYear",
    label: "Năm trước",
    getRange: (now) => ({
      from: new Date(now.getFullYear() - 1, 0, 1),
      to: endOfDay(new Date(now.getFullYear() - 1, 11, 31)),
    }),
  },
]

export function detectActivePreset(from: Date, to: Date, now: Date): PresetKey {
  for (const p of PRESET_OPTIONS) {
    const r = p.getRange(now)
    if (isSameDay(from, r.from) && isSameDay(to, r.to)) {
      return p.key
    }
  }
  return "custom"
}

export interface TimeRangeDropdownProps {
  range: DateRangeValue
  onChangeRange: (range: DateRangeValue) => void
  variant?: "toolbar" | "chip"
  className?: string
}

/**
 * Component Date Range Picker được tối ưu UI/UX cao cấp:
 * - Kích thước gọn gàng (~390px), bố cục cân đối, thanh thoát.
 * - Lưới chọn nhanh (Presets Grid) 2 hàng tiện lợi.
 * - Lịch 1 tháng với điều hướng tháng rõ ràng, mượt mà.
 * - Ngày bắt đầu & kết thúc là nút tròn nổi bật (Màu cam đậm thương hiệu).
 * - Dải ngày ở giữa dùng dải nền cam pastel nhạt dịu mắt, không bị khối màu chói.
 * - Chặn chọn ngày tương lai đối với báo cáo doanh thu.
 * - Chỉ commit và gửi API khi bấm "Áp dụng".
 */
export function TimeRangeDropdown({
  range,
  onChangeRange,
  variant = "toolbar",
  className,
}: TimeRangeDropdownProps) {
  const [open, setOpen] = React.useState(false)

  // Draft state while popover is open
  const [tempFrom, setTempFrom] = React.useState<Date>(range.from)
  const [tempTo, setTempTo] = React.useState<Date | null>(range.to)
  const [hoverDate, setHoverDate] = React.useState<Date | null>(null)
  const [pickingStep, setPickingStep] = React.useState<"from" | "to">("from")

  // Current month displayed in the calendar
  const [viewingMonth, setViewingMonth] = React.useState<Date>(range.to || range.from)

  const now = React.useMemo(() => new Date(), [])
  const currentYear = now.getFullYear()
  const viewingYear = viewingMonth.getFullYear()
  const earliestYear = Math.min(currentYear - 99, range.from.getFullYear(), viewingYear)
  const years = Array.from(
    { length: currentYear - earliestYear + 1 },
    (_, index) => currentYear - index,
  )

  function goToCalendarMonth(year: number, month: number) {
    setHoverDate(null)
    setViewingMonth(
      new Date(year, year === currentYear ? Math.min(month, now.getMonth()) : month, 1),
    )
  }

  // Sync state whenever popover opens or active range changes
  React.useEffect(() => {
    if (open) {
      setTempFrom(range.from)
      setTempTo(range.to)
      setHoverDate(null)
      setPickingStep("from")
      setViewingMonth(range.to || range.from)
    }
  }, [open, range])

  // Detect which preset matches the draft selection
  const activePresetKey = React.useMemo(() => {
    if (!tempFrom || !tempTo) return "custom"
    return detectActivePreset(tempFrom, tempTo, now)
  }, [tempFrom, tempTo, now])

  // Handle clicking a preset
  const handlePresetClick = (preset: PresetOption) => {
    const r = preset.getRange(now)
    setTempFrom(r.from)
    setTempTo(r.to)
    setViewingMonth(r.to)
    setPickingStep("from")
  }

  // Handle clicking a day on the calendar grid
  const handleDayClick = (day: Date) => {
    if (isAfter(startOfDay(day), startOfDay(now))) {
      return // Prevent clicking future dates
    }

    if (pickingStep === "from" || !tempFrom) {
      // Step 1: select start date
      setTempFrom(day)
      setTempTo(null)
      setPickingStep("to")
    } else {
      // Step 2: select end date
      if (isBefore(day, tempFrom)) {
        // If clicked date is before start date, restart with new start date
        setTempFrom(day)
        setTempTo(null)
        setPickingStep("to")
      } else {
        setTempTo(day)
        setPickingStep("from")
      }
    }
  }

  // Handle Apply button
  const handleApply = () => {
    if (!tempFrom) return
    const finalTo = tempTo || tempFrom
    onChangeRange({
      from: tempFrom,
      to: finalTo,
    })
    setOpen(false)
  }

  // Handle Cancel button
  const handleCancel = () => {
    setTempFrom(range.from)
    setTempTo(range.to)
    setOpen(false)
  }

  // Generate calendar days for the viewing month
  const calendarDays = React.useMemo(() => {
    const monthStart = startOfMonth(viewingMonth)
    const monthEnd = endOfMonth(monthStart)
    const startDate = startOfWeek(monthStart, { weekStartsOn: 1 }) // Monday start
    const endDate = endOfWeek(monthEnd, { weekStartsOn: 1 })

    return eachDayOfInterval({ start: startDate, end: endDate })
  }, [viewingMonth])

  // Summary Text
  const summaryText = React.useMemo(() => {
    if (!tempFrom) return "Vui lòng chọn ngày bắt đầu"
    const fromStr = format(tempFrom, "dd/MM/yyyy", { locale: vi })
    if (!tempTo) {
      return (
        <span className="text-brand-primary font-medium">
          Từ: <strong>{fromStr}</strong> (Chọn tiếp ngày kết thúc)
        </span>
      )
    }
    const toStr = format(tempTo, "dd/MM/yyyy", { locale: vi })
    const days = differenceInCalendarDays(tempTo, tempFrom) + 1
    return (
      <span className="text-text-secondary text-xs">
        Đã chọn:{" "}
        <strong className="text-text-primary">
          {fromStr} – {toStr}
        </strong>{" "}
        ({days} ngày)
      </span>
    )
  }, [tempFrom, tempTo])

  // Trigger Button Display Text & Badge
  const { triggerText, activePresetLabel } = React.useMemo(() => {
    const fromStr = format(range.from, "dd/MM/yyyy", { locale: vi })
    const toStr = format(range.to, "dd/MM/yyyy", { locale: vi })

    const detected = detectActivePreset(range.from, range.to, now)
    const preset = PRESET_OPTIONS.find((p) => p.key === detected)

    const text = fromStr === toStr ? fromStr : `${fromStr} – ${toStr}`

    return {
      triggerText: text,
      activePresetLabel: preset && preset.key !== "custom" ? preset.label : null,
    }
  }, [range, now])

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="outline"
          aria-label={`Chọn khoảng thời gian báo cáo · ${triggerText}`}
          className={cn(
            "flex items-center gap-2 transition-colors justify-start text-left font-normal cursor-pointer select-none",
            variant === "toolbar"
              ? "rounded-xl border border-border-default/90 bg-surface-card px-3.5 py-2 text-sm font-medium text-text-primary shadow-2xs hover:bg-surface-muted h-auto"
              : "rounded-pill bg-surface-muted px-3 py-1.5 text-xs font-semibold text-text-secondary hover:bg-border-strong h-auto",
            className,
          )}
        >
          <CalendarIcon
            className={cn(
              "shrink-0 text-brand-primary",
              variant === "toolbar" ? "size-4" : "size-3.5",
            )}
          />
          <span className="min-w-0 truncate font-semibold text-text-primary">{triggerText}</span>
          {activePresetLabel && variant === "toolbar" && (
            <span className="hidden shrink-0 rounded-md bg-brand-primary-subtle px-2 py-0.5 text-[11px] font-bold text-brand-primary @min-[82rem]/report:inline-block">
              {activePresetLabel}
            </span>
          )}
          <ChevronDown className="ml-0.5 size-3.5 shrink-0 text-text-tertiary opacity-70" />
        </Button>
      </PopoverTrigger>

      <PopoverContent
        align="end"
        side="bottom"
        className="w-[390px] max-w-[calc(100vw-1rem)] max-h-(--radix-popover-content-available-height) overflow-y-auto p-4 bg-surface-card border border-border-default/90 shadow-2xl rounded-2xl z-50 text-text-primary"
      >
        {/* 1. Quick Presets Grid */}
        <div className="mb-3.5">
          <div className="text-[11px] font-bold uppercase tracking-wider text-text-tertiary mb-2">
            Chọn nhanh khoảng thời gian
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            {PRESET_OPTIONS.map((p) => {
              const isActive = activePresetKey === p.key
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => handlePresetClick(p)}
                  className={cn(
                    "px-2 py-1.5 text-xs font-semibold rounded-lg text-center transition-all cursor-pointer truncate",
                    isActive
                      ? "bg-brand-primary text-text-on-brand shadow-xs font-bold"
                      : "bg-surface-muted text-text-secondary hover:bg-surface-muted/80 hover:text-text-primary",
                  )}
                >
                  {p.label}
                </button>
              )
            })}
          </div>
        </div>

        <div className="border-t border-border-default/60 pt-3 mb-3">
          {/* 2. From & To Date Preview Boxes */}
          <div className="flex items-center gap-2 mb-3">
            <button
              type="button"
              aria-pressed={pickingStep === "from"}
              className={cn(
                "flex-1 rounded-xl border px-3 py-1.5 text-left transition-all cursor-pointer",
                pickingStep === "from"
                  ? "border-brand-primary bg-brand-primary-subtle/30 ring-1 ring-brand-primary/20"
                  : "border-border-default bg-surface-page",
              )}
              onClick={() => setPickingStep("from")}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                Từ ngày
              </span>
              <span className="text-xs font-bold text-text-primary">
                {tempFrom ? format(tempFrom, "dd/MM/yyyy") : "Chọn ngày"}
              </span>
            </button>

            <ArrowRight className="size-3.5 text-text-tertiary shrink-0" />

            <button
              type="button"
              aria-pressed={pickingStep === "to"}
              className={cn(
                "flex-1 rounded-xl border px-3 py-1.5 text-left transition-all cursor-pointer",
                pickingStep === "to"
                  ? "border-brand-primary bg-brand-primary-subtle/30 ring-1 ring-brand-primary/20"
                  : "border-border-default bg-surface-page",
              )}
              onClick={() => {
                if (tempFrom) setPickingStep("to")
              }}
            >
              <span className="block text-[10px] font-bold uppercase tracking-wider text-text-tertiary">
                Đến ngày
              </span>
              <span
                className={cn(
                  "text-xs font-bold",
                  !tempTo && tempFrom
                    ? "text-brand-primary italic animate-pulse"
                    : "text-text-primary",
                )}
              >
                {tempTo
                  ? format(tempTo, "dd/MM/yyyy")
                  : tempFrom
                    ? "Chọn ngày kết thúc..."
                    : "Chưa chọn"}
              </span>
            </button>
          </div>

          {/* 3. Month Navigation Header */}
          <div className="flex items-center justify-between px-1 mb-2">
            <button
              type="button"
              aria-label="Tháng liền trước"
              onClick={() => goToCalendarMonth(viewingYear, viewingMonth.getMonth() - 1)}
              className="flex size-7 items-center justify-center rounded-lg hover:bg-surface-muted text-text-secondary hover:text-text-primary transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-4" />
            </button>

            <div className="flex items-center gap-2">
              <select
                aria-label="Tháng hiển thị"
                value={viewingMonth.getMonth()}
                onChange={(event) => goToCalendarMonth(viewingYear, Number(event.target.value))}
                className="h-9 cursor-pointer rounded-md border border-border-default bg-surface-card px-2 text-sm font-semibold focus-visible:outline-brand-primary"
              >
                {Array.from({ length: 12 }, (_, month) => (
                  <option
                    key={month}
                    value={month}
                    disabled={viewingYear === currentYear && month > now.getMonth()}
                  >
                    Tháng {month + 1}
                  </option>
                ))}
              </select>
              <select
                aria-label="Năm hiển thị"
                value={viewingYear}
                onChange={(event) =>
                  goToCalendarMonth(Number(event.target.value), viewingMonth.getMonth())
                }
                className="h-9 cursor-pointer rounded-md border border-border-default bg-surface-card px-2 text-sm font-semibold focus-visible:outline-brand-primary"
              >
                {years.map((year) => (
                  <option key={year} value={year}>
                    {year}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="button"
              aria-label="Tháng liền sau"
              disabled={isAfter(startOfMonth(addMonths(viewingMonth, 1)), startOfMonth(now))}
              onClick={() => goToCalendarMonth(viewingYear, viewingMonth.getMonth() + 1)}
              className="flex size-7 items-center justify-center rounded-lg hover:bg-surface-muted text-text-secondary hover:text-text-primary transition-colors cursor-pointer disabled:opacity-20 disabled:pointer-events-none"
            >
              <ChevronRight className="size-4" />
            </button>
          </div>

          {/* 4. Day of Week Row (T2 -> CN) */}
          <div className="grid grid-cols-7 text-center mb-1">
            {["T2", "T3", "T4", "T5", "T6", "T7", "CN"].map((day) => (
              <span key={day} className="text-[11px] font-bold text-text-tertiary py-1">
                {day}
              </span>
            ))}
          </div>

          {/* 5. Calendar Day Grid */}
          <div className="grid grid-cols-7 gap-y-1">
            {calendarDays.map((day) => {
              const isCurrentMonth = day.getMonth() === viewingMonth.getMonth()
              const isFuture = isAfter(startOfDay(day), startOfDay(now))
              const isStart = tempFrom && isSameDay(day, tempFrom)
              const isEnd = tempTo && isSameDay(day, tempTo)

              // Check if within confirmed range
              const isWithinRange =
                tempFrom && tempTo && isAfter(day, tempFrom) && isBefore(day, tempTo)

              // Check if within hover range while picking end date
              const isHoverInRange =
                pickingStep === "to" &&
                tempFrom &&
                !tempTo &&
                hoverDate &&
                isAfter(hoverDate, tempFrom) &&
                isAfter(day, tempFrom) &&
                isBefore(day, hoverDate)

              const isMiddle = isWithinRange || isHoverInRange
              const isSingleDay = tempFrom && tempTo && isSameDay(tempFrom, tempTo)

              return (
                <div
                  key={day.toISOString()}
                  className={cn(
                    "h-8 flex items-center justify-center relative",
                    isMiddle && "bg-[#FFF2EB]",
                    isStart &&
                      !isSingleDay &&
                      (tempTo || hoverDate) &&
                      "bg-gradient-to-r from-transparent to-[#FFF2EB]",
                    isEnd && !isSingleDay && "bg-gradient-to-l from-transparent to-[#FFF2EB]",
                  )}
                  onMouseEnter={() => {
                    if (pickingStep === "to") setHoverDate(day)
                  }}
                >
                  <button
                    type="button"
                    aria-label={format(day, "dd/MM/yyyy")}
                    disabled={isFuture}
                    onClick={() => handleDayClick(day)}
                    className={cn(
                      "size-7 rounded-full flex items-center justify-center text-xs font-medium transition-all cursor-pointer relative z-10",
                      // Start or End date: Bold brand orange solid circle
                      (isStart || isEnd) &&
                        "bg-brand-primary text-text-on-brand font-bold shadow-xs scale-105",
                      // Middle range dates
                      isMiddle &&
                        !(isStart || isEnd) &&
                        "text-brand-primary font-semibold hover:bg-brand-primary-subtle",
                      // Normal days in current month
                      isCurrentMonth &&
                        !isMiddle &&
                        !(isStart || isEnd) &&
                        "text-text-primary hover:bg-surface-muted hover:text-brand-primary",
                      // Outside month days
                      !isCurrentMonth &&
                        !isMiddle &&
                        !(isStart || isEnd) &&
                        "text-text-tertiary/40",
                      // Future days
                      isFuture &&
                        "opacity-25 pointer-events-none cursor-not-allowed text-text-tertiary",
                      // Today mark if not selected
                      isSameDay(day, now) &&
                        !(isStart || isEnd) &&
                        "ring-1 ring-brand-primary/40 font-bold text-brand-primary",
                    )}
                  >
                    {day.getDate()}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* 6. Footer: Summary & Actions */}
        <div className="flex items-center justify-between border-t border-border-default/60 pt-3">
          <div className="truncate max-w-[200px]">{summaryText}</div>
          <div className="flex items-center gap-2 shrink-0">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleCancel}
              className="rounded-xl px-3 py-1 text-xs font-semibold h-8 cursor-pointer"
            >
              Hủy
            </Button>
            <Button
              type="button"
              size="sm"
              disabled={!tempFrom}
              onClick={handleApply}
              className="rounded-xl bg-brand-primary px-4 py-1 text-xs font-semibold text-text-on-brand shadow-xs hover:bg-brand-primary-hover active:scale-[0.99] h-8 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Áp dụng
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
