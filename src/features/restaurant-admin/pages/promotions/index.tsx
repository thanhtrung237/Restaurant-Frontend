import { useNavigate } from "react-router-dom"
import { Plus } from "lucide-react"
import { FAB } from "@/components/common/FAB"
import { FAB_POSITION_CLASS } from "@/components/layout/StickyActionBar"
import { PageHeader } from "@/components/layout/PageHeader"
import { Button } from "@/components/ui/button"
import { PromotionTable } from "./components/PromotionTable"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import { useAuthStore } from "@/stores/auth.store"
import { 
  usePromotionsByRestaurant, 
  useChangePromotionStatus,
  useDeletePromotion 
} from "@/api/promotions.api"
import { useToast } from "@/hooks/use-toast"
import type { Promotion } from "@/types/models"
import type { PromotionStatus } from "@/types/enums"

/**
 * Quản lý khuyến mãi — Phân hệ Quản trị nhà hàng (restaurant-admin)
 * Nguồn: QuanLy/Khuyến mãi.png
 *
 * Nghiệp vụ BR-22 (Hệ thống tự áp khi đủ điều kiện), BR-23 (Ưu tiên áp dụng)
 */
interface PromotionsPageProps {
  /** Base URI cho trang "Tạo khuyến mãi" — mặc định là của Quản trị NH. */
  createPath?: string
}

export default function PromotionsPage({
  createPath = RESTAURANT_ADMIN_PATHS.PROMOTION_CREATE,
}: PromotionsPageProps = {}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const restaurantId = useAuthStore((s) => s.account?.restaurantId)

  // Fetch promotions từ API — Tự động làm mới mỗi 20 giây để cập nhật lượt dùng real-time
  const { data, isLoading } = usePromotionsByRestaurant(
    restaurantId,
    undefined,
    { refetchInterval: 20000 }
  )
  const changeStatusMutation = useChangePromotionStatus()
  const deleteMutation = useDeletePromotion()

  const promotions = data?.content ?? []

  // Bật / tắt trạng thái hoạt động của chương trình khuyến mãi
  const handleToggleStatus = async (id: number, newStatus: boolean) => {
    const status: PromotionStatus = newStatus ? "ACTIVE" : "INACTIVE"
    
    try {
      await changeStatusMutation.mutateAsync({ id, status })
      toast({
        title: "Thành công",
        description: `Đã ${newStatus ? "kích hoạt" : "tạm dừng"} khuyến mãi`,
        variant: "success",
      })
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || "Có lỗi xảy ra"
      toast({
        title: "Lỗi",
        description: errorMsg,
        variant: "danger",
      })
    }
  }

  // Điều hướng sang trang tạo khuyến mãi mới
  const handleCreatePromotion = () => {
    navigate(createPath)
  }

  // Chỉnh sửa khuyến mãi
  const handleEditPromotion = (promotion: Promotion) => {
    navigate(`${RESTAURANT_ADMIN_PATHS.PROMOTIONS}/${promotion.id}/chinh-sua`)
  }

  // Xoá khuyến mãi (Đã có AlertDialog xác nhận trong PromotionTable)
  const handleDeletePromotion = async (promotion: Promotion) => {
    try {
      await deleteMutation.mutateAsync(promotion.id)
      toast({
        title: "Thành công",
        description: `Đã xóa khuyến mãi "${promotion.name}"`,
        variant: "success",
      })
    } catch (error: any) {
      const errorMsg = error?.response?.data?.message || error?.message || "Có lỗi xảy ra"
      toast({
        title: "Lỗi",
        description: errorMsg,
        variant: "danger",
      })
    }
  }

  return (
    <div className="flex min-h-full flex-col bg-surface-page">
      <PageHeader
        title="Khuyến mãi"
        subtitle="Hệ thống tự động áp dụng khi đủ điều kiện (BR-22) · Ưu tiên theo priority (BR-23)"
        mobileSubtitle="Tự động áp dụng khi đủ điều kiện"
        actions={
          <Button type="button" onClick={handleCreatePromotion} className="h-10 gap-1.5 px-4 cursor-pointer">
            <Plus className="size-4 stroke-[2.5]" />
            <span>Tạo khuyến mãi</span>
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-6 p-6 lg:p-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-16 text-text-tertiary">
            <div className="flex flex-col items-center gap-2">
              <div className="size-8 animate-spin rounded-full border-2 border-border-default border-t-brand-primary" />
              <span className="text-xs">Đang tải danh sách khuyến mãi...</span>
            </div>
          </div>
        ) : (
          <PromotionTable
            promotions={promotions}
            onToggleStatus={handleToggleStatus}
            onEditPromotion={handleEditPromotion}
            onDeletePromotion={handleDeletePromotion}
            onCreatePromotion={handleCreatePromotion}
            isUpdating={changeStatusMutation.isPending || deleteMutation.isPending}
          />
        )}
      </div>

      {/* FAB cho mobile */}
      <FAB
        variant="circle"
        aria-label="Tạo khuyến mãi"
        title="Tạo khuyến mãi"
        icon={<Plus className="size-6 text-white" strokeWidth={2.5} />}
        onClick={handleCreatePromotion}
        className={FAB_POSITION_CLASS}
      />
    </div>
  )
}