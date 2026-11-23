import { useBranchOperationalPermissions } from "@/api/operational-permissions.api";
import { useAuthStore } from "@/stores/auth.store"
import { ReportDashboard } from "@/features/shared/reports/ReportDashboard"

/**
 * Báo cáo — Màn hình thuộc Quản lý chi nhánh (branch-manager)
 * KHÔNG có tab "So sánh chi nhánh" — chỉ Quản trị NH mới có (mục 4.3).
 * Nguồn: Desktop / Báo cáo (Báo cáo.png)
 */
export default function BranchReportPage() {
  const branchId = useAuthStore((state) => state.branchId)
  const access = useBranchOperationalPermissions(branchId)
  if (access.isLoading) return <p className="p-6" role="status">Đang kiểm tra quyền báo cáo…</p>
  if (access.isError) return <p className="p-6" role="alert">Chưa kiểm tra được quyền báo cáo.</p>
  if (!access.can("VIEW_REPORT")) return <p className="p-6">Bạn chưa có quyền xem báo cáo tại chi nhánh này.</p>
  return <ReportDashboard key={branchId} showBranchCompare={false} canExport={access.can("EXPORT_REPORT")} />
}
