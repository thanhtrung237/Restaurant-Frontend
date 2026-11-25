import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { Star } from "lucide-react"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { useCustomerOrdersStore } from "@/features/customer/store/orders.store"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"

/**
 * Đánh giá dịch vụ
 * Nguồn: Mobile / Đánh giá
 *
 * Cho phép khách chấm điểm sao (1 - 5 sao) và để lại nhận xét sau khi dùng bữa.
 */
export default function ReviewPage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  const { toast } = useToast()

  const clearSession = useCustomerSessionStore((s) => s.clearSession)
  const clearOrders = useCustomerOrdersStore((s) => s.clearAll)

  // Mặc định 4 sao khớp với hình ảnh mockup mẫu
  const [rating, setRating] = React.useState(4)
  const [feedback, setFeedback] = React.useState("")

  function handleSubmitReview() {
    toast({
      title: "Cảm ơn bạn đã đánh giá!",
      description: "Ý kiến của bạn giúp chúng tôi không ngừng hoàn thiện dịch vụ.",
      variant: "success",
    })
    clearSession()
    clearOrders()
    navigate(generatePath(CUSTOMER_PATHS.TABLE_OPEN_QR, { qrCode: qrCode ?? "" }))
  }

  function handleSkip() {
    clearSession()
    clearOrders()
    navigate(generatePath(CUSTOMER_PATHS.TABLE_OPEN_QR, { qrCode: qrCode ?? "" }))
  }

  return (
    <div className="flex min-h-dvh w-full flex-1 flex-col bg-white">
      <div className="mx-auto flex w-full max-w-lg md:max-w-xl flex-1 flex-col justify-between px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {/* Biểu tượng ngôi sao cam trên nền đào mềm */}
          <div className="flex size-20 items-center justify-center rounded-full bg-[#FEEBE4]">
            <Star className="size-8 fill-brand-primary text-brand-primary" />
          </div>

          <h1 className="mt-6 text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Bạn thấy bữa ăn thế nào?
          </h1>
          <p className="mt-2 text-xs sm:text-sm text-text-secondary">
            Đánh giá giúp nhà hàng phục vụ tốt hơn
          </p>

          {/* Đánh giá sao tương tác */}
          <div className="mt-6 flex items-center justify-center gap-3">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                type="button"
                onClick={() => setRating(star)}
                className="transition-transform active:scale-125 focus:outline-none"
                aria-label={`${star} sao`}
              >
                <Star
                  className={cn(
                    "size-9 transition-colors",
                    star <= rating ? "fill-[#F79009] text-[#F79009]" : "fill-none text-[#D0D5DD]",
                  )}
                  strokeWidth={1.5}
                />
              </button>
            ))}
          </div>

          {/* Ô nhập cảm nhận */}
          <div className="mt-6 w-full">
            <textarea
              value={feedback}
              onChange={(e) => setFeedback(e.target.value)}
              placeholder="Chia sẻ cảm nhận của bạn (tùy chọn)..."
              rows={3}
              className="min-h-[96px] w-full rounded-[18px] border border-border-default bg-white p-4 text-sm text-text-primary placeholder:text-text-tertiary focus:border-brand-primary focus:outline-none resize-none transition-colors"
            />
          </div>
        </div>

        {/* Nhóm nút dưới cùng */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={handleSubmitReview}
            className="flex h-12 w-full items-center justify-center rounded-[16px] bg-brand-primary text-sm sm:text-base font-bold text-white shadow-none transition-colors hover:bg-brand-primary-hover active:scale-[0.99]"
          >
            Gửi đánh giá
          </button>

          <button
            type="button"
            onClick={handleSkip}
            className="text-sm font-medium text-[#98A2B3] transition-colors hover:text-text-primary active:scale-95"
          >
            Bỏ qua
          </button>
        </div>
      </div>
    </div>
  )
}
