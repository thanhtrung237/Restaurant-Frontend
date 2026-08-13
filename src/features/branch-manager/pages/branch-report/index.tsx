import { ReportDashboard } from "@/features/shared/reports/ReportDashboard"

/**
 * Báo cáo — Màn hình thuộc Quản lý chi nhánh (branch-manager)
 * KHÔNG có tab "So sánh chi nhánh" — chỉ Quản trị NH mới có (mục 4.3).
 * Nguồn: Desktop / Báo cáo (Báo cáo.png)
 */
export default function BranchReportPage() {
  return <ReportDashboard showBranchCompare={false} />
}
