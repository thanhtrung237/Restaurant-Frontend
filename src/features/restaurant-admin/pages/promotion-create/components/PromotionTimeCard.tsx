import { useState } from "react"
import { format, parse } from "date-fns"
import { CalendarDays, Clock } from "lucide-react"
import { FormField } from "@/components/common/FormField"
import { Calendar } from "@/components/ui/calendar"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { isValidDateFormat } from "@/lib/promotion-format"
import { cn } from "@/lib/utils"

interface PromotionTimeCardProps {
  startDate: string
  onStartDateChange: (val: string) => void
  endDate: string
  onEndDateChange: (val: string) => void
  startTime: string
  onStartTimeChange: (val: string) => void
  endTime: string
  onEndTimeChange: (val: string) => void
  daysOfWeek: string[]
  onToggleDay: (day: string) => void
}

const ALL_DAYS = [
  { id: "T2", label: "T2" },
  { id: "T3", label: "T3" },
  { id: "T4", label: "T4" },
  { id: "T5", label: "T5" },
  { id: "T6", label: "T6" },
  { id: "T7", label: "T7" },
  { id: "CN", label: "CN" },
]

const DATE_FORMAT = "dd/MM/yyyy"

function parsePromotionDate(value: string) {
  return isValidDateFormat(value) ? parse(value, DATE_FORMAT, new Date()) : undefined
}

function PromotionDatePicker({
  id,
  label,
  value,
  onChange,
  minDate,
}: {
  id: string
  label: string
  value: string
  onChange: (value: string) => void
  minDate?: Date
}) {
  const [open, setOpen] = useState(false)
  const selected = parsePromotionDate(value)

  return (
    <FormField label={label} htmlFor={id}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            id={id}
            type="button"
            aria-label={`${label} · ${selected ? value : "Chọn ngày"}`}
            className={cn(
              "flex h-11 w-full items-center justify-between gap-2 rounded-button border border-border-default bg-surface-card px-4 text-left text-sm outline-none hover:border-border-strong focus-visible:ring-2 focus-visible:ring-brand-primary/40",
              selected ? "text-text-primary" : "text-text-secondary",
            )}
          >
            <span>{selected ? value : "Chọn ngày"}</span>
            <CalendarDays aria-hidden="true" className="size-4 shrink-0 text-text-secondary" />
          </button>
        </PopoverTrigger>
        <PopoverContent
          align="start"
          collisionPadding={8}
          aria-label={label}
          className="w-max max-w-[calc(100vw-1rem)] rounded-card border-border-default bg-surface-card p-0"
        >
          <Calendar
            mode="single"
            required
            selected={selected}
            defaultMonth={selected ?? minDate}
            disabled={minDate ? { before: minDate } : undefined}
            autoFocus
            labels={{
              labelPrevious: () => "Tháng trước",
              labelNext: () => "Tháng sau",
              labelDayButton: (date, modifiers) =>
                [
                  `Ngày ${format(date, DATE_FORMAT)}`,
                  modifiers.today && "Hôm nay",
                  modifiers.selected && "Đã chọn",
                ]
                  .filter(Boolean)
                  .join(" · "),
            }}
            onSelect={(date) => {
              if (!date) return
              onChange(format(date, DATE_FORMAT))
              setOpen(false)
            }}
          />
        </PopoverContent>
      </Popover>
    </FormField>
  )
}

/**
 * Card "Thời gian"
 * Nguồn: QuanLy/Tạo khuyến mãi.png (Cột phải - Card 1)
 */
export function PromotionTimeCard({
  startDate,
  onStartDateChange,
  endDate,
  onEndDateChange,
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  daysOfWeek,
  onToggleDay,
}: PromotionTimeCardProps) {
  const start = parsePromotionDate(startDate)
  const end = parsePromotionDate(endDate)
  return (
    <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-5">
      <h2 className="text-base font-bold text-text-primary tracking-tight">Thời gian</h2>

      {/* Row 1: Từ ngày & Đến ngày */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <PromotionDatePicker
          id="start-date"
          label="Từ ngày"
          value={startDate}
          onChange={(value) => {
            const nextStart = parsePromotionDate(value)
            onStartDateChange(value)
            if (end && nextStart && end < nextStart) onEndDateChange("")
          }}
        />
        <PromotionDatePicker
          id="end-date"
          label="Đến ngày"
          value={endDate}
          onChange={onEndDateChange}
          minDate={start}
        />
      </div>

      {/* Row 2: Từ giờ & Đến giờ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Từ giờ" htmlFor="start-time">
          <div className="relative">
            <Input
              id="start-time"
              value={startTime}
              onChange={(e) => onStartTimeChange(e.target.value)}
              placeholder="HH:mm"
              className="pr-9"
            />
            <Clock className="size-4 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </FormField>

        <FormField label="Đến giờ" htmlFor="end-time">
          <div className="relative">
            <Input
              id="end-time"
              value={endTime}
              onChange={(e) => onEndTimeChange(e.target.value)}
              placeholder="HH:mm"
              className="pr-9"
            />
            <Clock className="size-4 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </FormField>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-text-secondary">
          Giờ Việt Nam (24 giờ). Ví dụ 05:00–07:00 là từ 5 đến 7 giờ sáng.
        </p>
        {(startTime || endTime) && (
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              onStartTimeChange("")
              onEndTimeChange("")
            }}
          >
            Áp dụng cả ngày
          </Button>
        )}
      </div>

      {/* Row 3: Ngày trong tuần */}
      <FormField label="Ngày trong tuần">
        <div className="flex flex-wrap gap-2 pt-1">
          {ALL_DAYS.map((day) => {
            const isSelected = daysOfWeek.includes(day.id)
            return (
              <button
                key={day.id}
                type="button"
                onClick={() => onToggleDay(day.id)}
                className={cn(
                  "size-10 rounded-lg font-semibold text-sm flex items-center justify-center transition-colors cursor-pointer select-none",
                  isSelected
                    ? "bg-brand-primary text-text-on-brand hover:bg-brand-primary-hover shadow-2xs"
                    : "bg-surface-muted text-text-secondary hover:bg-border-strong hover:text-text-primary",
                )}
                aria-pressed={isSelected}
              >
                {day.label}
              </button>
            )
          })}
        </div>
      </FormField>
    </div>
  )
}
