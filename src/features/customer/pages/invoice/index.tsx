import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { ChevronLeft, ReceiptText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Divider } from "@/components/ui/divider"
import { useToast } from "@/hooks/use-toast"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { useGoBack } from "@/hooks/use-go-back"
import { useOrderDetailsBySession } from "@/features/customer/api"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { formatVnd } from "@/features/customer/lib/pricing"
import { isBillableDetail, getCancelInfo } from "@/lib/order-detail-billing"
import type { CancelInfo } from "@/lib/order-detail-billing"
import type { OrderDetailOption } from "@/types/models"
import { useBill } from "@/hooks/useBill"

/**
 * 1 dòng hiển thị trên hoá đơn tạm tính — kết quả gộp nhiều OrderDetail cùng món,
 * cùng đơn giá, cùng options và cùng tình trạng huỷ.
 */
interface InvoiceLineItem {
  key: string
  dishId: string
  dishName?: string
  quantity: number
  unitPrice: number
  /** Tổng giá topping/option của 1 suất món (sum của priceSnapshot các options) */
  optionsTotalPrice: number
  /** Tổng số tiền giảm giá KM món (sum của promotionDiscountAmount các detail cùng nhóm) */
  totalDiscountAmount: number
  promotionName?: string
  note?: string
  options?: OrderDetailOption[]
  cancelInfo: CancelInfo | null
  billable: boolean
}

/**
 * Hoá đơn
 * Nguồn: Mobile / Hóa đơn
 *
 * API: GET /invoices/session/{tableSessionId} hoặc GET /table-sessions/{id}/bill-preview
 * Hiển thị hóa đơn đã được tạo bởi thu ngân hoặc tạm tính từ BE.
 */
