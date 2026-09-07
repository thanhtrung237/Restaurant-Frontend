import { useParams } from "react-router-dom"
import { BranchConfigPage as SharedBranchConfigPage } from "@/features/shared/branch-detail/BranchConfigPage"

/**
 * Cấu hình chi nhánh — Màn hình thuộc Quản trị nhà hàng (restaurant-admin).
 * Mở qua nút "Cấu hình chi nhánh" trên trang chi tiết chi nhánh — sửa 1 chi nhánh bất kỳ (mục 4.3).
 * Component dùng chung với Quản lý chi nhánh: @/features/shared/branch-detail
 */
export default function BranchConfigPage() {
  const { branchId } = useParams<{ branchId: string }>()
  const currentBranchId = Number(branchId) || 1

  return <SharedBranchConfigPage branchId={currentBranchId} />
}
