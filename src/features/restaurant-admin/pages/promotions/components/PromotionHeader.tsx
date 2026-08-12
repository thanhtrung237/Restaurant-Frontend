import React from "react"
import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"
import { Button } from "@/components/ui/button"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"

interface PromotionHeaderProps {
  onCreatePromotion?: () => void
}

/**
 * Header phân hệ Khuyến mãi
 * Nguồn: QuanLy/Khuyến mãi.png
 */
export const PromotionHeader: React.FC<PromotionHeaderProps> = ({
  onCreatePromotion,
}) => {
  const navigate = useNavigate()

  const handleCreateClick = () => {
    if (onCreatePromotion) {
      onCreatePromotion()
    } else {
      navigate(RESTAURANT_ADMIN_PATHS.PROMOTION_CREATE)
    }
  }

  return (
    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2">
      {/* Cột trái: Tiêu đề và mô tả */}
      <div>
        <h1 className="text-2xl font-bold text-text-primary tracking-tight">
          Khuyến mãi
        </h1>
        <p className="text-sm text-text-tertiary mt-0.5">
          Ưu tiên áp dụng theo thứ tự (BR-23) · snapshot khi tính tiền
        </p>
      </div>

      {/* Cột phải: Nút tạo khuyến mãi */}
      <div>
        <Button
          type="button"
          onClick={handleCreateClick}
          className="cursor-pointer gap-1.5 h-10 px-4 rounded-xl text-sm font-semibold bg-brand-primary text-text-on-brand hover:bg-brand-primary-hover shadow-2xs"
        >
          <Plus className="size-4 stroke-[2.5]" />
          <span>Tạo khuyến mãi</span>
        </Button>
      </div>
    </div>
  )
}
