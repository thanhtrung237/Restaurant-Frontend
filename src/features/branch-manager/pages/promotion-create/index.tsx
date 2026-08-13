import PromotionCreatePage from "@/features/restaurant-admin/pages/promotion-create"
import { BRANCH_MANAGER_PATHS } from "@/app/router/paths"

/**
 * Tạo khuyến mãi — Màn hình thuộc Quản lý chi nhánh (branch-manager)
 * Tái sử dụng component của Quản trị nhà hàng, chỉ đổi URI quay lại danh sách.
 */
export default function BranchManagerPromotionCreatePage() {
  return <PromotionCreatePage listPath={BRANCH_MANAGER_PATHS.PROMOTIONS} />
}
