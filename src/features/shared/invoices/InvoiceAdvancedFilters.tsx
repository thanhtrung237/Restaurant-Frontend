import { useState, useSyncExternalStore } from "react"
import { SlidersHorizontal } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import {
  EMPTY_ADVANCED_FILTERS,
  ISSUANCE_FILTERS,
  TAKEAWAY_AREA,
  type AdvancedInvoiceFilters,
  type InvoiceLocation,
} from "./invoice-filters"
import { InvoiceFilterSelect } from "./InvoiceFilterSelect"

const desktopQuery = "(min-width: 768px)"
const isDesktop = () => window.matchMedia(desktopQuery).matches
function subscribe(callback: () => void) {
  const media = window.matchMedia(desktopQuery)
  media.addEventListener("change", callback)
  return () => media.removeEventListener("change", callback)
}

const fieldStyle =
  "h-10 w-full min-w-0 rounded-xl border border-border-default bg-surface-card px-3 text-sm font-normal text-text-primary focus-visible:outline-2 focus-visible:outline-brand-primary"

interface InvoiceAdvancedFiltersProps {
  value: AdvancedInvoiceFilters
  locations: InvoiceLocation[]
  onApply: (value: AdvancedInvoiceFilters) => void
}

export function InvoiceAdvancedFilters({ value, locations, onApply }: InvoiceAdvancedFiltersProps) {
  const desktop = useSyncExternalStore(subscribe, isDesktop)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState(value)
  const invalidRange = draft.min !== "" && draft.max !== "" && Number(draft.min) > Number(draft.max)
  const areaOptions = [{ value: "all", label: "Tất cả khu vực" }, ...locations]
  const tables = locations.find((location) => location.value === draft.area)?.tables ?? []
  const tableOptions = [
    { value: "all", label: "Tất cả bàn trong khu vực" },
    ...tables.map((table) => ({ value: `table:${table}`, label: table })),
  ]

  function handleOpenChange(next: boolean) {
    if (next) setDraft(value)
    setOpen(next)
  }

  function apply(next: AdvancedInvoiceFilters) {
    onApply(next)
    setOpen(false)
  }

  const trigger = (
    <Button
      type="button"
      variant="outline"
      className="h-10 rounded-xl border-border-default px-3 text-text-primary"
    >
      <SlidersHorizontal aria-hidden="true" />
      Bộ lọc nâng cao
    </Button>
  )
  const fields = (
    <form
      className="flex min-w-0 flex-col gap-4"
      onSubmit={(event) => {
        event.preventDefault()
        if (!invalidRange) apply(draft)
      }}
    >
      <InvoiceFilterSelect
        label="Khu vực"
        value={draft.area || "all"}
        options={areaOptions}
        onChange={(area) => setDraft({ ...draft, area: area === "all" ? "" : area, table: "" })}
      />
      {draft.area && draft.area !== TAKEAWAY_AREA && (
        <InvoiceFilterSelect
          label="Bàn"
          value={draft.table ? `table:${draft.table}` : "all"}
          options={tableOptions}
          onChange={(table) => setDraft({ ...draft, table: table === "all" ? "" : table.slice(6) })}
        />
      )}
      <InvoiceFilterSelect
        label="Trạng thái hóa đơn điện tử"
        value={draft.issuance}
        options={Object.entries(ISSUANCE_FILTERS).map(([value, label]) => ({ value, label }))}
        onChange={(issuance) =>
          setDraft({ ...draft, issuance: issuance as AdvancedInvoiceFilters["issuance"] })
        }
      />
      <fieldset className="min-w-0">
        <legend className="mb-2 text-sm font-semibold">Khoảng tiền (₫)</legend>
        <div className="grid grid-cols-2 gap-2">
          {(["min", "max"] as const).map((key) => (
            <input
              key={key}
              type="text"
              inputMode="numeric"
              autoComplete="off"
              maxLength={15}
              aria-label={key === "min" ? "Từ số tiền" : "Đến số tiền"}
              aria-invalid={invalidRange}
              placeholder={key === "min" ? "Từ số tiền" : "Đến số tiền"}
              className={fieldStyle}
              value={draft[key]}
              onChange={(event) =>
                setDraft({ ...draft, [key]: event.target.value.replace(/[^0-9]/g, "") })
              }
            />
          ))}
        </div>
        {invalidRange && (
          <p role="alert" className="mt-2 text-xs text-status-danger">
            Số tiền tối đa phải lớn hơn hoặc bằng số tiền tối thiểu.
          </p>
        )}
      </fieldset>
      <div className="mt-auto flex flex-wrap justify-end gap-2 border-t border-border-default pt-3">
        <Button type="button" variant="outline" onClick={() => apply(EMPTY_ADVANCED_FILTERS)}>
          Xóa bộ lọc
        </Button>
        <Button type="submit" disabled={invalidRange}>
          Áp dụng
        </Button>
      </div>
    </form>
  )

  return desktop ? (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent
        aria-label="Bộ lọc nâng cao"
        align="end"
        sideOffset={6}
        className="w-[360px] rounded-card border-border-default bg-surface-card text-text-primary"
      >
        {fields}
      </PopoverContent>
    </Popover>
  ) : (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="inset-x-0 bottom-0 top-auto flex max-h-[calc(100dvh-1rem)] min-h-[min(85dvh,38rem)] w-full max-w-none translate-x-0 translate-y-0 flex-col rounded-b-none rounded-t-2xl pb-[max(1rem,env(safe-area-inset-bottom))] sm:max-w-none">
        <DialogTitle>Bộ lọc nâng cao</DialogTitle>
        <DialogDescription>Lọc hóa đơn của chi nhánh đang chọn.</DialogDescription>
        {fields}
      </DialogContent>
    </Dialog>
  )
}
