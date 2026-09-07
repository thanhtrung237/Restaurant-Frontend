import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { PromotionHeader } from "./components/PromotionHeader"
import { PromotionTable } from "./components/PromotionTable"
import { MOCK_PROMOTIONS } from "./mock-data"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import type { PromotionItem } from "./types"

/**
 * Quản lý khuyến mãi — Phân hệ Quản trị nhà hàng (restaurant-admin)
 * Nguồn: QuanLy/Khuyến mãi.png
 *
 * Nghiệp vụ BR-23:
 * - Ưu tiên áp dụng theo thứ tự (Priority)
 * - Snapshot dữ liệu khuyến mãi tại thời điểm tính tiền
 */
interface PromotionsPageProps {
  /** Base URI cho trang "Tạo khuyến mãi" — mặc định là của Quản trị NH. QL chi nhánh truyền BRANCH_MANAGER_PATHS. */
  createPath?: string
}

export default function PromotionsPage({ createPath = RESTAURANT_ADMIN_PATHS.PROMOTION_CREATE }: PromotionsPageProps = {}) {
  const navigate = useNavigate()
  const [promotions, setPromotions] = useState<PromotionItem[]>(MOCK_PROMOTIONS)

  // Bật / tắt trạng thái hoạt động của chương trình khuyến mãi
  const handleToggleStatus = (id: number, newStatus: boolean) => {
    setPromotions((prev) =>
      prev.map((promo) =>
        promo.id === id ? { ...promo, isActive: newStatus } : promo
      )
    )
  }

  // Điều hướng sang trang tạo khuyến mãi mới
  const handleCreatePromotion = () => {
    navigate(createPath)
  }

  // Chỉnh sửa khuyến mãi
  const handleEditPromotion = (promotion: PromotionItem) => {
    console.log("Chỉnh sửa chương trình khuyến mãi:", promotion.name)
    navigate(createPath)
  }

  // Xoá khuyến mãi
  const handleDeletePromotion = (promotion: PromotionItem) => {
    setPromotions((prev) => prev.filter((promo) => promo.id !== promotion.id))
  }

  return (
    <div className="flex flex-col min-h-full bg-surface-page p-6 lg:p-8 space-y-6">
      {/* 1. Header trang */}
      <PromotionHeader onCreatePromotion={handleCreatePromotion} />

      {/* 2. Bảng danh sách chương trình khuyến mãi */}
      <PromotionTable
        promotions={promotions}
        onToggleStatus={handleToggleStatus}
        onEditPromotion={handleEditPromotion}
        onDeletePromotion={handleDeletePromotion}
      />
    </div>
  )
}
