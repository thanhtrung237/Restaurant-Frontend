import { useNavigate, useParams } from "react-router-dom"
import { BranchDetailPage as SharedBranchDetailPage } from "@/features/shared/branch-detail/BranchDetailPage"
import { RESTAURANT_ADMIN_PATHS } from "@/app/router/paths"

/**
 * Chi tiết chi nhánh — Màn hình thuộc Quản trị nhà hàng (restaurant-admin).
 * Quản trị NH bấm vào 1 card chi nhánh trên trang "Chi nhánh" (danh sách) để vào đây,
 * xem được 3 tab (Thông tin / Menu chi nhánh / Bàn & QR) của chi nhánh BẤT KỲ.
 * Component dùng chung với Quản lý chi nhánh: @/features/shared/branch-detail
 */
export default function BranchDetailPage() {
  const { branchId } = useParams<{ branchId: string }>()
  const navigate = useNavigate()
  const currentBranchId = Number(branchId) || 1

  const handleConfigBranch = () => {
    navigate(`${RESTAURANT_ADMIN_PATHS.BRANCH}/${currentBranchId}/cau-hinh`)
  }

  return <SharedBranchDetailPage branchId={currentBranchId} onConfigBranch={handleConfigBranch} />
}
