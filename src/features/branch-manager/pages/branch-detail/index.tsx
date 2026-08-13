import { useNavigate } from "react-router-dom"
import { useAuthStore } from "@/stores/auth.store"
import { BranchDetailPage as SharedBranchDetailPage } from "@/features/shared/branch-detail/BranchDetailPage"
import { BRANCH_MANAGER_PATHS } from "@/app/router/paths"

/**
 * Chi tiết chi nhánh — Màn hình thuộc Quản lý chi nhánh (branch-manager).
 * Nav "Chi nhánh" đi thẳng vào đây với chi nhánh CỦA MÌNH (không có danh sách chọn chi nhánh
 * như Quản trị NH). Component dùng chung: @/features/shared/branch-detail
 */
export default function BranchDetailPage() {
  const navigate = useNavigate()
  const branchId = useAuthStore((s) => s.branchId) || 1

  const handleConfigBranch = () => {
    navigate(BRANCH_MANAGER_PATHS.CONFIG)
  }

  return <SharedBranchDetailPage branchId={branchId} onConfigBranch={handleConfigBranch} />
}
