import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { AlertCircle, RefreshCw, Phone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { useCustomerPaymentStore } from "@/features/customer/store/payment.store"
import { formatVnd } from "@/features/customer/lib/pricing"

/**
 * Thanh toán thất bại
 * Nguồn: Mobile / Thanh toán thất bại
 *
 * Màn hình hiển thị khi thanh toán không thành công:
 * - QR code hết hạn
 * - Chuyển khoản sai thông tin
 * - Lỗi kết nối
 * - Khách hủy thanh toán
 */
export default function PaymentFailedPage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  const { toast } = useToast()

  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const tableName = tableSession?.tableName || "Bàn"
  
  const paymentAmount = useCustomerPaymentStore((s) => s.amount)
  const resetPayment = useCustomerPaymentStore((s) => s.reset)

  // Lấy lý do thất bại từ query params hoặc state
  const failureReason = React.useMemo(() => {
    const searchParams = new URLSearchParams(window.location.search)
    const reason = searchParams.get("reason")
    
    switch (reason) {
      case "timeout":
        return {
          title: "Hết thời gian thanh toán",
          description: "Mã QR đã hết hạn. Vui lòng tạo mã thanh toán mới hoặc gọi nhân viên hỗ trợ.",
        }
      case "cancelled":
        return {
          title: "Đã hủy thanh toán",
          description: "Bạn đã hủy giao dịch thanh toán.",
        }
      case "error":
        return {
          title: "Lỗi thanh toán",
          description: "Không thể xử lý thanh toán. Vui lòng thử lại hoặc liên hệ nhân viên.",
        }
      case "invalid":
        return {
          title: "Thông tin thanh toán không hợp lệ",
          description: "Vui lòng kiểm tra lại số tiền và nội dung chuyển khoản.",
        }
      default:
        return {
          title: "Thanh toán không thành công",
          description: "Đã có lỗi xảy ra trong quá trình thanh toán. Vui lòng thử lại.",
        }
    }
  }, [])

  function handleRetry() {
    // Reset payment state và quay lại trang thanh toán QR
    resetPayment()
    navigate(generatePath(CUSTOMER_PATHS.PAYMENT_QR, { qrCode: qrCode ?? "" }))
  }

  function handleBackToInvoice() {
    // Quay lại hóa đơn để chọn phương thức thanh toán khác
    resetPayment()
    navigate(generatePath(CUSTOMER_PATHS.INVOICE, { qrCode: qrCode ?? "" }))
  }

  function handleCallStaff() {
    toast({
      title: "Đã gọi nhân viên",
      description: `${tableName} · Nhân viên sẽ đến hỗ trợ thanh toán ngay.`,
      variant: "info",
    })
  }

  return (
    <div className="flex min-h-dvh w-full flex-1 flex-col bg-white">
      <div className="mx-auto flex w-full max-w-lg md:max-w-xl flex-1 flex-col justify-between px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* ---- Nội dung chính giữa ---- */}
        <div className="my-auto flex w-full flex-col items-center py-4 text-center">
          {/* ---- Vòng tròn lỗi ---- */}
          <div className="mb-6 flex size-[120px] items-center justify-center rounded-full bg-[#FEF3F2] animate-in zoom-in-50 duration-500">
            <div className="flex size-[88px] items-center justify-center rounded-full bg-[#FEE4E2]">
              <div className="flex size-[64px] items-center justify-center rounded-full bg-status-danger">
                <AlertCircle className="size-10 text-white animate-in zoom-in duration-300 delay-150" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* ---- Tiêu đề ---- */}
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-text-primary animate-in fade-in duration-500 delay-200">
            {failureReason.title}
          </h1>

          {/* ---- Mô tả chi tiết ---- */}
          <p className="mt-3 max-w-[320px] text-sm leading-relaxed text-text-secondary animate-in fade-in duration-500 delay-300">
            {failureReason.description}
          </p>

          {/* ---- Số tiền cần thanh toán ---- */}
          {paymentAmount ? (
            <div className="mt-6 animate-in fade-in duration-500 delay-400">
              <p className="text-xs text-text-tertiary">Số tiền cần thanh toán</p>
              <p className="mt-1 text-2xl sm:text-3xl font-bold text-text-primary">
                {formatVnd(paymentAmount)}
              </p>
            </div>
          ) : null}

          {/* ---- Banner hỗ trợ ---- */}
          <div className="mt-8 flex w-full max-w-sm items-start gap-3 rounded-[20px] bg-[#FEF6EE] px-4 py-4 text-left animate-in fade-in duration-500 delay-500">
            <Phone className="mt-0.5 size-5 shrink-0 text-[#B54708]" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-[#B54708] leading-snug">
                Cần hỗ trợ?
              </p>
              <p className="mt-1 text-xs text-[#93370D] leading-relaxed">
                Nhân viên của chúng tôi sẵn sàng hỗ trợ bạn thanh toán bằng tiền mặt hoặc các phương thức khác.
              </p>
            </div>
          </div>
        </div>

        {/* ---- Nút hành động dưới cùng ---- */}
        <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-600">
          <Button
            type="button"
            size="lg"
            onClick={handleRetry}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-brand-primary text-base font-bold text-white shadow-none transition-transform hover:bg-brand-primary-hover active:scale-[0.99]"
          >
            <RefreshCw className="size-4.5" />
            <span>Thử lại</span>
          </Button>

          <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleCallStaff}
            className="flex h-[52px] w-full items-center justify-center gap-2"
          >
            <Phone className="size-4.5" />
            <span>Gọi nhân viên hỗ trợ</span>
          </Button>

          <button
            type="button"
            onClick={handleBackToInvoice}
            className="w-full text-center text-sm font-medium text-text-tertiary underline-offset-2 hover:text-text-secondary hover:underline py-2"
          >
            Quay lại hóa đơn
          </button>
        </div>
      </div>
    </div>
  )
}
