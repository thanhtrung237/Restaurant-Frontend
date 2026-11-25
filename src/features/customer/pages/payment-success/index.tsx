import * as React from "react"
import { useNavigate } from "react-router-dom"
import { Check, Home } from "lucide-react"
import { Button } from "@/components/ui/button"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { useCustomerPaymentStore } from "@/features/customer/store/payment.store"
import { formatVnd } from "@/features/customer/lib/pricing"

/**
 * Thanh toán thành công
 * Nguồn: Mobile / Thanh toán thành công
 *
 * Màn hình kết thúc luồng thanh toán thành công.
 * Hiển thị sau khi:
 * - Thanh toán QR được xác nhận (invoice.status = PAID)
 * - Thu ngân xác nhận thanh toán tiền mặt
 */
export default function PaymentSuccessPage() {
  const navigate = useNavigate()

  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const tableName = tableSession?.tableName || "Bàn"

  const paymentAmount = useCustomerPaymentStore((s) => s.amount)
  const paymentMethod = useCustomerPaymentStore((s) => s.method)
  const clearSession = useCustomerSessionStore((s) => s.clearSession)
  const resetPayment = useCustomerPaymentStore((s) => s.reset)

  const paymentMethodLabel = React.useMemo(() => {
    switch (paymentMethod) {
      case "BANK_TRANSFER":
        return "chuyển khoản"
      case "CASH":
        return "tiền mặt"
      case "CARD":
        return "thẻ"
      case "E_WALLET":
        return "ví điện tử"
      default:
        return "thanh toán"
    }
  }, [paymentMethod])

  function handleFinish() {
    // Clear toàn bộ session và payment state
    clearSession()
    resetPayment()

    // Navigate về trang chủ hoặc close tab
    // Trong context mobile web, có thể hiển thị hướng dẫn đóng tab
    navigate("/", { replace: true })
  }

  // function handleReview() {
  //   // TODO: Navigate to review page khi backend có API
  //   navigate(generatePath(CUSTOMER_PATHS.REVIEW, { qrCode: qrCode ?? "" }))
  // }

  return (
    <div className="flex min-h-dvh w-full flex-1 flex-col bg-white">
      <div className="mx-auto flex w-full max-w-lg md:max-w-xl flex-1 flex-col justify-between px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* ---- Nội dung chính giữa ---- */}
        <div className="my-auto flex w-full flex-col items-center py-4 text-center">
          {/* ---- Vòng tròn thành công với animation ---- */}
          <div className="mb-6 flex size-[120px] items-center justify-center rounded-full bg-[#E6F7EF] animate-in zoom-in-50 duration-500">
            <div className="flex size-[88px] items-center justify-center rounded-full bg-[#12B76A]">
              <Check
                className="size-12 text-white animate-in zoom-in duration-300 delay-150"
                strokeWidth={3}
              />
            </div>
          </div>

          {/* ---- Tiêu đề ---- */}
          <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-text-primary animate-in fade-in duration-500 delay-200">
            Thanh toán thành công!
          </h1>

          {/* ---- Thông tin thanh toán ---- */}
          <div className="mt-4 animate-in fade-in duration-500 delay-300">
            <p className="text-sm text-text-secondary">Đã thanh toán {paymentMethodLabel}</p>
            {paymentAmount ? (
              <p className="mt-1.5 text-3xl sm:text-4xl font-bold text-brand-primary">
                {formatVnd(paymentAmount)}
              </p>
            ) : null}
          </div>

          {/* ---- Thông điệp cảm ơn ---- */}
          <div className="mt-6 animate-in fade-in duration-500 delay-400">
            <p className="text-base font-semibold text-text-primary">Cảm ơn quý khách!</p>
            <p className="mt-1.5 max-w-[320px] text-sm leading-relaxed text-text-secondary">
              Hóa đơn điện tử đã được gửi đến số điện thoại của quý khách. Hẹn gặp lại quý khách lần
              sau!
            </p>
          </div>

          {/* ---- Thông tin phiên ---- */}
          <div className="mt-8 flex w-full max-w-sm items-center gap-3 rounded-[20px] bg-[#F8F9FA] p-4 text-left animate-in fade-in duration-500 delay-500">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-xl bg-white">
              <Check aria-hidden="true" className="size-5 text-brand-primary" />
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-bold text-text-primary">
                {tableName} · Phiên #{tableSession?.id ?? "—"}
              </p>
              <p className="mt-0.5 text-xs text-text-tertiary">
                Đã hoàn tất ·{" "}
                {new Date().toLocaleString("vi-VN", {
                  hour: "2-digit",
                  minute: "2-digit",
                  day: "2-digit",
                  month: "2-digit",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>
        </div>

        {/* ---- Nút hành động dưới cùng ---- */}
        <div className="w-full space-y-3 animate-in fade-in slide-in-from-bottom-4 duration-500 delay-600">
          {/* TODO: Uncomment khi có API review */}
          {/* <Button
            type="button"
            variant="outline"
            size="lg"
            onClick={handleReview}
            className="w-full"
          >
            Đánh giá trải nghiệm
          </Button> */}

          <Button
            type="button"
            size="lg"
            onClick={handleFinish}
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] bg-brand-primary text-base font-bold text-white shadow-none transition-transform hover:bg-brand-primary-hover active:scale-[0.99]"
          >
            <Home className="size-5" />
            <span>Hoàn tất</span>
          </Button>

          <p className="text-center text-xs text-text-tertiary">Bạn có thể đóng tab này an toàn</p>
        </div>
      </div>
    </div>
  )
}
