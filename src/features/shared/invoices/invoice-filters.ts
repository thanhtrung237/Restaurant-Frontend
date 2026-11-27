import { isValid } from "date-fns"
import {
  calendarDate,
  calendarDateKey,
  calendarDateLabel,
  vietnamTimestamp,
} from "@/lib/calendar-range"
import { INVOICE_STATUS_LABEL, type InvoiceStatus } from "@/types/enums"
import type { InvoiceListItem } from "@/types/models"

export const PAYMENT_FILTERS = [
  { value: "ALL", label: "Tất cả" },
  { value: "PENDING", label: INVOICE_STATUS_LABEL.PENDING },
  { value: "PAID", label: INVOICE_STATUS_LABEL.PAID },
  { value: "CANCELLED", label: INVOICE_STATUS_LABEL.CANCELLED },
  { value: "REFUNDED", label: INVOICE_STATUS_LABEL.REFUNDED },
] as const

export type PaymentFilter = (typeof PAYMENT_FILTERS)[number]["value"]

export const ISSUANCE_FILTERS = {
  all: "Tất cả",
  unissued: "Chưa phát hành",
  issued: "Đã phát hành",
} as const

export interface AdvancedInvoiceFilters {
  issuance: keyof typeof ISSUANCE_FILTERS
  area: string
  table: string
  min: string
  max: string
}

export const EMPTY_ADVANCED_FILTERS: AdvancedInvoiceFilters = {
  issuance: "all",
  area: "",
  table: "",
  min: "",
  max: "",
}

export const TAKEAWAY_AREA = "takeaway"
const UNASSIGNED_AREA = "unassigned"

function invoiceArea(invoice: InvoiceListItem) {
  if (invoice.takeaway ?? /^Mang về(?:\s|$)/i.test(invoice.tableName?.trim() ?? "")) {
    return TAKEAWAY_AREA
  }
  return invoice.areaId != null ? String(invoice.areaId) : UNASSIGNED_AREA
}

export function getInvoiceLocations(invoices: InvoiceListItem[]) {
  const areas = new Map<string, { label: string; tables: Set<string> }>()
  for (const invoice of invoices) {
    const key = invoiceArea(invoice)
    const area = areas.get(key) ?? {
      label: key === TAKEAWAY_AREA ? "Mang về" : invoice.areaName || "Chưa có khu vực",
      tables: new Set<string>(),
    }
    const table = invoice.tableName?.trim()
    if (key !== TAKEAWAY_AREA && table) area.tables.add(table)
    areas.set(key, area)
  }
  const sort = (a: string, b: string) => a.localeCompare(b, "vi", { numeric: true })
  return [
    ...Array.from(areas, ([value, { label, tables }]) => ({
      value,
      label,
      tables: Array.from(tables).sort(sort),
    }))
      .filter((area) => area.value !== TAKEAWAY_AREA)
      .sort((a, b) => sort(a.label, b.label)),
    { value: TAKEAWAY_AREA, label: "Mang về", tables: [] },
  ]
}

export type InvoiceLocation = ReturnType<typeof getInvoiceLocations>[number]

function validDateKey(value: string | null): value is string {
  if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  const date = calendarDate(value)
  return isValid(date) && calendarDateKey(date) === value
}

// Java LocalDateTime already represents Vietnam wall time. Older ISO values with an
// offset represent instants and must be converted before comparing calendar dates.
function invoiceTimestamp(value?: string) {
  if (!value) return null
  const local = /^(\d{4}-\d{2}-\d{2})(?:[T ](\d{2}:\d{2})(?::\d{2}(?:\.\d+)?)?)?$/.exec(value)
  if (local) return { day: local[1], time: local[2] }
  const date = new Date(value)
  return isValid(date) ? vietnamTimestamp(date) : null
}

export function formatInvoiceDateTime(value?: string) {
  const timestamp = invoiceTimestamp(value)
  if (!timestamp) return "—"
  const date = calendarDateLabel(timestamp.day)
  return timestamp.time ? `${date} ${timestamp.time}` : date
}

