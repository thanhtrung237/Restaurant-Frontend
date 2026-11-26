import * as React from "react"
import { useNavigate, generatePath } from "react-router-dom"
import { FileText, Search, X, ChevronRight, ReceiptText, Calendar } from "lucide-react"
import { useInvoicesByBranch } from "@/api/invoices.api"
import { useAuthStore } from "@/stores/auth.store"
import { StatusBadge } from "@/components/common/StatusBadge"
import { CASHIER_PATHS } from "@/app/router/paths/cashier.paths"
import { BRANCH_MANAGER_PATHS } from "@/app/router/paths/branch-manager.paths"
import { APP_ROLE } from "@/config/roles"
import { INVOICE_STATUS_LABEL, type InvoiceStatus } from "@/types/enums"
import type { InvoiceListItem } from "@/types/models"

// ─── Helpers ─────────────────────────────────────────────────────────────────

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`

function formatDateTime(iso: string | undefined) {
  if (!iso) return "—"
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

function toDateInputValue(d: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`
}

type StatusFilter = InvoiceStatus | "ALL"

const FILTER_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "Tất cả" },
  { value: "PAID", label: INVOICE_STATUS_LABEL.PAID },
  { value: "ISSUED", label: INVOICE_STATUS_LABEL.ISSUED },
  { value: "PENDING", label: INVOICE_STATUS_LABEL.PENDING },
  { value: "CANCELLED", label: INVOICE_STATUS_LABEL.CANCELLED },
  { value: "REFUNDED", label: INVOICE_STATUS_LABEL.REFUNDED },
]

// ─── Component ───────────────────────────────────────────────────────────────

/**
 * Trang danh sách hóa đơn — dùng chung cho Thu ngân và Quản lý chi nhánh.
 * API: GET /invoices/branch/{branchId}?status={status}
 * Lọc ngày thực hiện phía client (createdAt đã có trong InvoiceListResponse).
 */
