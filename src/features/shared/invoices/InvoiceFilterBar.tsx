import { useState, type ReactNode } from "react"
import { Search, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { formatCurrency } from "@/lib/format"
import { InvoiceAdvancedFilters } from "./InvoiceAdvancedFilters"
import { DateRangePicker } from "@/components/ui/date-range-picker"
import { calendarRangeLabel } from "@/lib/calendar-range"
import {
  EMPTY_ADVANCED_FILTERS,
  ISSUANCE_FILTERS,
  PAYMENT_FILTERS,
  TAKEAWAY_AREA,
  type InvoiceFiltersValue,
  type InvoiceLocation,
  type PaymentFilter,
} from "./invoice-filters"

interface InvoiceFilterBarProps {
  filters: InvoiceFiltersValue
  counts?: Record<PaymentFilter, number>
  today: string
  locations: InvoiceLocation[]
  branchSelector?: ReactNode
  onChange: (next: InvoiceFiltersValue) => void
}

export function InvoiceFilterBar({
  filters,
  counts,
  today,
  locations,
  branchSelector,
  onChange,
}: InvoiceFilterBarProps) {
  const { advanced, range, search, status } = filters
  const [searchDraft, setSearchDraft] = useState<{ applied: string; value: string } | null>(null)
  const searchInput = searchDraft?.applied === search ? searchDraft.value : search
  const statusLabel = PAYMENT_FILTERS.find(({ value }) => value === status)?.label
  const chips = [
    range && {
      label: calendarRangeLabel(range),
      remove: () => onChange({ ...filters, range: null }),
    },
    status !== "ALL" && {
      label: statusLabel,
      remove: () => onChange({ ...filters, status: "ALL" }),
    },
    search && { label: `Tìm: ${search}`, remove: clearSearch },
    advanced.issuance !== "all" && {
      label: `HĐĐT: ${ISSUANCE_FILTERS[advanced.issuance]}`,
      remove: () => onChange({ ...filters, advanced: { ...advanced, issuance: "all" } }),
    },
    advanced.area && {
      label:
        advanced.area === TAKEAWAY_AREA
          ? "Mang về"
          : `Khu vực: ${locations.find((location) => location.value === advanced.area)?.label ?? "Đã chọn"}`,
      remove: () => onChange({ ...filters, advanced: { ...advanced, area: "", table: "" } }),
    },
    advanced.table && {
      label: `Bàn: ${advanced.table}`,
      remove: () => onChange({ ...filters, advanced: { ...advanced, table: "" } }),
    },
    advanced.min && {
      label: `Từ ${formatCurrency(advanced.min)}`,
      remove: () => onChange({ ...filters, advanced: { ...advanced, min: "" } }),
    },
    advanced.max && {
      label: `Đến ${formatCurrency(advanced.max)}`,
      remove: () => onChange({ ...filters, advanced: { ...advanced, max: "" } }),
    },
  ]

  function clearSearch() {
    setSearchDraft(null)
    onChange({ ...filters, search: "" })
  }

  return (
    <section
      aria-label="Bộ lọc hóa đơn"
      className="min-w-0 space-y-3 rounded-card border border-border-default bg-surface-card p-3 sm:p-4"
    >
      {branchSelector}
      <div
        role="group"
        aria-label="Trạng thái thanh toán"
        className="flex min-w-0 w-fit max-w-full gap-1 overflow-x-auto rounded-xl bg-surface-muted p-1"
      >
        {PAYMENT_FILTERS.map(({ value, label }) => (
          <button
            key={value}
            type="button"
            aria-pressed={status === value}
            onClick={() => onChange({ ...filters, status: value })}
            className={cn(
              "inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-lg px-3 text-xs font-semibold focus-visible:outline-2 focus-visible:outline-offset-[-2px] focus-visible:outline-brand-primary",
              status === value
                ? "bg-brand-primary text-text-on-brand"
                : "text-text-secondary hover:bg-surface-card hover:text-text-primary",
            )}
          >
            {label}
            {counts && (
              <span
                className={cn(
                  "rounded-full px-1.5 py-0.5 text-[11px] tabular-nums",
                  status === value ? "bg-white/20" : "bg-surface-card",
                )}
              >
                {counts[value].toLocaleString("vi-VN")}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <DateRangePicker
          label="Chọn khoảng ngày hóa đơn"
          dialogLabel="Khoảng ngày hóa đơn"
          today={today}
          range={range}
          onApply={(next) => onChange({ ...filters, range: next })}
        />
        <form
          role="search"
          className="order-last flex h-10 w-full min-w-0 items-center rounded-xl border border-border-default bg-surface-card focus-within:border-brand-primary sm:order-none sm:w-auto sm:flex-1 sm:basis-56 sm:max-w-sm"
          onSubmit={(event) => {
            event.preventDefault()
            setSearchDraft(null)
            onChange({ ...filters, search: searchInput.trim() })
          }}
        >
          <button
            type="submit"
            aria-label="Tìm hóa đơn"
            className="grid h-full w-9 shrink-0 place-items-center rounded-l-xl text-text-secondary hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-primary"
          >
            <Search className="size-4" aria-hidden="true" />
          </button>
          <input
            type="text"
            aria-label="Tìm theo số hóa đơn, tên bàn hoặc nhân viên"
            placeholder="Số hóa đơn, tên bàn, nhân viên"
            className="h-full w-full min-w-0 rounded-r-xl bg-transparent pr-2 text-sm text-text-primary outline-none placeholder:text-text-tertiary"
            value={searchInput}
            onChange={(event) => setSearchDraft({ applied: search, value: event.target.value })}
          />
          {searchInput && (
            <button
              type="button"
              aria-label="Xóa từ khóa tìm kiếm"
              className="grid h-full w-9 shrink-0 place-items-center rounded-r-xl text-text-secondary hover:text-text-primary focus-visible:outline-2 focus-visible:outline-brand-primary"
              onClick={clearSearch}
            >
              <X className="size-4" aria-hidden="true" />
            </button>
          )}
        </form>
        <InvoiceAdvancedFilters
          value={advanced}
          locations={locations}
          onApply={(next) => onChange({ ...filters, advanced: next })}
        />
      </div>

      {chips.some(Boolean) && (
        <div
          aria-label="Bộ lọc đang áp dụng"
          role="group"
          className="flex min-w-0 flex-wrap items-center gap-2 border-t border-border-default pt-3"
        >
          {chips.map(
            (chip, index) =>
              chip && (
                <button
                  type="button"
                  key={index}
                  aria-label={range && index === 0 ? "Tất cả ngày" : `Bỏ lọc ${chip.label}`}
                  title={range && index === 0 ? "Tất cả ngày" : undefined}
                  onClick={chip.remove}
                  className="inline-flex min-h-7 max-w-full items-center gap-1.5 rounded-lg border border-border-default bg-surface-muted px-2 text-xs text-text-secondary hover:text-brand-primary focus-visible:outline-2 focus-visible:outline-brand-primary"
                >
                  <span className="truncate">{chip.label}</span>
                  <X className="size-3 shrink-0" aria-hidden="true" />
                </button>
              ),
          )}
          <Button
            type="button"
            variant="link"
            size="sm"
            className="h-7 px-1 text-xs"
            onClick={() => {
              setSearchDraft(null)
              onChange({ range: null, status: "ALL", search: "", advanced: EMPTY_ADVANCED_FILTERS })
            }}
          >
            Xóa tất cả
          </Button>
        </div>
      )}
    </section>
  )
}
