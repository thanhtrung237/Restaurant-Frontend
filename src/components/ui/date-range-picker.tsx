import { useState } from "react"
import { CalendarDays, ChevronDown, ChevronLeft, ChevronRight } from "lucide-react"
import type { DateRange } from "react-day-picker"
import { Button } from "@/components/ui/button"
import { Calendar } from "@/components/ui/calendar"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { cn } from "@/lib/utils"
import {
  calendarDate,
  calendarDateKey,
  calendarDateLabel,
  calendarRangeLabel,
  DATE_RANGE_PRESETS,
  getPresetRange,
  type CalendarDateRange,
} from "@/lib/calendar-range"

interface DateRangePickerProps {
  range: CalendarDateRange | null
  today: string
  onApply: (range: CalendarDateRange) => void
  label: string
  dialogLabel: string
  align?: "start" | "end"
  className?: string
  showYearPresets?: boolean
}

export function DateRangePicker({
  range,
  today,
  onApply,
  label,
  dialogLabel,
  align = "start",
  className,
  showYearPresets = false,
}: DateRangePickerProps) {
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState<DateRange>()
  const [month, setMonth] = useState(() => calendarDate(today))
  const currentDay = calendarDate(today)
  const rangeLabel = calendarRangeLabel(range)
  const presets = DATE_RANGE_PRESETS.filter(
    (preset) => showYearPresets || !("yearPreset" in preset),
  )

  function handleOpenChange(next: boolean) {
    if (next) {
      setDraft(range ? { from: calendarDate(range.from), to: calendarDate(range.to) } : undefined)
      setMonth(calendarDate(range?.to ?? today))
    }
    setOpen(next)
  }

  function applyRange() {
    if (!draft?.from) return
    onApply({ from: calendarDateKey(draft.from), to: calendarDateKey(draft.to ?? draft.from) })
    setOpen(false)
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          aria-label={`${label} · ${rangeLabel}`}
          className={cn(
            "h-10 max-w-full justify-start gap-2 rounded-xl border-border-default px-3 text-text-primary",
            className,
          )}
        >
          <CalendarDays className="text-brand-primary" aria-hidden="true" />
          <span className="min-w-0 truncate">{rangeLabel}</span>
          <ChevronDown className="ml-auto text-text-secondary" aria-hidden="true" />
        </Button>
      </PopoverTrigger>
      <PopoverContent
        align={align}
        side="bottom"
        sideOffset={6}
        collisionPadding={8}
        aria-label={dialogLabel}
        className="w-[390px] rounded-card border-border-default bg-surface-card p-3 text-text-primary sm:p-4"
      >
        <p className="mb-2 text-xs font-semibold text-text-secondary">Chọn nhanh khoảng ngày</p>
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-3">
          {presets.map((preset) => {
            const { from, to } = getPresetRange(preset, today)
            const selected =
              draft?.from &&
              draft.to &&
              calendarDateKey(draft.from) === from &&
              calendarDateKey(draft.to) === to
            return (
              <button
                type="button"
                key={preset.key}
                aria-pressed={!!selected}
                className={cn(
                  "min-h-8 rounded-lg px-2 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-brand-primary",
                  selected
                    ? "bg-brand-primary text-text-on-brand"
                    : "bg-surface-muted text-text-secondary",
                )}
                onClick={() => {
                  setDraft({ from: calendarDate(from), to: calendarDate(to) })
                  setMonth(calendarDate(to))
                }}
              >
                {preset.label}
              </button>
            )
          })}
          <button
            type="button"
            className="min-h-8 rounded-lg bg-surface-muted px-2 text-xs font-semibold text-text-secondary focus-visible:outline-2 focus-visible:outline-brand-primary"
            onClick={() => setDraft(undefined)}
          >
            Tùy chỉnh
          </button>
        </div>
        <Calendar
          mode="range"
          min={1}
          resetOnSelect
          today={currentDay}
          selected={draft}
          onSelect={setDraft}
          month={month}
          onMonthChange={setMonth}
          disabled={{ after: currentDay }}
          startMonth={calendarDate(`${currentDay.getFullYear() - 99}-01-01`)}
          endMonth={currentDay}
          captionLayout="dropdown"
          showOutsideDays={false}
          formatters={{ formatMonthDropdown: (date) => `Tháng ${date.getMonth() + 1}` }}
          labels={{
            labelMonthDropdown: () => "Tháng hiển thị",
            labelYearDropdown: () => "Năm hiển thị",
            labelPrevious: () => "Lùi một tháng",
            labelNext: () => "Tiến một tháng",
            labelDayButton: (day, modifiers) =>
              `${calendarDateLabel(calendarDateKey(day))}${modifiers.selected ? ", đã chọn" : ""}`,
          }}
          components={{
            Chevron: ({ orientation }) => {
              const Icon =
                orientation === "left"
                  ? ChevronLeft
                  : orientation === "right"
                    ? ChevronRight
                    : ChevronDown
              return <Icon className="size-4" aria-hidden="true" />
            },
          }}
          className="mt-3 w-full border-t border-border-default px-0 pb-2"
          classNames={{
            months: "relative w-full",
            dropdowns: "flex items-center justify-center gap-2",
            dropdown_root: "relative rounded-md border border-border-default px-2 py-1.5 text-sm",
            dropdown: "absolute inset-0 size-full cursor-pointer opacity-0",
            caption_label:
              "pointer-events-none flex items-center gap-1 text-sm font-semibold capitalize",
            day: "p-0 text-center",
            day_button:
              "mx-auto size-8 rounded-lg outline-none hover:bg-surface-muted focus-visible:ring-2 focus-visible:ring-brand-primary/60 sm:size-9",
          }}
        />
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-border-default pt-3">
          <p aria-live="polite" className="text-xs text-text-secondary">
            {draft?.from
              ? calendarRangeLabel({
                  from: calendarDateKey(draft.from),
                  to: calendarDateKey(draft.to ?? draft.from),
                })
              : "Chọn ngày bắt đầu và kết thúc"}
          </p>
          <div className="ml-auto flex gap-2">
            <Button type="button" size="sm" variant="outline" onClick={() => setOpen(false)}>
              Hủy
            </Button>
            <Button type="button" size="sm" disabled={!draft?.from} onClick={applyRange}>
              Áp dụng
            </Button>
          </div>
        </div>
      </PopoverContent>
    </Popover>
  )
}