function amountParam(value: string | null) {
  return value && /^\d+$/.test(value) && Number.isSafeInteger(Number(value)) ? value : ""
}

export function readInvoiceFilters(params: URLSearchParams, today: string) {
  const from = params.get("from")
  const to = params.get("to")
  const range =
    params.get("date") === "all"
      ? null
      : validDateKey(from) && validDateKey(to) && from <= to && to <= today
        ? { from, to }
        : { from: today, to: today }
  const issuance = params.get("issuance")
  const min = amountParam(params.get("min"))
  const max = amountParam(params.get("max"))
  const advanced: AdvancedInvoiceFilters = {
    issuance: issuance === "issued" || issuance === "unissued" ? issuance : "all",
    area: params.get("area") ?? "",
    table: params.get("area") === TAKEAWAY_AREA ? "" : (params.get("table") ?? ""),
    min,
    max: min && max && Number(min) > Number(max) ? "" : max,
  }
  return {
    range,
    advanced,
    search: params.get("q")?.trim() ?? "",
    status: PAYMENT_FILTERS.find(({ value }) => value === params.get("status"))?.value ?? "ALL",
  }
}

export type InvoiceFiltersValue = ReturnType<typeof readInvoiceFilters>

export function writeInvoiceFilters(params: URLSearchParams, filters: InvoiceFiltersValue) {
  const next = new URLSearchParams(params)
  const values = {
    date: filters.range ? null : "all",
    from: filters.range?.from,
    to: filters.range?.to,
    q: filters.search,
    status: filters.status === "ALL" ? null : filters.status,
    issuance: filters.advanced.issuance === "all" ? null : filters.advanced.issuance,
    area: filters.advanced.area,
    table: filters.advanced.table,
    min: filters.advanced.min,
    max: filters.advanced.max,
  }
  for (const [key, value] of Object.entries(values)) {
    if (value) next.set(key, value)
    else next.delete(key)
  }
  return next
}

export function paymentStatus(status: InvoiceStatus): Exclude<InvoiceStatus, "ISSUED"> {
  return status === "ISSUED" ? "PAID" : status
}

function normalizeInvoiceSearch(value: string) {
  return value
    .toLocaleLowerCase("vi")
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .replace(/đ/g, "d")
    .trim()
    .replace(/\s+/g, " ")
}

function matchesInvoiceSearch(invoice: InvoiceListItem, keyword: string, words: string[]) {
  const issuer = normalizeInvoiceSearch(invoice.issuerName ?? "")
  return (
    [invoice.invoiceNumber, invoice.tableName].some(
      (value) => value && normalizeInvoiceSearch(value).includes(keyword),
    ) || words.every((word) => issuer.includes(word))
  )
}

export function filterInvoices(
  invoices: InvoiceListItem[],
  { range, search, advanced }: InvoiceFiltersValue,
) {
  const keyword = normalizeInvoiceSearch(search)
  const words = keyword.split(" ")
  return invoices.filter((invoice) => {
    if (range) {
      const day = invoiceTimestamp(invoice.createdAt)?.day
      if (!day || day < range.from || day > range.to) return false
    }
    if (keyword && !matchesInvoiceSearch(invoice, keyword, words)) return false
    if (advanced.area && invoiceArea(invoice) !== advanced.area) return false
    if (advanced.table && invoice.tableName?.trim() !== advanced.table) return false
    if (advanced.min && invoice.grandTotal < Number(advanced.min)) return false
    if (advanced.max && invoice.grandTotal > Number(advanced.max)) return false
    if (advanced.issuance === "issued") return invoice.status === "ISSUED"
    if (advanced.issuance === "unissued") {
      return (
        invoice.status === "PENDING" || invoice.status === "PAID" || invoice.status === "CANCELLED"
      )
    }
    return true
  })
}
