import { useState } from "react"
import { useNavigate } from "react-router-dom"
import { Plus, Filter } from "lucide-react"
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
  useDeletePromotion,
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
  /** Base URI cho trang "Chỉnh sửa khuyến mãi" — mặc định là của Quản trị NH. */
  editBasePath?: string
}

type FilterStatus = "ALL" | "ACTIVE" | "INACTIVE" | "EXPIRED"

const FILTER_TABS: { key: FilterStatus; label: string }[] = [
  { key: "ALL", label: "Tất cả" },
  { key: "ACTIVE", label: "Đang chạy" },
  { key: "INACTIVE", label: "Tạm dừng" },
  { key: "EXPIRED", label: "Hết hạn" },
]

export default function PromotionsPage({
  createPath = RESTAURANT_ADMIN_PATHS.PROMOTION_CREATE,
  editBasePath = RESTAURANT_ADMIN_PATHS.PROMOTIONS,
}: PromotionsPageProps = {}) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const restaurantId = useAuthStore((s) => s.account?.restaurantId)
  const [filterStatus, setFilterStatus] = useState<FilterStatus>("ALL")

  // Fetch promotions từ API — Tự động làm mới mỗi 20 giây để cập nhật lượt dùng real-time
  const { data, isLoading } = usePromotionsByRestaurant(restaurantId, undefined, {
    refetchInterval: 20000,
  })
  const changeStatusMutation = useChangePromotionStatus()
  const deleteMutation = useDeletePromotion()

  const allPromotions = data?.content ?? []

  // Lọc theo trạng thái hiển thị
  const promotions = allPromotions.filter((promo) => {
    if (filterStatus === "ALL") return true
    if (filterStatus === "EXPIRED") {
      const today = new Date().toISOString().split("T")[0]
      return promo.endDate < today
    }
    return promo.status === filterStatus
  })

  // Đếm số lượng theo từng trạng thái
  const counts = {
    ALL: allPromotions.length,
    ACTIVE: allPromotions.filter((p) => {
      const today = new Date().toISOString().split("T")[0]
      return p.status === "ACTIVE" && p.endDate >= today
    }).length,
    INACTIVE: allPromotions.filter((p) => p.status === "INACTIVE").length,
    EXPIRED: allPromotions.filter((p) => {
      const today = new Date().toISOString().split("T")[0]
      return p.endDate < today
    }).length,
  }

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
    navigate(`${editBasePath}/${promotion.id}/edit`)
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
        subtitle="Hệ thống tự động áp dụng khi đủ điều kiện · Áp dụng theo thứ tự ưu tiên"
        mobileSubtitle="Tự động áp dụng khi đủ điều kiện"
        actions={
          <Button
            type="button"
            onClick={handleCreatePromotion}
            className="h-10 gap-1.5 px-4 cursor-pointer"
          >
            <Plus className="size-4 stroke-[2.5]" />
            <span>Tạo khuyến mãi</span>
          </Button>
        }
      />

      <div className="flex flex-1 flex-col gap-6 p-6 lg:p-8">
        {/* Tabs lọc theo trạng thái */}
        <div className="flex flex-wrap items-center gap-2">
          <span className="flex items-center gap-1.5 text-xs font-semibold text-text-tertiary">
            <Filter className="size-3.5" />
            Lọc:
          </span>
          {FILTER_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setFilterStatus(tab.key)}
              className={`flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all ${
                filterStatus === tab.key
                  ? "bg-brand-primary text-white shadow-xs"
                  : "bg-surface-muted text-text-secondary hover:bg-border-default"
              }`}
            >
              {tab.label}
              <span
                className={`min-w-[18px] rounded-full px-1 py-0 text-center text-[10px] font-bold ${
                  filterStatus === tab.key
                    ? "bg-white/20 text-white"
                    : "bg-border-default text-text-tertiary"
                }`}
              >
                {counts[tab.key]}
              </span>
            </button>
          ))}
        </div>

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
