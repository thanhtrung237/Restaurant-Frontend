import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { ChevronLeft } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Divider } from "@/components/ui/divider"
import { useToast } from "@/hooks/use-toast"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { useInvoiceBySession, useOrderDetailsBySession } from "@/features/customer/api"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { formatVnd } from "@/features/customer/lib/pricing"
import { sumBillableAmount, isBillableDetail, getCancelInfo } from "@/lib/order-detail-billing"

/**
 * Hoá đơn
 * Nguồn: Mobile / Hóa đơn
 *
 * API: GET /invoices/session/{tableSessionId}
 * Hiển thị hóa đơn đã được tạo bởi thu ngân hoặc tạm tính từ order details
 */
export default function InvoicePage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  const { toast } = useToast()

  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const tableName = tableSession?.tableName || "Bàn"
  const tableSessionId = tableSession?.id

  // Fetch invoice
  const { data: invoice, isLoading: invoiceLoading } = useInvoiceBySession(tableSessionId)
  
  // Fallback: fetch order details nếu chưa có invoice  
  const { data: orderDetails = [] } = useOrderDetailsBySession(
    tableSessionId,
    undefined,
    { enabled: !invoice && !invoiceLoading }
  )

  // Invoice (BE) không expose danh sách dòng món riêng — luôn gộp từ order details.
  // Món đã huỷ được gộp riêng theo lý do huỷ (không gộp chung với món còn tính tiền
  // của cùng 1 món ăn), để khách vẫn thấy rõ món nào bị huỷ / có tính tiền hay không.
  const lineItems = React.useMemo(() => {
    const grouped = new Map()
    orderDetails.forEach((detail) => {
      const cancelInfo = getCancelInfo(detail)
      // Thêm options vào key để phân biệt món có options khác nhau
      const optionsKey = detail.options?.map(opt => opt.optionItemId).sort().join('-') || 'no-options'
      const key = `${detail.dishId}-${detail.priceAtOrderTime || 0}-${cancelInfo ? cancelInfo.label + cancelInfo.billable : "active"}-${optionsKey}`
      const existing = grouped.get(key)
      if (existing) {
        existing.quantity += detail.quantity
      } else {
        grouped.set(key, {
          key,
          dishId: String(detail.dishId),
          dishName: detail.dishName,
          quantity: detail.quantity,
          unitPrice: detail.priceAtOrderTime || 0,
          note: detail.note,
          options: detail.options,
          cancelInfo,
          billable: isBillableDetail(detail),
        })
      }
    })
    return Array.from(grouped.values())
  }, [orderDetails])

  // Chỉ cộng dòng món tính tiền (bỏ qua món đã huỷ không tính tiền), khớp BE
  const subtotal = invoice?.subTotalBeforeDiscount ?? sumBillableAmount(orderDetails)
  const discountAmount = invoice?.totalManualDiscount || 0
  const serviceFee = invoice?.serviceFee || 0
  const vatAmount = invoice?.vatAmount || 0
  const grandTotal = invoice?.grandTotal || (subtotal - discountAmount + serviceFee + vatAmount)

  const sessionDateLabel = React.useMemo(() => {
    const raw = invoice?.createdAt || tableSession?.openedAt
    const date = raw ? new Date(raw) : new Date()
    return date.toLocaleDateString("vi-VN")
  }, [invoice?.createdAt, tableSession?.openedAt])

  function handleCallStaffForCash() {
    // TODO(api): POST /api/table-sessions/:id/call-staff { reason: "CASH_PAYMENT" } khi có backend
    toast({
      title: "Đã gọi nhân viên",
      description: `${tableName} · Nhân viên sẽ đến thu tiền mặt trong giây lát.`,
      variant: "info",
    })
  }

  // Loading state
  if (invoiceLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
          <p className="text-sm text-text-secondary">Đang tải hóa đơn...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-page">
      {/* ---- Header ---- */}
      <div className="sticky top-0 z-10 border-b border-border-default bg-surface-card px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3">
        <div className="mx-auto flex w-full max-w-2xl items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            aria-label="Quay lại"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="min-w-0 truncate text-lg font-bold text-text-primary">Hoá đơn tạm tính</h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto w-full max-w-2xl space-y-3">
          {/* ---- Thẻ thông tin phiên ---- */}
          <div className="rounded-card border border-border-default bg-surface-card px-5 py-4 text-center shadow-xs">
            <p className="text-base font-bold text-text-primary">{invoice?.branchName || "Nhà hàng Phở Việt"}</p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {tableName} · Phiên #{tableSession?.id ?? "—"} · {sessionDateLabel}
            </p>
          </div>

          {/* ---- Danh sách món (gộp cả phiên) ---- */}
          <div className="rounded-card border border-border-default bg-surface-card px-5 py-2">
            {lineItems.length === 0 ? (
              <p className="py-4 text-center text-sm text-text-tertiary">
                Chưa có món nào được ghi nhận cho phiên này.
              </p>
            ) : (
              lineItems.map((line, index) => (
                <React.Fragment key={line.key}>
                  {index > 0 ? <Divider /> : null}
                  <div className="flex items-center justify-between gap-3 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p
                        className={
                          line.cancelInfo
                            ? "truncate font-medium text-text-tertiary line-through"
                            : "truncate font-medium text-text-primary"
                        }
                      >
                        {line.quantity}× {line.dishName}
                      </p>
                      {line.options && line.options.length > 0 ? (
                        <p className="truncate text-xs text-text-tertiary">
                          {line.options.map((opt) => opt.optionItemName).join(", ")}
                        </p>
                      ) : null}
                      {line.note ? (
                        <p className="truncate text-xs text-text-tertiary">{line.note}</p>
                      ) : null}
                      {line.cancelInfo ? (
                        <span
                          className={
                            line.cancelInfo.billable
                              ? "mt-1 inline-block rounded-pill bg-status-warning-subtle px-2 py-0.5 text-xs font-semibold text-status-warning"
                              : "mt-1 inline-block rounded-pill bg-status-danger-subtle px-2 py-0.5 text-xs font-semibold text-status-danger"
                          }
                        >
                          {line.cancelInfo.label} ·{" "}
                          {line.cancelInfo.billable ? "vẫn tính tiền" : "không tính tiền"}
                        </span>
                      ) : null}
                    </div>
                    <span
                      className={
                        line.billable
                          ? "shrink-0 font-medium text-text-primary"
                          : "shrink-0 font-medium text-text-tertiary line-through"
                      }
                    >
                      {formatVnd(line.unitPrice * line.quantity)}
                    </span>
                  </div>
                </React.Fragment>
              ))
            )}
          </div>

          {/* ---- Tóm tắt tiền ---- */}
          <div className="rounded-card border border-border-default bg-surface-card px-5 py-3 shadow-xs">
            <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-tertiary">Tiền hàng</span>
              <span className="font-medium text-text-primary">{formatVnd(subtotal)}</span>
            </div>
            {discountAmount > 0 ? (
              <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="truncate text-status-success">Khuyến mãi</span>
                <span className="shrink-0 font-medium text-status-success">
                  -{formatVnd(discountAmount)}
                </span>
              </div>
            ) : null}
            <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-tertiary">Phí dịch vụ ({Math.round((serviceFee / (subtotal - discountAmount)) * 100)}%)</span>
              <span className="font-medium text-text-primary">{formatVnd(serviceFee)}</span>
            </div>
            <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
              <span className="text-text-tertiary">VAT ({Math.round((vatAmount / (subtotal - discountAmount + serviceFee)) * 100)}%)</span>
              <span className="font-medium text-text-primary">{formatVnd(vatAmount)}</span>
            </div>
            <Divider className="my-1" />
            <div className="flex items-center justify-between gap-3 py-1.5 text-base">
              <span className="font-bold text-text-primary">Tổng cộng</span>
              <span className="font-bold text-brand-primary">{formatVnd(grandTotal)}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Vùng cố định dưới cùng: 2 cách thanh toán ---- */}
      <div className="border-t border-border-default bg-surface-page px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-2xl space-y-2">
          <Button
            size="lg"
            className="w-full"
            onClick={() => navigate(generatePath(CUSTOMER_PATHS.PAYMENT_QR, { qrCode: qrCode ?? "" }))}
          >
            Thanh toán chuyển khoản (QR)
          </Button>
          <button
            type="button"
            onClick={handleCallStaffForCash}
            className="w-full text-center text-sm font-medium text-text-tertiary underline-offset-2 hover:text-text-secondary hover:underline"
          >
            Hoặc gọi nhân viên thu tiền mặt
          </button>
        </div>
      </div>
    </div>
  )
}