import { useMemo } from "react"
import { useNavigate, useParams } from "react-router-dom"
import { useToast } from "@/hooks/use-toast"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"
import { PromotionForm } from "../promotion-create/components/PromotionForm"
import { usePromotion, useUpdatePromotion } from "@/api/promotions.api"
import { apiToFormData, formDataToUpdateRequest } from "../promotion-create/promotion-mapper"
import type { PromotionFormData } from "../promotion-create/types"

interface PromotionEditPageProps {
  listPath?: string
}

export default function PromotionEditPage({
  listPath = RESTAURANT_ADMIN_PATHS.PROMOTIONS,
}: PromotionEditPageProps = {}) {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const { toast } = useToast()

  const promotionId = id ? Number.parseInt(id, 10) : undefined
  const { data: promotion, isLoading, error } = usePromotion(promotionId)
  const updateMutation = useUpdatePromotion()

  const initialFormData = useMemo(() => {
    if (!promotion) return undefined
    return apiToFormData(promotion)
  }, [promotion])

  const handleSubmit = async (formData: PromotionFormData) => {
    if (!promotionId) {
      toast({
        title: "Lỗi",
        description: "Không tìm thấy ID khuyến mãi cần sửa",
        variant: "danger",
      })
      return
    }

    const request = formDataToUpdateRequest(formData)

    try {
      await updateMutation.mutateAsync({ id: promotionId, body: request })
      toast({
        title: "Thành công",
        description: `Đã cập nhật chương trình khuyến mãi "${formData.name}"!`,
        variant: "success",
      })
      navigate(listPath)
    } catch (err: any) {
      const errorMsg =
        err?.response?.data?.message || err?.message || "Có lỗi xảy ra khi cập nhật khuyến mãi"
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

  if (isLoading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-page min-h-[400px]">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
          <p className="text-sm text-text-secondary">Đang tải thông tin khuyến mãi...</p>
        </div>
      </div>
    )
  }

  if (error || !promotion) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center p-8 bg-surface-page min-h-[400px]">
        <h2 className="text-lg font-bold text-text-primary">Không tìm thấy khuyến mãi</h2>
        <p className="text-sm text-text-secondary mt-1">Chương trình không tồn tại hoặc đã bị xóa.</p>
        <button
          type="button"
          onClick={handleCancel}
          className="mt-4 rounded-xl bg-brand-primary px-4 py-2 text-sm font-semibold text-white"
        >
          Quay lại danh sách
        </button>
      </div>
    )
  }

  return (
    <PromotionForm
      title="Chỉnh sửa khuyến mãi"
      subtitle={`Cập nhật quy tắc cho chương trình "${promotion.name}" (ID: #${promotion.id})`}
      submitText="Lưu thay đổi"
      initialData={initialFormData}
      isSubmitting={updateMutation.isPending}
      onSubmit={handleSubmit}
      onCancel={handleCancel}
      currentUsageCount={promotion.usageCount}
    />
  )
}
