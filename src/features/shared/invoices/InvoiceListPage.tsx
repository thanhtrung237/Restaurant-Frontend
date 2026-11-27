import * as React from "react"
import { useNavigate, useSearchParams, generatePath } from "react-router-dom"
import { FileText, ChevronRight, ReceiptText } from "lucide-react"
import { useInvoicesByBranch } from "@/api/invoices.api"
import { useBranchesByRestaurant } from "@/api/branches.api"
import { useAuthStore } from "@/stores/auth.store"
import { StatusBadge } from "@/components/common/StatusBadge"
import { CASHIER_PATHS } from "@/app/router/paths/cashier.paths"
import { BRANCH_MANAGER_PATHS } from "@/app/router/paths/branch-manager.paths"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths/restaurant-admin.paths"
import { APP_ROLE } from "@/config/roles"
import { vietnamTodayKey } from "@/lib/calendar-range"
import type { InvoiceListItem } from "@/types/models"
import { InvoiceFilterBar } from "./InvoiceFilterBar"
import { InvoiceFilterSelect } from "./InvoiceFilterSelect"
import {
  filterInvoices,
  formatInvoiceDateTime,
  getInvoiceLocations,
  paymentStatus,
  readInvoiceFilters,
  writeInvoiceFilters,
  type InvoiceFiltersValue,
  type PaymentFilter,
} from "./invoice-filters"

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`

/**
 * Tra cứu hóa đơn theo chi nhánh. Quản trị nhà hàng chọn trong các chi nhánh của nhà hàng mình.
 * API: GET /invoices/branch/{branchId}
 * Giữ bộ lọc trong URL để có thể quay lại từ trang chi tiết.
 */
export default function InvoiceListPage() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()
  const role = useAuthStore((s) => s.role)
  const activeBranchId = useAuthStore((s) => s.branchId)
  const restaurantId = useAuthStore((s) => s.account?.restaurantId)
  const isRestaurantAdmin = role === APP_ROLE.RESTAURANT_ADMIN
  const {
    data: branches = [],
    isLoading: branchesLoading,
    isError: branchesError,
    refetch: refetchBranches,
  } = useBranchesByRestaurant(isRestaurantAdmin ? (restaurantId ?? undefined) : undefined)
  const requestedBranch = branches.find(
    (branch) => String(branch.id) === searchParams.get("chi-nhanh"),
  )
  const activeBranch = branches.find((branch) => branch.id === activeBranchId)
  const branchId = isRestaurantAdmin
    ? (requestedBranch ?? activeBranch ?? branches[0])?.id
    : activeBranchId

  const [today] = React.useState(vietnamTodayKey)
  const filters = React.useMemo(
    () => readInvoiceFilters(searchParams, today),
    [searchParams, today],
  )
  const {
    data: invoices = [],
    isLoading,
    isError,
    refetch,
  } = useInvoicesByBranch(branchId ?? undefined)

  function updateFilters(next: InvoiceFiltersValue) {
    setSearchParams(writeInvoiceFilters(searchParams, next), { replace: true })
  }

  const matchingInvoices = filterInvoices(invoices, filters)
  const counts: Record<PaymentFilter, number> = {
    ALL: matchingInvoices.length,
    PENDING: 0,
    PAID: 0,
    CANCELLED: 0,
    REFUNDED: 0,
  }
  for (const invoice of matchingInvoices) counts[paymentStatus(invoice.status)] += 1

  const filtered =
    filters.status === "ALL"
      ? matchingInvoices
      : matchingInvoices.filter((invoice) => paymentStatus(invoice.status) === filters.status)
  const locations = getInvoiceLocations(invoices)
  const totalPaid = filtered
    .filter((invoice) => paymentStatus(invoice.status) === "PAID")
    .reduce((total, invoice) => total + (Number(invoice.grandTotal) || 0), 0)
  const hasActiveFilter =
    filters.status !== "ALL" ||
    !!filters.search ||
    !!filters.range ||
    filters.advanced.issuance !== "all" ||
    !!filters.advanced.area ||
    !!filters.advanced.table ||
    !!filters.advanced.min ||
    !!filters.advanced.max

  function handleRowClick(inv: InvoiceListItem) {
    const detailPath = isRestaurantAdmin
      ? RESTAURANT_ADMIN_PATHS.INVOICE_DETAILS
      : role === APP_ROLE.CASHIER
        ? CASHIER_PATHS.E_INVOICE
        : BRANCH_MANAGER_PATHS.E_INVOICE
    navigate(generatePath(detailPath, { invoiceId: String(inv.id) }))
  }

  if (isRestaurantAdmin && (branchesLoading || branchesError)) {
    return (
      <div className="p-6 text-center text-sm text-text-secondary">
        {branchesLoading ? (
          <p role="status">Đang tải chi nhánh…</p>
        ) : (
          <div role="alert">
            <p>Không thể tải danh sách chi nhánh.</p>
            <button
              type="button"
              onClick={() => void refetchBranches()}
              className="mt-2 font-semibold text-brand-primary underline"
            >
              Thử lại
            </button>
          </div>
        )}
      </div>
    )
  }

  if (!branchId) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center p-6">
        <div className="flex flex-col items-center gap-3 text-center">
          <span className="flex size-14 items-center justify-center rounded-full bg-surface-muted">
            <ReceiptText className="size-7 text-text-tertiary" />
          </span>
          <p className="text-sm font-semibold text-text-primary">
            {isRestaurantAdmin ? "Chưa có chi nhánh để tra cứu" : "Chưa chọn chi nhánh"}
          </p>
          <p className="text-xs text-text-tertiary">
            {isRestaurantAdmin
              ? "Hóa đơn được tra cứu theo từng chi nhánh của nhà hàng."
              : "Vui lòng chọn chi nhánh để xem danh sách hóa đơn."}
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
        <InvoiceFilterBar
          key={branchId}
          filters={filters}
          counts={isLoading || isError ? undefined : counts}
          today={today}
          locations={locations}
          onChange={updateFilters}
          branchSelector={
            isRestaurantAdmin && (
              <div className="w-full max-w-sm">
                <InvoiceFilterSelect
                  label="Chi nhánh"
                  value={String(branchId)}
                  options={branches.map((branch) => ({
                    value: String(branch.id),
                    label: branch.name,
                  }))}
                  onChange={(nextBranchId) => {
                    const next = writeInvoiceFilters(searchParams, {
                      ...filters,
                      advanced: { ...filters.advanced, area: "", table: "" },
                    })
                    next.set("chi-nhanh", nextBranchId)
                    setSearchParams(next, { replace: true })
                  }}
                />
              </div>
            )
          }
        />

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
                <th className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-text-tertiary">
                  Nhân viên bán
                </th>
                <th className="py-3 px-4 text-right text-xs font-semibold text-text-tertiary tracking-wide uppercase">
                  Tổng tiền
                </th>
                <th className="py-3 pl-4 pr-5 text-left text-xs font-semibold text-text-tertiary tracking-wide uppercase">
                  Thanh toán / HĐĐT
                </th>
                <th className="w-8" />
              </tr>
            </thead>
            <tbody className="divide-y divide-border-default/60">
              {isLoading ? (
                <tr>
                  <td colSpan={7} className="py-16 text-center text-sm text-text-tertiary">
                    <div className="flex flex-col items-center gap-2">
                      <div className="size-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
                      <span>Đang tải hóa đơn...</span>
                    </div>
                  </td>
                </tr>
              ) : isError ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-sm text-status-danger">
                    <InvoiceListError onRetry={() => void refetch()} />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-14 text-center">
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
                      <button
                        type="button"
                        className="font-mono font-bold text-brand-primary hover:underline"
                        onClick={(event) => {
                          event.stopPropagation()
                          handleRowClick(inv)
                        }}
                      >
                        {inv.invoiceNumber ?? `#${inv.id}`}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-text-primary">
                      {inv.tableName ?? "—"}
                    </td>
                    <td className="py-3.5 px-4 text-text-secondary">
                      {formatInvoiceDateTime(inv.createdAt)}
                    </td>
                    <td className="px-4 py-3.5 text-text-secondary [overflow-wrap:anywhere]">
                      {inv.issuerName?.trim() || "—"}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-text-primary">
                      {formatVnd(inv.grandTotal)}
                    </td>
                    <td className="py-3.5 pl-4 pr-5">
                      <InvoiceListStatuses status={inv.status} />
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
            <div className="py-8 text-center">
              <InvoiceListError onRetry={() => void refetch()} />
            </div>
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
                      {inv.createdAt ? ` · ${formatInvoiceDateTime(inv.createdAt)}` : ""}
                    </p>
                    {inv.issuerName?.trim() && (
                      <p className="mt-1 text-xs text-text-secondary [overflow-wrap:anywhere]">
                        Nhân viên bán: {inv.issuerName.trim()}
                      </p>
                    )}
                  </div>
                  <div className="flex flex-col items-end gap-1.5 shrink-0">
                    <span className="text-sm font-bold text-text-primary">
                      {formatVnd(inv.grandTotal)}
                    </span>
                    <InvoiceListStatuses status={inv.status} />
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

function InvoiceListStatuses({ status }: { status: InvoiceListItem["status"] }) {
  return (
    <div className="flex flex-wrap justify-end gap-1.5 md:justify-start">
      <StatusBadge type="invoice" status={paymentStatus(status)} />
      {status === "ISSUED" && (
        <span className="whitespace-nowrap rounded-full bg-surface-muted px-2 py-1 text-xs text-text-secondary">
          Đã phát hành HĐĐT
        </span>
      )}
    </div>
  )
}

function InvoiceListError({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="space-y-2 text-sm">
      <p className="text-status-danger">Không thể tải danh sách hóa đơn.</p>
      <button
        type="button"
        className="font-semibold text-brand-primary underline"
        onClick={onRetry}
      >
        Thử lại
      </button>
    </div>
  )
}
