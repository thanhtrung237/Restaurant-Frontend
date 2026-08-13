import PromotionsPage from "@/features/restaurant-admin/pages/promotions"
import { BRANCH_MANAGER_PATHS } from "@/app/router/paths"

/**
 * Khuyến mãi — Màn hình thuộc Quản lý chi nhánh (branch-manager)
 * Tái sử dụng component của Quản trị nhà hàng, chỉ đổi URI "Tạo khuyến mãi" cho đúng phạm vi vai trò.
 */
export default function BranchManagerPromotionsPage() {
  return <PromotionsPage createPath={BRANCH_MANAGER_PATHS.PROMOTION_CREATE} />
}
