import { useState, type ComponentProps } from "react"
import { CalendarDays, ChevronDown } from "lucide-react"
import { Button } from "@/components/ui/button"
import { PickerCalendar } from "@/components/ui/calendar"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import {
  calendarDate,
  calendarDateKey,
  calendarDateLabel,
  vietnamTodayKey,
} from "@/lib/calendar-range"

interface DatePickerProps extends Pick<
  ComponentProps<typeof Button>,
  "id" | "disabled" | "onBlur" | "ref" | "aria-invalid"
> {
  label: string
  value: string
  onChange: (value: string) => void
  required?: boolean
}

export function DatePicker({ label, value, onChange, required, ...triggerProps }: DatePickerProps) {
  const [open, setOpen] = useState(false)
  const today = calendarDate(vietnamTodayKey())
  const date = value ? calendarDate(value) : undefined
  const selected = date && !Number.isNaN(date.getTime()) ? date : undefined
  const defaultMonth = selected ?? today
  const [month, setMonth] = useState(defaultMonth)
  const year = month.getFullYear()
  const firstYear = String(Math.max(1, year - 99)).padStart(4, "0")
  const lastYear = Math.min(9999, year + 99)
  const displayValue = selected ? calendarDateLabel(value) : "Chọn ngày"

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) setMonth(defaultMonth)
        setOpen(next)
      }}
    >
      <DialogTrigger asChild>
        <Button
          {...triggerProps}
          type="button"
          variant="outline"
          aria-label={`${label} · ${displayValue}`}
          className="h-11 w-full min-w-0 justify-start gap-2 rounded-xl border-border-default px-3 font-normal aria-invalid:border-status-danger"
        >
          <CalendarDays aria-hidden="true" className="text-brand-primary" />
          <span className={value ? "truncate text-text-primary" : "truncate text-text-secondary"}>
            {displayValue}
          </span>
          <ChevronDown aria-hidden="true" className="ml-auto text-text-secondary" />
        </Button>
      </DialogTrigger>
      <DialogContent
        aria-describedby={undefined}
        className="w-[340px] gap-3 p-3 text-text-primary sm:p-4"
      >
        <DialogHeader>
          <DialogTitle className="pr-8 text-sm">{label}</DialogTitle>
        </DialogHeader>
        <PickerCalendar
          mode="single"
          required
          today={today}
          selected={selected}
          month={month}
          onMonthChange={setMonth}
          startMonth={calendarDate(`${firstYear}-01-01`)}
          endMonth={calendarDate(`${lastYear}-12-01`)}
          onSelect={(date) => {
            onChange(calendarDateKey(date))
            setOpen(false)
          }}
          className="w-full p-0"
        />
        {!required && value && (
          <div className="mt-2 flex justify-end border-t border-border-default pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                onChange("")
                setOpen(false)
              }}
            >
              Xóa ngày
            </Button>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
