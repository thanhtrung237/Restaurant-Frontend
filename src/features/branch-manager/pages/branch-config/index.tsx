import { useAuthStore } from "@/stores/auth.store"
import { BranchConfigPage as SharedBranchConfigPage } from "@/features/shared/branch-detail/BranchConfigPage"

/**
 * Cấu hình chi nhánh — Màn hình thuộc Quản lý chi nhánh (branch-manager).
 * QL chi nhánh chỉ xem/sửa được cấu hình của CHI NHÁNH MÌNH (giờ giấc, TK ngân hàng,
 * thời gian tự huỷ phiên — FR-BRN-02). KHÔNG có cấu hình nhà hàng (VAT/phí DV/MST — mục 4.3).
 * Component dùng chung: @/features/shared/branch-detail
 */
export default function BranchConfigPage() {
  const branchId = useAuthStore((s) => s.branchId) || 1

  return <SharedBranchConfigPage branchId={branchId} />
}
