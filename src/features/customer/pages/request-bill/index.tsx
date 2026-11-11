import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { Check, Info, FileText, AlertTriangle } from "lucide-react"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { useRequestPayment } from "@/features/customer/api"
import { useTableSession } from "@/api/table-sessions.api"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { formatVnd } from "@/features/customer/lib/pricing"
import { useBill } from "@/hooks/useBill"

/**
 * Yêu cầu tính tiền — Gọi API request payment
 * Nguồn: Mobile / Yêu cầu tính tiền
 *
 * API: POST /table-sessions/{id}/request-payment
 * Khoá phiên ngay khi vào trang (session chuyển sang WAITING_FOR_PAY) và hiển thị
 * tạm tính CẢ PHIÊN dựa trên bill preview từ BE.
 */
export default function RequestBillPage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()

  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const tableName = tableSession?.tableName || "Bàn"
  const tableSessionId = tableSession?.id

  const markBillRequested = useCustomerSessionStore((s) => s.markBillRequested)

  const requestPaymentMutation = useRequestPayment()

  // Trạng thái THẬT của phiên, hỏi lại theo nhịp — quyết định có gọi API hay chỉ hiển thị.
  const { data: liveSession } = useTableSession(tableSessionId, { refetchInterval: 3000 })
  const liveStatus = liveSession?.status
  
  // Lấy bill từ BE (invoice nếu có, preview nếu chưa có), polling mỗi 3 giây
  const { data: bill, isLoading: billLoading } = useBill(tableSessionId, { refetchInterval: 3000 })

  const [errorMessage, setErrorMessage] = React.useState<string | null>(null)

  /**
   * Gọi `request-payment` ĐÚNG MỘT LẦN cho mỗi phiên, và CHỈ khi phiên còn ĐANG PHỤC VỤ.
   */
  const requestedForSession = React.useRef<number | null>(null)

  React.useEffect(() => {
    if (!tableSessionId) return
    // Chưa biết trạng thái THẬT thì chưa gọi gì cả.
    if (!liveStatus) return
    // Đã khoá rồi (do chính mình hoặc do người khác bấm) thì chỉ hiển thị, không gọi lại.
    if (liveStatus !== "SERVING") return
    if (requestedForSession.current === tableSessionId) return

    requestedForSession.current = tableSessionId
    setErrorMessage(null)
    requestPaymentMutation.mutate(tableSessionId, {
      onSuccess: () => {
        markBillRequested(tableSessionId)
      },
      onError: (error) => {
        // Cho phép thử lại ở lần vào sau; KHÔNG khoá phiên khi API lỗi.
        requestedForSession.current = null
        setErrorMessage(
          error instanceof Error ? error.message : "Không gửi được yêu cầu tính tiền"
        )
      },
    })
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tableSessionId, liveStatus, markBillRequested])

  const isFailed = errorMessage != null
  const isSending = requestPaymentMutation.isPending && !isFailed

  if (billLoading) {
    return (
      <div className="flex min-h-dvh w-full flex-1 flex-col items-center justify-center bg-white">
        <div className="size-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
        <p className="mt-3 text-sm text-text-secondary">Đang tải thông tin...</p>
      </div>
    )
  }

  return (
    <div className="flex min-h-dvh w-full flex-1 flex-col bg-white">
      <div className="mx-auto flex w-full max-w-lg md:max-w-xl flex-1 flex-col justify-between px-5 pt-[max(1.5rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* ---- Nhóm nội dung chính giữa (Căn giữa hoàn toàn giữa màn hình) ---- */}
        <div className="my-auto flex w-full flex-col items-center py-4 text-center">
          {/* ---- Vòng tròn trạng thái: thành công / đang gửi / lỗi ---- */}
          <div
            className={`flex size-[104px] items-center justify-center rounded-full ${
              isFailed ? "bg-status-danger-subtle" : "bg-[#E6F7EF]"
            }`}
          >
            <div
              className={`flex size-[64px] items-center justify-center rounded-full ${
                isFailed ? "bg-status-danger" : "bg-[#12B76A]"
              }`}
            >
              {isFailed ? (
                <AlertTriangle className="size-8 text-white" strokeWidth={2.5} />
              ) : (
                <Check className="size-8 text-white" strokeWidth={3} />
              )}
            </div>
          </div>

          <h1 className="mt-6 text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            {isFailed
              ? "Chưa gửi được yêu cầu"
              : isSending
                ? "Đang gửi yêu cầu..."
                : "Đã gửi yêu cầu tính tiền"}
          </h1>
          <p className="mt-2 max-w-[280px] text-sm leading-relaxed text-text-secondary">
            {isFailed
              ? errorMessage
              : `Thu ngân sẽ đến ${tableName} để thanh toán. Vui lòng chờ trong giây lát.`}
          </p>

          {/* ---- Banner: phiên đã khoá (chỉ khi thực sự đã khoá) ---- */}
          {!isFailed ? (
            <div className="mt-6 flex w-full items-start gap-2.5 rounded-[16px] bg-[#FEF6EE] px-4 py-3.5 text-left">
              <Info className="mt-0.5 size-4.5 shrink-0 text-[#B54708]" />
              <p className="text-xs sm:text-[13px] font-semibold text-[#B54708] leading-snug">
                Phiên đã khóa — không thể gọi thêm món.
              </p>
            </div>
          ) : null}

          {/* ---- Tóm tắt tiền từ BE ---- */}
          {bill && (
            <div className="mt-4 w-full rounded-[20px] bg-[#F8F9FA] p-4 sm:p-5">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium text-text-tertiary">Tiền hàng</span>
                  <span className="font-bold text-text-primary">
                    {formatVnd(bill.grossSubTotal - bill.itemPromotionDiscount)}
                  </span>
                </div>

                {bill.orderPromotionDiscount > 0 && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-text-tertiary">
                      Khuyến mãi{bill.orderPromotionName ? ` (${bill.orderPromotionName})` : ""}
                    </span>
                    <span className="font-bold text-status-success">
                      -{formatVnd(bill.orderPromotionDiscount)}
                    </span>
                  </div>
                )}

                {bill.manualDiscount > 0 && (
                  <div className="flex items-center justify-between text-xs sm:text-sm">
                    <span className="font-medium text-text-tertiary">Chiết khấu</span>
                    <span className="font-bold text-status-success">
                      -{formatVnd(bill.manualDiscount)}
                    </span>
                  </div>
                )}

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium text-text-tertiary">
                    Phí dịch vụ ({bill.serviceFeeRate.toFixed(0)}%)
                  </span>
                  <span className="font-bold text-text-primary">+{formatVnd(bill.serviceFee)}</span>
                </div>

                <div className="flex items-center justify-between text-xs sm:text-sm">
                  <span className="font-medium text-text-tertiary">
                    VAT ({bill.vatRate.toFixed(0)}%)
                  </span>
                  <span className="font-bold text-text-primary">+{formatVnd(bill.vatAmount)}</span>
                </div>
              </div>

              <div className="my-3 border-t border-border-default/60" />

              <div className="flex items-center justify-between">
                <span className="text-sm sm:text-base font-bold text-text-primary">Tổng cộng</span>
                <span className="text-base sm:text-lg font-bold text-brand-primary">
                  {formatVnd(bill.grandTotal)}
                </span>
              </div>
            </div>
          )}
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