export default function InvoiceListPage() {
  const navigate = useNavigate()
  const role = useAuthStore((s) => s.role)
  const branchId = useAuthStore((s) => s.branchId)

  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL")
  const [search, setSearch] = React.useState("")
  const today = React.useMemo(() => toDateInputValue(new Date()), [])
  const [dateFrom, setDateFrom] = React.useState(today)
  const [dateTo, setDateTo] = React.useState(today)

  const {
    data: invoices = [],
    isLoading,
    isError,
  } = useInvoicesByBranch(branchId ?? undefined, statusFilter === "ALL" ? undefined : statusFilter)

  const filtered = React.useMemo(() => {
    return invoices.filter((inv) => {
      // Lọc ngày
      if (dateFrom || dateTo) {
        const d = inv.createdAt ? new Date(inv.createdAt) : null
        if (!d) return false
        if (dateFrom) {
          const from = new Date(dateFrom)
          from.setHours(0, 0, 0, 0)
          if (d < from) return false
        }
        if (dateTo) {
          const to = new Date(dateTo)
          to.setHours(23, 59, 59, 999)
          if (d > to) return false
        }
      }
      // Lọc text
      const q = search.trim().toLowerCase()
      if (q) {
        return (
          inv.invoiceNumber?.toLowerCase().includes(q) || inv.tableName?.toLowerCase().includes(q)
        )
      }
      return true
    })
  }, [invoices, dateFrom, dateTo, search])

  const totalPaid = React.useMemo(
    () =>
      filtered
        .filter((i) => i.status === "PAID" || i.status === "ISSUED")
        .reduce((s, i) => s + (i.grandTotal ?? 0), 0),
    [filtered],
  )

  const hasActiveFilter =
    !!search || statusFilter !== "ALL" || dateFrom !== today || dateTo !== today

  function handleRowClick(inv: InvoiceListItem) {
    const path =
      role === APP_ROLE.CASHIER
        ? generatePath(CASHIER_PATHS.E_INVOICE, { invoiceId: String(inv.id) })
        : generatePath(BRANCH_MANAGER_PATHS.E_INVOICE, { invoiceId: String(inv.id) })
    navigate(path)
  }

  if (!branchId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-surface-muted">
            <ReceiptText className="size-7 text-text-tertiary" />
          </span>
          <p className="text-sm font-semibold text-text-primary">Chưa chọn chi nhánh</p>
          <p className="text-xs text-text-tertiary">
            Vui lòng chọn chi nhánh để xem danh sách hóa đơn.
          </p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col min-h-screen bg-surface-page">
      {/* HEADER desktop */}
      <div className="hidden border-b border-border-default bg-surface-card px-6 py-5 sm:px-8 md:flex md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-text-primary">Hóa đơn</h1>
          <p className="mt-0.5 text-sm text-text-tertiary">
            {isLoading
              ? "Đang tải..."
              : `${filtered.length} hóa đơn · Tổng đã thu: ${formatVnd(totalPaid)}`}
          </p>
        </div>
      </div>

      <div className="flex-1 p-4 sm:p-6 space-y-4">
        {/* THANH CÔNG CỤ */}
        <div className="flex flex-col gap-3">
          {/* Hàng 1: lọc trạng thái */}
          <div className="flex flex-wrap gap-2">
            {FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                type="button"
                onClick={() => setStatusFilter(opt.value)}
                className={[
                  "h-8 shrink-0 rounded-full px-3.5 text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer",
                  statusFilter === opt.value
                    ? "bg-brand-primary text-text-on-brand shadow-xs"
                    : "bg-surface-card border border-border-default text-text-secondary hover:border-border-strong",
                ].join(" ")}
              >
                {opt.label}
              </button>
            ))}
          </div>

          {/* Hàng 2: lọc ngày + tìm kiếm */}
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
            <div className="flex items-center gap-2 flex-wrap">
              <Calendar className="size-4 shrink-0 text-text-tertiary" />
              <input
                type="date"
                value={dateFrom}
                max={dateTo || undefined}
                onChange={(e) => setDateFrom(e.target.value)}
                className="h-9 rounded-lg border border-border-default bg-surface-card px-2 text-sm text-text-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
              <span className="text-xs text-text-tertiary">đến</span>
              <input
                type="date"
                value={dateTo}
                min={dateFrom || undefined}
                onChange={(e) => setDateTo(e.target.value)}
                className="h-9 rounded-lg border border-border-default bg-surface-card px-2 text-sm text-text-primary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
              {(dateFrom || dateTo) && (
                <button
                  type="button"
                  onClick={() => {
                    setDateFrom("")
                    setDateTo("")
                  }}
                  className="text-xs text-brand-primary hover:underline cursor-pointer whitespace-nowrap"
                >
                  Tất cả ngày
                </button>
              )}
            </div>

            <div className="relative w-full sm:w-56 sm:ml-auto shrink-0">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-text-tertiary" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Số HĐ hoặc tên bàn..."
                className="h-10 w-full rounded-lg border border-border-default bg-surface-card pl-9 pr-8 text-sm text-text-primary placeholder:text-text-tertiary outline-none focus:border-brand-primary focus:ring-1 focus:ring-brand-primary"
              />
              {search && (
                <button
                  type="button"
                  onClick={() => setSearch("")}
                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
                >
                  <X className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* BẢNG DESKTOP */}
        <div className="hidden md:block min-w-0 max-w-full overflow-x-auto rounded-card border border-border-default bg-surface-card shadow-xs">
          <table className="w-full text-sm">
            <thead className="border-b border-border-default bg-surface-muted/40">
              <tr>
                <th className="py-3 pl-5 text-left text-xs font-semibold text-text-tertiary tracking-wide uppercase">
                  Số hóa đơn
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-text-tertiary tracking-wide uppercase">
                  Bàn
                </th>
                <th className="py-3 px-4 text-left text-xs font-semibold text-text-tertiary tracking-wide uppercase">
                  Thời gian
                </th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-text-tertiary tracking-wide uppercase">
                  Tổng tiền
                </th>
                <th className="py-3 pl-4 pr-5 text-left text-xs font-semibold text-text-tertiary tracking-wide uppercase">
                  Trạng thái
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/60">
              {isLoading ? (
                <tr>
                  <td colSpan={6} className="py-16 text-center text-sm text-text-tertiary">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
                      <span>Đang tải hóa đơn...</span>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-sm text-status-danger">
                    Không thể tải dữ liệu. Vui lòng thử lại.
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-14 text-center">
                    <EmptyRow hasFilter={hasActiveFilter} />
                  </td>
                </tr>
              ) : (
                filtered.map((inv) => (
                  <tr
                    key={inv.id}
                    onClick={() => handleRowClick(inv)}
                    className="cursor-pointer hover:bg-surface-muted/50 transition-colors group"
                  >
                    <td className="py-3.5 pl-5">
                      <span className="font-mono font-bold text-brand-primary">
                        {inv.invoiceNumber ?? `#${inv.id}`}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-text-primary">
                      {inv.tableName ?? "—"}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      {formatDateTime(inv.createdAt)}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-text-primary">
                      {formatVnd(inv.grandTotal)}
                    </td>
                    <td className="py-3.5 pl-4 pr-5">
                      <StatusBadge type="invoice" status={inv.status} />
                    </td>
                    <td className="py-3.5 pr-3 text-text-tertiary group-hover:text-text-secondary transition-colors">
                      <ChevronRight className="size-4" />
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
          {!isLoading && !isError && filtered.length > 0 && (
            <div className="border-t border-border-default/60 bg-surface-muted/20 px-5 py-3 text-xs text-text-tertiary">
              {filtered.length} hóa đơn{hasActiveFilter ? " (đã lọc)" : ""}
              {" · "}
              Tổng đã thu:{" "}
              <span className="font-bold text-brand-primary">{formatVnd(totalPaid)}</span>
            </div>
          )}
        </div>

        {/* DANH SÁCH THẺ MOBILE */}
        <div className="flex flex-col gap-2.5 md:hidden">
          {isLoading ? (
            <div className="flex justify-center py-16">
              <div className="size-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
            </div>
          ) : isError ? (
            <p className="py-8 text-center text-sm text-status-danger">
              Không thể tải dữ liệu. Vui lòng thử lại.
            </p>
          ) : filtered.length === 0 ? (
            <div className="rounded-card border border-border-default bg-surface-card py-14">
              <EmptyRow hasFilter={hasActiveFilter} />
            </div>
          ) : (
            filtered.map((inv) => (
              <button
                key={inv.id}
                type="button"
                onClick={() => handleRowClick(inv)}
                className="w-full rounded-card border border-border-default bg-surface-card px-4 py-3.5 text-left shadow-xs hover:border-border-strong transition-colors cursor-pointer"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <span className="font-mono font-bold text-brand-primary">
                      {inv.invoiceNumber ?? `#${inv.id}`}
                    </span>
                    <p className="mt-0.5 text-xs text-text-secondary truncate">
                      {inv.tableName ?? "—"}
                      {inv.createdAt ? ` · ${formatDateTime(inv.createdAt)}` : ""}
                    </p>
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-bold text-text-primary">
                      {formatVnd(inv.grandTotal)}
                    </span>
                    <StatusBadge type="invoice" status={inv.status} />
                  </div>
                </div>
              </button>
            ))
          )}
          {!isLoading && !isError && filtered.length > 0 && (
            <p className="text-center text-xs text-text-tertiary pt-1">
              {filtered.length} hóa đơn ·{" "}
              <span className="font-bold text-brand-primary">{formatVnd(totalPaid)}</span> đã thu
            </p>
          )}
        </div>
      </div>
    </div>
  )
}

function EmptyRow({ hasFilter }: { hasFilter: boolean }) {
  return (
    <div className="flex flex-col items-center gap-3">
      <span className="flex size-12 items-center justify-center rounded-full bg-surface-muted">
        <FileText className="size-6 text-text-tertiary" />
      </span>
      <div className="text-center">
        <p className="text-sm font-semibold text-text-primary">
          {hasFilter ? "Không có kết quả phù hợp" : "Chưa có hóa đơn"}
        </p>
        <p className="mt-1 text-xs text-text-tertiary">
          {hasFilter
            ? "Thử thay đổi bộ lọc hoặc từ khóa tìm kiếm."
            : "Hóa đơn sẽ xuất hiện sau khi thu ngân chốt bàn."}
        </p>
      </div>
    </div>
  )
}
