import { useNavigate } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { useAuthStore } from "@/stores/auth.store"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import { PromotionForm } from "./components/PromotionForm"
import { useCreatePromotion } from "@/api/promotions.api"
import { formDataToAddRequest } from "./promotion-mapper"
import type { PromotionFormData } from "./types"

interface PromotionCreatePageProps {
  /** Base URI trang danh sách "Khuyến mãi" để quay lại sau khi lưu/huỷ — mặc định của Quản trị NH. */
  listPath?: string
}

export default function PromotionCreatePage({
  listPath = RESTAURANT_ADMIN_PATHS.PROMOTIONS,
}: PromotionCreatePageProps = {}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const user = useAuthStore((s) => s.account)
  const restaurantId = user?.restaurantId

  const createMutation = useCreatePromotion()

  const handleSubmit = async (formData: PromotionFormData) => {
    if (!restaurantId) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy thông tin nhà hàng",
        variant: "danger",
      })
      return
    }

    const request = formDataToAddRequest(formData, restaurantId)

    try {
      await createMutation.mutateAsync(request)
      toast({
        title: "Thành công",
        description: `Đã tạo chương trình khuyến mãi "${formData.name}"!`,
        variant: "success",
      })
      navigate(listPath)
    } catch (error: any) {
      const errorMsg =
        error?.response?.data?.message || error?.message || "Có lỗi xảy ra khi tạo khuyến mãi"
      toast({
        title: "Lỗi",
        description: errorMsg,
        variant: "danger",
      })
    }
  }

  const handleCancel = () => {
    navigate(listPath)
  }

  return (
    <PromotionForm
      title="Tạo khuyến mãi"
      subtitle="Cấu hình điều kiện và hành động theo cấp Món / Hóa đơn · hệ thống tự áp khi thoả (BR-22)"
      submitText="Lưu chương trình"
      isSubmitting={createMutation.isPending}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
    />
  )
}
