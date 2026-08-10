import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { Check, Info, FileText } from "lucide-react"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { useRequestPayment, useOrderDetailsBySession } from "@/features/customer/api"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { computePricing, formatVnd } from "@/features/customer/lib/pricing"
import { useToast } from "@/hooks/use-toast"
import { sumBillableAmount } from "@/lib/order-detail-billing"

/**
 * Yêu cầu tính tiền — Gọi API request payment
 * Nguồn: Mobile / Yêu cầu tính tiền
 *
 * API: POST /table-sessions/{id}/request-payment
 * Khoá phiên ngay khi vào trang (session chuyển sang WAITING_FOR_PAY) và hiển thị
 * tạm tính CẢ PHIÊN dựa trên order details đã gửi.
 */
export default function RequestBillPage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  const { toast } = useToast()

  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const tableName = tableSession?.tableName || "Bàn"
  const tableSessionId = tableSession?.id

  const appliedPromo = useCustomerSessionStore((s) => s.appliedPromo)
  const requestBill = useCustomerSessionStore((s) => s.requestBill)

  const requestPaymentMutation = useRequestPayment()
  
  // Fetch order details để tính tổng tiền
  const { data: orderDetails = [] } = useOrderDetailsBySession(tableSessionId)

  // Tính subtotal từ order details — chỉ cộng dòng món tính tiền (bỏ qua món
  // đã huỷ không tính tiền: huỷ trước bếp, hoặc huỷ sau bếp do lỗi nhà hàng),
  // khớp với cách BE tính (InvoiceServiceImpl.shouldChargeDetail).
  const subtotal = sumBillableAmount(orderDetails)
  const effectiveDiscount = appliedPromo?.discountAmount ?? 0
  const pricing = computePricing(subtotal, effectiveDiscount)

  const [requested, setRequested] = React.useState(false)

  // Gọi API request payment khi vào trang
  React.useEffect(() => {
    if (tableSessionId && !requested && !requestPaymentMutation.isPending) {
      requestPaymentMutation.mutate(tableSessionId, {
        onSuccess: () => {
          setRequested(true)
          requestBill() // Update local store state
        },
        onError: (error) => {
          console.error("Error requesting payment:", error)
          toast({
            title: "Lỗi yêu cầu thanh toán",
            description: error instanceof Error ? error.message : "Vui lòng thử lại",
            variant: "danger",
          })
        },
      })
    }
  }, [tableSessionId, requested, requestPaymentMutation, requestBill, toast])

  return (
    <div className="flex min-h-dvh w-full flex-1 flex-col bg-white">
      <div className="mx-auto flex w-full max-w-lg md:max-w-xl flex-1 flex-col justify-between px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* ---- Nhóm nội dung chính giữa (Căn giữa hoàn toàn giữa màn hình) ---- */}
        <div className="my-auto flex w-full flex-col items-center py-4 text-center">
          {/* ---- Vòng tròn đồng tâm thành công ---- */}
          <div className="flex size-[104px] items-center justify-center rounded-full bg-[#E6F7EF]">
            <div className="flex size-[64px] items-center justify-center rounded-full bg-[#12B76A]">
              <Check className="size-8 text-white" strokeWidth={3} />
            </div>
          </div>

          <h1 className="mt-6 text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Đã gửi yêu cầu tính tiền
          </h1>
          <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-text-secondary">
            Thu ngân sẽ đến {tableName} để thanh toán. Vui lòng chờ trong giây lát.
          </p>

          {/* ---- Banner: phiên đã khoá ---- */}
          <div className="mt-6 flex w-full items-start gap-2.5 rounded-[16px] bg-[#FEF6EE] px-4 py-3.5 text-left">
            <Info className="mt-0.5 size-4.5 shrink-0 text-[#B54708]" />
            <p className="text-xs sm:text-[13px] font-semibold text-[#B54708] leading-snug">
              Phiên đã khóa — không thể gọi thêm món.
            </p>
          </div>

          {/* ---- Tóm tắt tiền ---- */}
          <div className="mt-4 w-full rounded-[20px] bg-[#F8F9FA] p-4 sm:p-5">
            <div className="space-y-2.5">
              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-medium text-text-tertiary">Tiền hàng</span>
                <span className="font-bold text-text-primary">{formatVnd(pricing.subtotal)}</span>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-medium text-text-tertiary">Khuyến mãi tự động</span>
                <span className="font-bold text-text-primary">-{formatVnd(pricing.discountAmount)}</span>
              </div>

              <div className="flex items-center justify-between text-xs sm:text-sm">
                <span className="font-medium text-text-tertiary">Phí dịch vụ + VAT</span>
                <span className="font-bold text-text-primary">+{formatVnd(pricing.feePlusVat)}</span>
              </div>
            </div>

            <div className="my-3 border-t border-border-default/60" />

            <div className="flex items-center justify-between">
              <span className="text-sm sm:text-base font-bold text-text-primary">Tổng cộng</span>
              <span className="text-base sm:text-lg font-bold text-brand-primary">
                {formatVnd(pricing.grandTotal)}
              </span>
            </div>
          </div>
        </div>

        {/* ---- Nút Xem lại hoá đơn dưới cùng ---- */}
        <div className="w-full pt-4">
          <button
            type="button"
            onClick={() => navigate(generatePath(CUSTOMER_PATHS.INVOICE, { qrCode: qrCode ?? "" }))}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] border border-brand-primary bg-white text-sm sm:text-base font-bold text-brand-primary transition-colors hover:bg-brand-primary-subtle/30 active:scale-[0.99]"
          >
            <FileText className="size-4.5 text-brand-primary" strokeWidth={2} />
            <span>Xem lại hóa đơn</span>
          </button>
        </div>
      </div>
    </div>
  )
}