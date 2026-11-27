import { endOfMonth, format, startOfMonth, subDays, subMonths } from "date-fns"

export interface CalendarDateRange {
  from: string
  to: string
}

const vietnamDateTime = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Ho_Chi_Minh",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
})

export function vietnamTimestamp(date: Date) {
  const parts = Object.fromEntries(
    vietnamDateTime.formatToParts(date).map(({ type, value }) => [type, value]),
  )
  return { day: `${parts.year}-${parts.month}-${parts.day}`, time: `${parts.hour}:${parts.minute}` }
}

export function vietnamTodayKey() {
  return vietnamTimestamp(new Date()).day
}

// Calendar values are civil days. Keep them separate from timestamps.
export function calendarDateKey(date: Date) {
  return format(date, "yyyy-MM-dd")
}

export function calendarDate(key: string) {
  return new Date(`${key}T12:00:00`)
}

export function calendarDateLabel(key: string) {
  const [year, month, day] = key.split("-")
  return `${day}/${month}/${year}`
}

export function calendarRangeLabel(range: CalendarDateRange | null) {
  if (!range) return "Tất cả ngày"
  const from = calendarDateLabel(range.from)
  return range.from === range.to ? from : `${from} – ${calendarDateLabel(range.to)}`
}

export const DATE_RANGE_PRESETS = [
  { key: "today", label: "Hôm nay", dates: (today: Date) => [today, today] },
  {
    key: "yesterday",
    label: "Hôm qua",
    dates: (today: Date) => [subDays(today, 1), subDays(today, 1)],
  },
  { key: "7days", label: "7 ngày qua", dates: (today: Date) => [subDays(today, 6), today] },
  { key: "30days", label: "30 ngày qua", dates: (today: Date) => [subDays(today, 29), today] },
  { key: "thisMonth", label: "Tháng này", dates: (today: Date) => [startOfMonth(today), today] },
  {
    key: "lastMonth",
    label: "Tháng trước",
    dates: (today: Date) => {
      const previous = subMonths(today, 1)
      return [startOfMonth(previous), endOfMonth(previous)]
    },
  },
  {
    key: "thisYear",
    label: "Năm nay",
    yearPreset: true,
    dates: (today: Date) => [new Date(today.getFullYear(), 0, 1), today],
  },
  {
    key: "lastYear",
    label: "Năm trước",
    yearPreset: true,
    dates: (today: Date) => [
      new Date(today.getFullYear() - 1, 0, 1),
      new Date(today.getFullYear() - 1, 11, 31),
    ],
  },
] as const

export function getPresetRange(
  preset: (typeof DATE_RANGE_PRESETS)[number],
  today: string,
): CalendarDateRange {
  const [from, to] = preset.dates(calendarDate(today))
  return { from: calendarDateKey(from), to: calendarDateKey(to) }
}

export function findRangePreset(range: CalendarDateRange, today: string) {
  return DATE_RANGE_PRESETS.find((preset) => {
    const candidate = getPresetRange(preset, today)
    return candidate.from === range.from && candidate.to === range.to
  })
}
