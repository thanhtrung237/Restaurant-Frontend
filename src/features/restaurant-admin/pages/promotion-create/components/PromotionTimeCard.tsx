import React from "react"
import { Calendar, Clock } from "lucide-react"
import { FormField } from "@/components/common/FormField"
import { Input } from "@/components/ui/input"
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

/**
 * Card "Thời gian"
 * Nguồn: QuanLy/Tạo khuyến mãi.png (Cột phải - Card 1)
 */
export const PromotionTimeCard: React.FC<PromotionTimeCardProps> = ({
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
}) => {
  return (
    <div className="rounded-card border border-border-default bg-surface-card p-6 shadow-2xs space-y-5">
      <h2 className="text-base font-bold text-text-primary tracking-tight">
        Thời gian
      </h2>

      {/* Row 1: Từ ngày & Đến ngày */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <FormField label="Từ ngày" htmlFor="start-date">
          <div className="relative">
            <Input
              id="start-date"
              value={startDate}
              onChange={(e) => onStartDateChange(e.target.value)}
              placeholder="dd/mm/yyyy"
              className="pr-9"
            />
            <Calendar className="size-4 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </FormField>

        <FormField label="Đến ngày" htmlFor="end-date">
          <div className="relative">
            <Input
              id="end-date"
              value={endDate}
              onChange={(e) => onEndDateChange(e.target.value)}
              placeholder="dd/mm/yyyy"
              className="pr-9"
            />
            <Calendar className="size-4 text-text-tertiary absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          </div>
        </FormField>
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
                    : "bg-surface-muted text-text-secondary hover:bg-border-strong hover:text-text-primary"
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
