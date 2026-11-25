import { AlertCircle } from "lucide-react"
import { BranchRevenueBarChart } from "./BranchRevenueBarChart"
import { BranchComparisonTable } from "./BranchComparisonTable"
import { useBranchComparison } from "@/api/reports.api"
import type { BranchComparisonItem } from "../types"

interface BranchCompareTabProps {
  restaurantId: number
  from: string
  to: string
}

export function BranchCompareTab({ restaurantId, from, to }: BranchCompareTabProps) {
  const { data, isLoading, error } = useBranchComparison({
    restaurantId,
    from,
    to,
  })

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="h-20 animate-pulse rounded-xl bg-surface-muted" />
        <div className="h-96 animate-pulse rounded-card bg-surface-muted" />
        <div className="h-64 animate-pulse rounded-card bg-surface-muted" />
      </div>
    )
  }

  // Show error message
  if (error) {
    return (
      <div className="flex min-h-[400px] items-center justify-center rounded-card border border-border-default/80 bg-surface-card p-6 shadow-2xs">
        <div className="text-center">
          <p className="text-sm font-semibold text-status-danger">Không thể tải dữ liệu báo cáo</p>
          <p className="mt-2 text-xs text-text-tertiary">Vui lòng kiểm tra kết nối và thử lại</p>
        </div>
      </div>
    )
  }

  if (!data) {
    return null
  }

  const avgRevenue = parseFloat(data.avgRevenue)

  // Map branches to BranchComparisonItem[] for chart and table
  const branchComparisonData: BranchComparisonItem[] = data.branches.map((branch) => {
    const branchRevenue = parseFloat(branch.totalRevenue)
    const branchAvgInvoiceValue = parseFloat(branch.avgInvoiceValue)

    // Compute vsAverage client-side
    const vsAveragePercent = avgRevenue > 0 ? ((branchRevenue - avgRevenue) / avgRevenue) * 100 : 0

    return {
      rank: branch.rank,
      branchName: branch.branchName,
      shortName: branch.branchName.replace("Chi nhánh ", "").trim(),
      revenue: branchRevenue,
      orderCount: branch.totalInvoices,
      averagePerOrder: branchAvgInvoiceValue,
      cancelRate: `${branch.totalCancelRate.toFixed(1)}%`,
      cancelByRestaurantCount: branch.cancelByRestaurantCount,
      cancelByCustomerCount: branch.cancelByCustomerCount,
      isCancelRateHigh: branch.totalCancelRate > data.avgCancelRate * 1.5,
      vsAverage: {
        value: `${Math.abs(vsAveragePercent).toFixed(1)}%`,
        direction: vsAveragePercent >= 0 ? "up" : "down",
      },
    }
  })

  // Find first branch with anomaly for warning box
  const anomalyBranch = data.branches.find((branch) => branch.hasAnomaly)

  return (
    <div className="space-y-6">
      {/* Warning Box: Cảnh báo chi nhánh bất thường */}
      {anomalyBranch && (
        <div className="flex items-center gap-3 rounded-xl border border-amber-200/60 bg-[#FFF7ED] px-4 py-3.5 shadow-2xs">
          <AlertCircle className="size-4 shrink-0 text-[#D97706]" />
          <p className="text-xs sm:text-sm font-normal text-[#92400E]">
            {anomalyBranch.anomalyNote}
          </p>
        </div>
      )}

      {/* Bar Chart: Doanh thu theo chi nhánh */}
      <BranchRevenueBarChart data={branchComparisonData} />

      {/* Comparison Table: Bảng so sánh chi tiết các chi nhánh */}
      <BranchComparisonTable data={branchComparisonData} />
    </div>
  )
}