export default function InvoicePage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  // Fallback cho nút "Quay lại": mở thẳng màn này (link/bookmark/F5) thì về Thực đơn của
  // đúng bàn, chứ không rơi ra ngoài ứng dụng.
  const goBack = useGoBack(generatePath(CUSTOMER_PATHS.MENU, { qrCode: qrCode ?? "" }))
  const { toast } = useToast()

  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const tableName = tableSession?.tableName || "Bàn"
  const tableSessionId = tableSession?.id

  // Lấy bill từ BE (invoice nếu có, preview nếu chưa có), polling mỗi 3 giây để đồng bộ tự động với thu ngân
  const {
    data: bill,
    isLoading: billLoading,
    hasInvoice,
  } = useBill(tableSessionId, {
    refetchInterval: 3000,
  })

  const { data: orderDetails = [], isLoading: orderDetailsLoading } = useOrderDetailsBySession(
    tableSessionId,
    undefined,
    { refetchInterval: 3000 },
  )

  // Invoice (BE) không expose danh sách dòng món riêng — luôn gộp từ order details.
  // Món đã huỷ được gộp riêng theo lý do huỷ (không gộp chung với món còn tính tiền
  // của cùng 1 món ăn), để khách vẫn thấy rõ món nào bị huỷ / có tính tiền hay không.
  const lineItems = React.useMemo(() => {
    const grouped = new Map<string, InvoiceLineItem>()
    orderDetails.forEach((detail) => {
      const cancelInfo = getCancelInfo(detail)
      // Thêm options + promotionId vào key để phân biệt món cùng món nhưng khác KM
      const optionsKey =
        detail.options
          ?.map((opt) => opt.optionItemId)
          .sort()
          .join("-") || "no-options"
      const promoKey = detail.promotionId ?? "no-promo"
      const key = `${detail.dishId}-${detail.priceAtOrderTime || 0}-${cancelInfo ? cancelInfo.label + cancelInfo.billable : "active"}-${optionsKey}-${promoKey}`
      const existing = grouped.get(key)
      // Tổng giá options của 1 suất (priceSnapshot của từng option)
      const optionsTotalPrice =
        detail.options?.reduce((s, opt) => s + (opt.priceSnapshot ?? 0), 0) ?? 0
      const discountPerDetail = detail.promotionDiscountAmount ?? 0
      if (existing) {
        existing.quantity += detail.quantity
        existing.totalDiscountAmount += discountPerDetail
      } else {
        grouped.set(key, {
          key,
          dishId: String(detail.dishId),
          dishName: detail.dishName,
          quantity: detail.quantity,
          unitPrice: detail.priceAtOrderTime || 0,
          optionsTotalPrice,
          totalDiscountAmount: discountPerDetail,
          promotionName: detail.promotionName,
          note: detail.note,
          options: detail.options,
          cancelInfo,
          billable: isBillableDetail(detail),
        })
      }
    })
    return Array.from(grouped.values())
  }, [orderDetails])

  const sessionDateLabel = React.useMemo(() => {
    const raw = tableSession?.openedAt
    const date = raw ? new Date(raw) : new Date()
    return date.toLocaleDateString("vi-VN")
  }, [tableSession?.openedAt])

  function handleCallStaffForCash() {
    // TODO(api): POST /api/table-sessions/:id/call-staff { reason: "CASH_PAYMENT" } khi có backend
    toast({
      title: "Đã gọi nhân viên",
      description: `${tableName} · Nhân viên sẽ đến thu tiền mặt trong giây lát.`,
      variant: "info",
    })
  }

  // Chỉ xoay khi chưa có GÌ để hiện. Có món rồi thì hiện tạm tính ngay, dù hoá đơn chưa về.
  if (billLoading && orderDetailsLoading) {
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
            onClick={goBack}
            aria-label="Quay lại"
            className="flex size-9 shrink-0 items-center justify-center rounded-full text-text-secondary transition-colors hover:bg-surface-muted hover:text-text-primary"
          >
            <ChevronLeft className="size-5" />
          </button>
          <h1 className="min-w-0 truncate text-lg font-bold text-text-primary">
            {hasInvoice ? "Hóa đơn" : "Hóa đơn tạm tính"}
          </h1>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-4">
        <div className="mx-auto w-full max-w-2xl space-y-3">
          {/* ---- Thẻ thông tin phiên ---- */}
          <div className="rounded-card border border-border-default bg-surface-card px-5 py-4 text-center shadow-xs">
            <p className="text-base font-bold text-text-primary">Nhà hàng Phở Việt</p>
            <p className="mt-0.5 text-xs text-text-tertiary">
              {tableName} · Phiên #{tableSession?.id ?? "—"} · {sessionDateLabel}
            </p>
          </div>

          {/* ---- Chưa có hoá đơn: nói rõ đây mới là tạm tính, thu ngân chưa lập hoá đơn ---- */}
          {!hasInvoice ? (
            <div className="flex items-start gap-2.5 rounded-card border border-border-default bg-surface-card px-4 py-3">
              <ReceiptText className="mt-0.5 size-4 shrink-0 text-text-tertiary" />
              <p className="text-sm text-text-secondary">
                <strong className="text-text-primary">Chưa có hoá đơn</strong> — đang chờ thu ngân
                lập hoá đơn.
              </p>
            </div>
          ) : null}

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
                        <div className="mt-0.5 space-y-0.5">
                          {line.options.map((opt) => (
                            <p key={opt.id} className="text-xs text-text-tertiary">
                              + {opt.optionItemName}
                              {opt.priceSnapshot > 0
                                ? ` +${opt.priceSnapshot.toLocaleString("vi-VN")}đ`
                                : " (Miễn phí)"}
                            </p>
                          ))}
                        </div>
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
                    {/* Giá: nếu có KM món thì hiện gạch ngang + giá thực + số tiền giảm */}
                    {line.billable && line.totalDiscountAmount > 0 ? (
                      <div className="flex flex-col items-end shrink-0">
                        <span className="text-xs text-text-tertiary line-through">
                          {formatVnd((line.unitPrice + line.optionsTotalPrice) * line.quantity)}
                        </span>
                        <span className="shrink-0 font-medium text-brand-primary">
                          {formatVnd(
                            (line.unitPrice + line.optionsTotalPrice) * line.quantity -
                              line.totalDiscountAmount,
                          )}
                        </span>
                        <span className="text-[11px] font-semibold text-status-success">
                          -{formatVnd(line.totalDiscountAmount)}
                          {line.promotionName ? ` (${line.promotionName})` : ""}
                        </span>
                      </div>
                    ) : (
                      <span
                        className={
                          line.billable
                            ? "shrink-0 font-medium text-text-primary"
                            : "shrink-0 font-medium text-text-tertiary line-through"
                        }
                      >
                        {formatVnd((line.unitPrice + line.optionsTotalPrice) * line.quantity)}
                      </span>
                    )}
                  </div>
                </React.Fragment>
              ))
            )}
          </div>

          {/* ---- Tóm tắt tiền từ BE ---- */}
          {bill && (
            <div className="rounded-card border border-border-default bg-surface-card px-5 py-3 shadow-xs">
              <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="text-text-tertiary">Tiền hàng</span>
                <span className="font-medium text-text-primary">
                  {formatVnd(bill.grossSubTotal - bill.itemPromotionDiscount)}
                </span>
              </div>
              {bill.orderPromotionDiscount > 0 ? (
                <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="truncate text-status-success">
                    Khuyến mãi đơn{bill.orderPromotionName ? ` (${bill.orderPromotionName})` : ""}
                  </span>
                  <span className="shrink-0 font-medium text-status-success">
                    -{formatVnd(bill.orderPromotionDiscount)}
                  </span>
                </div>
              ) : null}
              {bill.manualDiscount > 0 ? (
                <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
                  <span className="truncate text-status-success">Chiết khấu</span>
                  <span className="shrink-0 font-medium text-status-success">
                    -{formatVnd(bill.manualDiscount)}
                  </span>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="text-text-tertiary">
                  Phí dịch vụ ({bill.serviceFeeRate.toFixed(0)}%)
                </span>
                <span className="font-medium text-text-primary">{formatVnd(bill.serviceFee)}</span>
              </div>
              <div className="flex items-center justify-between gap-3 py-1.5 text-sm">
                <span className="text-text-tertiary">VAT ({bill.vatRate.toFixed(0)}%)</span>
                <span className="font-medium text-text-primary">{formatVnd(bill.vatAmount)}</span>
              </div>
              <Divider className="my-1" />
              <div className="flex items-center justify-between gap-3 py-1.5 text-base">
                <span className="font-bold text-text-primary">Tổng cộng</span>
                <span className="font-bold text-brand-primary">{formatVnd(bill.grandTotal)}</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ---- Vùng cố định dưới cùng: 2 cách thanh toán ---- */}
      <div className="border-t border-border-default bg-surface-page px-4 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))]">
        <div className="mx-auto w-full max-w-2xl space-y-2">
          <Button
            size="lg"
            className="w-full"
            onClick={() =>
              navigate(generatePath(CUSTOMER_PATHS.PAYMENT_QR, { qrCode: qrCode ?? "" }))
            }
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
