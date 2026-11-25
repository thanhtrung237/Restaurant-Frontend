import * as React from "react"
import { useLocation, useNavigate, useParams } from "react-router-dom"
import { takeawayListPath } from "@/app/router/paths/takeaway.paths"
import { Check, ChevronDown, Printer, ReceiptText, X, Loader2 } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogClose,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { HeaderOverflowMenu, type OverflowMenuAction } from "@/components/layout/HeaderOverflowMenu"
import { StickyActionBar } from "@/components/layout/StickyActionBar"
import { useToast } from "@/hooks/use-toast"
import { PageHeader } from "@/components/layout/PageHeader"
import { getStaffPaymentPaths } from "@/app/router/paths/staff-payment.paths"
import { CASHIER_PATHS } from "@/app/router/paths/cashier.paths"
import { BRANCH_MANAGER_PATHS } from "@/app/router/paths/branch-manager.paths"
import { APP_ROLE } from "@/config/roles"
import { useGoBack } from "@/hooks/use-go-back"
import { PAYMENT_METHOD_LABEL, type PaymentMethod } from "@/types/enums"
import { useInvoice, useOrderDetailsBySession, useIssueEInvoice } from "@/features/cashier/api"
import { useAuthStore } from "@/stores/auth.store"
import { isBillableDetail } from "@/lib/order-detail-billing"
import { InvoicePrint, type InvoiceAmountRow } from "./InvoicePrint"
import { groupInvoiceLines } from "./invoice-lines"

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`

const REFUND_REASONS = [
  "Tính nhầm giá món",
  "Khách trả lại món",
  "Chất lượng món không đạt",
  "Sai sót số lượng món",
  "Khách đổi ý trước khi chế biến",
  "Khác",
]

/**
 * Hoá đơn điện tử — kết nối thực với backend.
 *
 * Nút quay lại thông minh: dùng `navigate(-1)` nếu có trang trước trong app.
 * - Đến từ Checkout (lần đầu thanh toán) → quay về Sơ đồ bàn
 * - Đến từ Danh sách hóa đơn → quay về Danh sách hóa đơn
 * - Mở trực tiếp URL → về fallback theo role
 */
export default function EInvoicePage() {
  const { invoiceId: invoiceIdParam } = useParams<{ invoiceId: string }>()
  const navigate = useNavigate()
  const location = useLocation()
  const { toast } = useToast()
  const currentUser = useAuthStore((s) => s.account)
  const role = useAuthStore((s) => s.role)

  // Fallback khi mở trực tiếp URL (không có trang trước trong app)
  const fallbackPath =
    role === APP_ROLE.BRANCH_MANAGER
      ? BRANCH_MANAGER_PATHS.INVOICES
      : (getStaffPaymentPaths(role)?.TABLE_MAP ?? CASHIER_PATHS.TABLE_MAP)
  const goBack = useGoBack(fallbackPath)

  // Nhãn nút: dựa vào trang trước thực tế (history.state.idx)
  // idx = 0 → đây là trang đầu tiên (mở trực tiếp URL hoặc redirect sau checkout)
  // idx > 0 → đã có trang trước → dùng navigate(-1), nhãn theo trang đó
  const hasPreviousPage =
    typeof (window.history.state as { idx?: unknown } | null)?.idx === "number"
      ? (window.history.state as { idx: number }).idx > 0
      : true

  const invoiceId = invoiceIdParam ? parseInt(invoiceIdParam, 10) : undefined

  // --- Fetch dữ liệu từ BE ---
  const { data: invoice, isLoading: invoiceLoading, isError: invoiceError } = useInvoice(invoiceId)
  const backLabel = invoice?.takeaway
    ? "Về đơn mang về"
    : hasPreviousPage
      ? "Quay lại"
      : "Về sơ đồ bàn"

  const {
    data: orderDetails = [],
    isLoading: detailsLoading,
    isError: detailsError,
    refetch: refetchDetails,
  } = useOrderDetailsBySession(invoice?.tableSessionId)

  const issueEInvoiceMutation = useIssueEInvoice()

  // --- Tự động phát hành HĐĐT khi invoice đã PAID nhưng chưa ISSUED ---
  const hasTriedIssue = React.useRef(false)
  React.useEffect(() => {
    if (
      invoice &&
      invoice.status === "PAID" &&
      !hasTriedIssue.current &&
      !issueEInvoiceMutation.isPending
    ) {
      hasTriedIssue.current = true
      issueEInvoiceMutation.mutate(invoice.id, {
        onError: (err) => {
          toast({
            title: "Phát hành hóa đơn điện tử thất bại",
            description: err instanceof Error ? err.message : "Vui lòng thử lại.",
            variant: "danger",
          })
        },
      })
    }
  }, [invoice, issueEInvoiceMutation, toast])

  // --- Modal Hoàn tiền / Điều chỉnh ---
  const [isRefundModalOpen, setRefundModalOpen] = React.useState(false)
  const [refundReason, setRefundReason] = React.useState(REFUND_REASONS[0])
  const [refundAmount, setRefundAmount] = React.useState("0")
  const [refundMethod, setRefundMethod] = React.useState("Tiền mặt")

  const handleOpenRefundModal = React.useCallback(() => {
    // Điền sẵn số tiền đã thu thực tế
    const paid = invoice?.totalPaid ?? invoice?.grandTotal ?? 0
    setRefundAmount(Math.round(paid).toLocaleString("vi-VN"))
    setRefundReason(REFUND_REASONS[0])
    setRefundMethod("Tiền mặt")
    setRefundModalOpen(true)
  }, [invoice?.totalPaid, invoice?.grandTotal])

  function handleConfirmRefund() {
    if (!refundReason || !refundAmount.trim()) return
    toast({
      title: "Đã gửi yêu cầu hoàn tiền",
      description: `Yêu cầu hoàn ${refundAmount}đ cho hoá đơn ${invoice?.invoiceNumber ?? ""} đã được gửi tới Quản lý chi nhánh duyệt.`,
      variant: "success",
    })
    setRefundModalOpen(false)
  }

  function handleBackToTableMap() {
    if (invoice?.takeaway) {
      navigate(takeawayListPath(getStaffPaymentPaths(role)?.TABLE_MAP ?? CASHIER_PATHS.TABLE_MAP))
    } else {
      goBack()
    }
  }

  // Header mobile — gọi TRƯỚC các nhánh return sớm (quy tắc hook).
  // "Hoàn tiền / Điều chỉnh" (BR-30, FR-PAY-06) là thao tác phụ nhưng đặc tả yêu cầu,
  // nên chuyển vào menu "⋯" chứ không bỏ.
  const eInvoiceOverflowActions = React.useMemo<OverflowMenuAction[]>(
    () => [
      {
        key: "refund",
        label: "Hoàn tiền / Điều chỉnh",
        icon: ReceiptText,
        onSelect: handleOpenRefundModal,
      },
    ],
    [handleOpenRefundModal],
  )
  const eInvoiceHeaderOverflow = React.useMemo(
    () => <HeaderOverflowMenu actions={eInvoiceOverflowActions} />,
    [eInvoiceOverflowActions],
  )

  // Tách KM món — PHẢI đặt TRƯỚC mọi early return (Rules of Hooks)
  const itemPromoAmount = React.useMemo(
    () =>
      orderDetails
        .filter(isBillableDetail)
        .reduce((s, d) => s + (d.promotionDiscountAmount || 0), 0),
    [orderDetails],
  )

  // --- Loading ---
  if (invoiceLoading || detailsLoading || issueEInvoiceMutation.isPending) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center gap-3">
          <Loader2 className="size-12 animate-spin text-brand-primary" />
          <p className="text-sm text-text-secondary">
            {issueEInvoiceMutation.isPending
              ? "Đang phát hành hoá đơn điện tử..."
              : "Đang tải hoá đơn..."}
          </p>
        </div>
      </div>
    )
  }

  // --- Lỗi không tải được hóa đơn ---
  if (invoiceError || !invoice) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center gap-4 text-center">
          <div className="flex size-16 items-center justify-center rounded-full bg-status-danger-subtle">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-text-primary">Không tìm thấy hoá đơn</h2>
          <p className="text-sm text-text-tertiary">Hoá đơn không tồn tại hoặc đã bị xóa.</p>
          <button
            type="button"
            onClick={goBack}
            className="mt-2 h-10 px-5 rounded-xl bg-brand-primary text-sm font-semibold text-text-on-brand"
          >
            Quay lại
          </button>
        </div>
      </div>
    )
  }

  // --- Dữ liệu hiển thị từ BE ---
  const invoiceNumber = invoice.invoiceNumber ?? "—"

  // Định dạng ngày giờ từ ISO string của BE
  const formatDateTime = (iso?: string) => {
    if (!iso) return "—"
    const d = new Date(iso)
    const pad = (n: number) => String(n).padStart(2, "0")
    return `${pad(d.getDate())}/${pad(d.getMonth() + 1)}/${d.getFullYear()} · ${pad(d.getHours())}:${pad(d.getMinutes())}`
  }
  const issuedAt = formatDateTime(invoice.eInvoiceIssuedAt ?? invoice.createdAt)

  // Tiền
  const subTotal = invoice.subTotalBeforeDiscount ?? 0
  const totalPromotionDiscount = invoice.totalPromotionDiscount ?? 0
  const totalManualDiscount = invoice.totalManualDiscount ?? 0
  const serviceFee = invoice.serviceFee ?? 0
  const vatAmount = invoice.vatAmount ?? 0
  const grandTotal = invoice.grandTotal ?? 0

  const itemDiscount = invoice.itemPromotionDiscount ?? itemPromoAmount
  const orderPromoDiscount =
    invoice.orderPromotionDiscount ?? Math.max(0, totalPromotionDiscount - itemDiscount)
  const promotionName = invoice.orderPromotionName ?? invoice.promotionName
  const amounts: InvoiceAmountRow[] = [{ label: "Tiền hàng", amount: subTotal - itemDiscount }]
  if (orderPromoDiscount > 0) {
    amounts.push({
      label: promotionName ? `Khuyến mãi đơn (${promotionName})` : "Khuyến mãi đơn",
      amount: -orderPromoDiscount,
    })
  }
  if (totalManualDiscount > 0) {
    amounts.push({ label: "Chiết khấu thủ công", amount: -totalManualDiscount })
  }
  amounts.push({ label: "Phí dịch vụ", amount: serviceFee }, { label: "VAT", amount: vatAmount })

  // Thông tin payment (lấy payment đầu tiên — luồng tiền mặt chỉ có 1)
  const firstPayment = invoice.payments?.[0]
  const paymentMethod: PaymentMethod = (firstPayment?.method as PaymentMethod) ?? "CASH"
  const amountTendered = firstPayment?.amountTendered ?? grandTotal
  const changeAmount = firstPayment?.changeAmount ?? Math.max(0, amountTendered - grandTotal)

  // Thu ngân
  const cashierNameDisplay = currentUser?.fullName ?? "Thu ngân"

  // Thông tin bàn / phiên
  const tableName = invoice.tableName ?? `Bàn #${invoice.tableSessionId}`
  const sessionCode = `#${invoice.tableSessionId}`

  // Tên nhà hàng / địa chỉ (lấy từ branchName, không có thì để trống)
  const restaurantName = invoice.branchName ?? "Nhà hàng"
  const restaurantAddress = "" // BE InvoiceResponse không trả address; để trống hoặc lấy từ branch riêng

  const items = groupInvoiceLines(orderDetails)

  // Đã phát hành HĐĐT thành công?
  const isIssued = (invoice.status as string) === "ISSUED" || issueEInvoiceMutation.isSuccess
  const canPrint = isIssued && !detailsError && items.length > 0

  // Số tiền đã thu hiển thị trong modal (tổng paid)
  const amountPaidDisplay = formatVnd(invoice.totalPaid ?? grandTotal)

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page">
      {canPrint && (
        <InvoicePrint
          invoice={invoice}
          issuedAt={issuedAt}
          tableName={tableName}
          items={items}
          amounts={amounts}
          autoPrint={
            location.state?.autoPrint === true &&
            invoice.payments?.some((payment) => payment.bankVerified)
          }
        />
      )}
      {/* ============================================================
          HEADER: Tiêu đề + Cụm nút hành động
          ============================================================ */}
      <PageHeader
        title="Hoá đơn điện tử"
        subtitle={invoice.takeaway ? tableName : `${tableName} · Phiên ${sessionCode} đã đóng`}
        mobileHeaderActions={eInvoiceHeaderOverflow}
        actions={
          <>
            <Button
              type="button"
              variant="outline"
              onClick={handleOpenRefundModal}
              className="h-10 gap-2 border-border-default px-4 text-text-primary hover:bg-surface-muted"
            >
              <ReceiptText className="size-4 text-text-secondary" />
              Hoàn tiền / Điều chỉnh
            </Button>

            <Button type="button" onClick={handleBackToTableMap} className="h-10 px-5">
              {backLabel}
            </Button>
          </>
        }
      />

      {/* ============================================================
          NỘI DUNG CHÍNH: 2 Cột
          ============================================================ */}
      <div className="grid flex-1 grid-cols-1 gap-6 p-6 sm:p-8 xl:grid-cols-[1fr_340px]">
        {/* CỘT TRÁI: Chi tiết hoá đơn */}
        <div className="rounded-2xl border border-border-default/80 bg-surface-card p-6 sm:p-8 shadow-xs flex flex-col justify-between">
          <div>
            {/* Header nhà hàng & số hóa đơn */}
            <div className="flex flex-wrap items-start justify-between gap-4">
              <div>
                <p className="text-base font-bold text-text-primary">{restaurantName}</p>
                {restaurantAddress && (
                  <p className="mt-1 text-xs text-text-tertiary">{restaurantAddress}</p>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-text-tertiary">Số hoá đơn</p>
                <p className="font-mono text-base font-bold text-brand-primary mt-0.5">
                  {invoiceNumber}
                </p>
                <p className="text-xs text-text-tertiary mt-0.5">{issuedAt}</p>
              </div>
            </div>

            {/* Bảng danh sách món */}
            <div className="mt-8 overflow-hidden rounded-xl">
              <table className="w-full text-sm">
                <thead className="bg-[#f8fafc] text-xs font-semibold tracking-wider text-text-tertiary">
                  <tr>
                    <th className="py-2.5 pl-4 text-left font-semibold">MÓN</th>
                    <th className="py-2.5 text-center font-semibold">SL</th>
                    <th className="py-2.5 text-right font-semibold">GIÁ</th>
                    <th className="py-2.5 pr-4 text-right font-semibold">THÀNH TIỀN</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-default/40">
                  {items.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-6 text-center text-sm text-text-tertiary">
                        Không có dữ liệu món
                      </td>
                    </tr>
                  ) : (
                    items.map((item) => (
                      <tr key={item.id}>
                        <td className="py-3.5 pl-4">
                          <p className="font-bold text-text-primary">{item.name}</p>
                          {item.options && item.options.length > 0 ? (
                            <div className="mt-0.5 space-y-0.5">
                              {item.options.map((opt) => (
                                <p key={opt.id} className="text-xs text-text-tertiary">
                                  + {opt.optionItemName}
                                  {opt.priceSnapshot > 0
                                    ? ` +${opt.priceSnapshot.toLocaleString("vi-VN")}đ`
                                    : " (Miễn phí)"}
                                </p>
                              ))}
                            </div>
                          ) : null}
                        </td>
                        <td className="py-3.5 text-center font-medium text-text-secondary">
                          {item.weightKg != null
                            ? `${item.weightKg.toLocaleString("vi-VN")} kg`
                            : item.quantity}
                        </td>
                        <td className="py-3.5 text-right font-bold text-text-primary">
                          {formatVnd(item.price)}
                          {item.weightKg != null ? " / kg" : ""}
                        </td>
                        <td className="py-3.5 pr-4 text-right font-bold text-text-primary">
                          {formatVnd(item.lineTotal)}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Phần tổng tiền */}
          <div className="mt-8 ml-auto max-w-xs w-full space-y-2.5">
            {amounts.map(({ label, amount }) => (
              <div key={label} className="flex items-center justify-between gap-3 text-sm">
                <span
                  className={
                    amount < 0 ? "font-semibold text-status-success" : "text-text-secondary"
                  }
                >
                  {label}
                </span>
                <span
                  className={
                    amount < 0
                      ? "shrink-0 font-bold text-status-success"
                      : "shrink-0 font-bold text-text-primary"
                  }
                >
                  {formatVnd(amount)}
                </span>
              </div>
            ))}
            <div className="flex items-center justify-between pt-2">
              <span className="text-base font-bold text-text-primary">Tổng cộng</span>
              <span className="text-2xl font-bold text-brand-primary">{formatVnd(grandTotal)}</span>
            </div>
          </div>
        </div>

        {/* CỘT PHẢI: Trạng thái + thanh toán */}
        <div className="space-y-4">
          {/* Card trạng thái phát hành */}
          <div className="flex flex-col items-center gap-2 rounded-2xl border border-border-default/80 bg-surface-card p-6 text-center shadow-xs">
            {isIssued ? (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-[#e6f7ef] text-[#12B76A]">
                  <Check className="size-6 stroke-[2.5]" />
                </span>
                <p className="text-base font-bold text-text-primary mt-1">
                  Phát hành hoá đơn thành công
                </p>
                <p className="text-xs text-text-tertiary">Đã gửi dữ liệu tới cơ quan thuế</p>
              </>
            ) : (
              <>
                <span className="flex size-12 items-center justify-center rounded-full bg-[#fef3c7] text-[#D97706]">
                  <ReceiptText className="size-6" />
                </span>
                <p className="text-base font-bold text-text-primary mt-1">Hoá đơn đã thanh toán</p>
                <p className="text-xs text-text-tertiary">
                  {invoice.status === "PENDING"
                    ? "Đang chờ thanh toán"
                    : `Trạng thái: ${invoice.status}`}
                </p>
              </>
            )}
          </div>

          {/* Card chi tiết thanh toán */}
          <div className="space-y-3.5 rounded-2xl border border-border-default/80 bg-surface-card p-5 shadow-xs">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-tertiary">Phương thức</span>
              <span className="font-bold text-text-primary">
                {PAYMENT_METHOD_LABEL[paymentMethod] ?? "Tiền mặt"}
              </span>
            </div>
            {firstPayment && (
              <>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">Khách đưa</span>
                  <span className="font-bold text-text-primary">{formatVnd(amountTendered)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-tertiary">Tiền thối</span>
                  <span className="font-bold text-text-primary">{formatVnd(changeAmount)}</span>
                </div>
              </>
            )}
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-tertiary">Thu ngân</span>
              <span className="font-bold text-text-primary">{cashierNameDisplay}</span>
            </div>
          </div>

          {/* Nút In hóa đơn */}
          <Button
            type="button"
            onClick={() => window.print()}
            disabled={!canPrint}
            className="h-12 w-full rounded-xl font-bold"
          >
            <Printer aria-hidden="true" />
            In hóa đơn
          </Button>
          {detailsError && (
            <div role="alert" className="text-sm text-text-secondary">
              Chưa tải được các món trên hóa đơn.
              <Button type="button" variant="link" size="sm" onClick={() => void refetchDetails()}>
                Tải lại món
              </Button>
            </div>
          )}
        </div>
      </div>

      {/* ============================================================
          MODAL: Hoàn tiền / Điều chỉnh
          ============================================================ */}
      <Dialog open={isRefundModalOpen} onOpenChange={setRefundModalOpen}>
        <DialogContent
          showCloseButton={false}
          className="w-[calc(100%-2rem)] max-w-[560px] sm:max-w-[560px] rounded-2xl p-6 sm:p-7 gap-0 border border-border-default/60 bg-surface-card shadow-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden"
        >
          {/* Nút đóng */}
          <DialogClose asChild>
            <button
              type="button"
              className="absolute top-5 right-5 size-7 rounded-full bg-surface-muted flex items-center justify-center text-text-tertiary hover:bg-border-default hover:text-text-primary transition-colors cursor-pointer"
              aria-label="Đóng"
            >
              <X className="size-3.5" />
            </button>
          </DialogClose>

          {/* Tiêu đề */}
          <DialogHeader className="gap-1 text-left pr-8">
            <DialogTitle className="text-xl font-bold text-text-primary">
              Hoàn tiền / Điều chỉnh hóa đơn
            </DialogTitle>
            <DialogDescription className="text-xs text-text-tertiary font-normal leading-relaxed">
              Cần Quản lý chi nhánh duyệt. Khi duyệt, hệ thống sinh hóa đơn điều chỉnh (BR-12).
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4.5 mt-5">
            {/* Box tóm tắt hóa đơn */}
            <div className="space-y-2 rounded-xl bg-[#f8fafc] p-4 border border-border-default/40">
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">Hóa đơn</span>
                <span className="font-bold text-text-primary">{invoiceNumber}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">Bàn / Phiên</span>
                <span className="font-bold text-text-primary">
                  {tableName} · {sessionCode}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-text-tertiary">Đã thu</span>
                <span className="font-bold text-text-primary">{amountPaidDisplay}</span>
              </div>
            </div>

            {/* Lý do */}
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-text-secondary block">
                Lý do hoàn tiền
              </label>
              <div className="relative">
                <select
                  value={refundReason}
                  onChange={(e) => setRefundReason(e.target.value)}
                  className="w-full h-11 appearance-none rounded-xl border border-border-strong/70 bg-surface-card pl-3.5 pr-9 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all cursor-pointer"
                >
                  {REFUND_REASONS.map((r) => (
                    <option key={r} value={r}>
                      {r}
                    </option>
                  ))}
                </select>
                <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-text-tertiary pointer-events-none" />
              </div>
            </div>

            {/* Số tiền hoàn & hình thức */}
            <div className="grid grid-cols-2 gap-3.5">
              <div className="min-w-0 space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">
                  Số tiền hoàn
                </label>
                <div className="relative flex items-center">
                  <input
                    type="text"
                    value={refundAmount}
                    onChange={(e) => {
                      const val = e.target.value.replace(/[^0-9]/g, "")
                      setRefundAmount(val ? Number(val).toLocaleString("vi-VN") : "")
                    }}
                    placeholder="0"
                    className="w-full h-11 rounded-xl border border-border-strong/70 bg-surface-card pl-3.5 pr-8 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all"
                  />
                  <span className="absolute right-3.5 text-sm text-text-tertiary pointer-events-none">
                    đ
                  </span>
                </div>
                <p className="text-[11px] text-text-tertiary leading-tight">
                  Có thể hoàn một phần hoặc toàn bộ hóa đơn.
                </p>
              </div>

              <div className="min-w-0 space-y-1.5">
                <label className="text-xs font-semibold text-text-secondary block">
                  Hình thức hoàn
                </label>
                <div className="relative">
                  <select
                    value={refundMethod}
                    onChange={(e) => setRefundMethod(e.target.value)}
                    className="w-full h-11 appearance-none rounded-xl border border-border-strong/70 bg-surface-card pl-3.5 pr-9 text-sm font-medium text-text-primary focus:outline-none focus:ring-2 focus:ring-brand-primary/20 focus:border-brand-primary transition-all cursor-pointer"
                  >
                    <option value="Tiền mặt">Tiền mặt</option>
                    <option value="Chuyển khoản QR">Chuyển khoản QR</option>
                  </select>
                  <ChevronDown className="absolute right-3.5 top-1/2 -translate-y-1/2 size-4 text-text-tertiary pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Thông báo BR-12 */}
            <div className="rounded-xl bg-[#fffaf0] border border-[#fde68a]/60 p-3.5 text-center">
              <p className="text-xs font-medium text-[#b45309] leading-relaxed">
                Cần Quản lý chi nhánh duyệt. Hệ thống ghi nhật ký (BR-12) và gửi thông báo điều
                chỉnh thuế theo mẫu 04/SS-HĐĐT.
              </p>
            </div>

            {/* Nút bấm */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRefundModalOpen(false)}
                className="h-11 min-w-0 rounded-xl border border-border-strong/80 bg-surface-card hover:bg-surface-muted text-sm font-semibold text-text-secondary transition-colors cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmRefund}
                disabled={!refundAmount.trim()}
                className="h-11 min-w-0 rounded-xl bg-brand-primary hover:bg-brand-primary-hover active:scale-[0.99] text-sm font-bold text-text-on-brand transition-all shadow-xs disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer whitespace-nowrap px-2 flex items-center justify-center"
              >
                Gửi yêu cầu hoàn tiền
              </button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* <md: hành động chính của màn — quay về sơ đồ bàn để phục vụ bàn tiếp theo */}
      <StickyActionBar>
        <Button className="h-11 w-full font-semibold" onClick={handleBackToTableMap}>
          {backLabel}
        </Button>
      </StickyActionBar>
    </div>
  )
}
