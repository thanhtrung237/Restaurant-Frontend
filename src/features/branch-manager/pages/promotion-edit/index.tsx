import PromotionEditPage from "@/features/restaurant-admin/pages/promotion-edit"
import { BRANCH_MANAGER_PATHS } from "@/app/router/paths"

/**
 * Chỉnh sửa khuyến mãi — Màn hình thuộc Quản lý chi nhánh (branch-manager)
 * Tái sử dụng component của Quản trị nhà hàng, chỉ đổi URI quay lại danh sách.
 */
export default function BranchManagerPromotionEditPage() {
  return <PromotionEditPage listPath={BRANCH_MANAGER_PATHS.PROMOTIONS} />
}
