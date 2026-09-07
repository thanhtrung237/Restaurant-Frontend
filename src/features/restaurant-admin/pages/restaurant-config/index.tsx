import { useState } from "react"
import { useToast } from "@/hooks/use-toast"
import { ConfigHeader } from "./components/ConfigHeader"
import { RestaurantConfigTab } from "./components/RestaurantConfigTab"
import { MOCK_RESTAURANT_INFO, MOCK_TAX_AND_FEE, MOCK_STAFF_ROLES } from "./mock-data"
import type { RestaurantInfoConfig, TaxAndFeeConfig } from "./types"

/**
 * Cấu hình — Màn hình thuộc Quản trị nhà hàng (restaurant-admin)
 * Nguồn: QuanLy/Cấu hình.png
 *
 * CHỈ cấp NHÀ HÀNG: thông tin doanh nghiệp, thuế/phí (VAT, phí dịch vụ, ngưỡng chiết khấu, MST
 * mặc định), danh sách vai trò. Theo bảng phân quyền theo màn hình (Excel), Quản trị nhà hàng
 * "chỉ xem được cấu hình nhà hàng" ở trang này — cấu hình RIÊNG của 1 chi nhánh (giờ giấc/TK
 * ngân hàng/tự huỷ phiên) nằm ở trang "Cấu hình chi nhánh" riêng biệt, mở qua nút trên trang
 * chi tiết chi nhánh (@/features/shared/branch-detail), không lặp lại ở đây.
 */
export default function RestaurantConfigPage() {
  const { toast } = useToast()
  const [isSaving, setIsSaving] = useState(false)

  const [restaurantInfo, setRestaurantInfo] =
    useState<RestaurantInfoConfig>(MOCK_RESTAURANT_INFO)
  const [taxAndFee, setTaxAndFee] = useState<TaxAndFeeConfig>(MOCK_TAX_AND_FEE)
  const [roles] = useState(MOCK_STAFF_ROLES)

  const handleSaveRestaurant = () => {
    setIsSaving(true)
    setTimeout(() => {
      setIsSaving(false)
      toast({
        title: "Thành công",
        description: "Đã lưu cấu hình doanh nghiệp và thuế/phí thành công!",
        variant: "success",
      })
    }, 400)
  }

  return (
    <div className="flex flex-col min-h-full bg-surface-page p-6 lg:p-8 space-y-6">
      <ConfigHeader onSave={handleSaveRestaurant} isSaving={isSaving} />

      <RestaurantConfigTab
        info={restaurantInfo}
        onInfoChange={setRestaurantInfo}
        taxAndFee={taxAndFee}
        onTaxAndFeeChange={setTaxAndFee}
        roles={roles}
      />
    </div>
  )
}
