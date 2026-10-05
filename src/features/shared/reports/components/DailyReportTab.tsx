import { StatCard } from "@/components/common/StatCard"
import { RevenueBarChart } from "./RevenueBarChart"
import { TopDishesCard } from "./TopDishesCard"
import { useRevenueReport, useTopDishes } from "@/api/reports.api"
import { computeGrowthTrend, formatCurrency, formatNumber } from "@/lib/format"
import { format as formatDate } from "date-fns"
import type { DailyRevenueItem, TopSellingDishItem } from "../types"

interface DailyReportTabProps {
  branchIds: number[]
  from: string
  to: string
  groupBy: "DAY" | "MONTH"
}

export function DailyReportTab({
  branchIds,
  from,
  to,
  groupBy,
}: DailyReportTabProps) {
  // Compute previous period dates
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const durationMs = toDate.getTime() - fromDate.getTime()
  
  const previousToDate = new Date(fromDate.getTime() - 1000) // 1 second before from
  const previousFromDate = new Date(previousToDate.getTime() - durationMs)
  
  const previousFrom = formatDate(previousFromDate, "yyyy-MM-dd'T'HH:mm:ss")
  const previousTo = formatDate(previousToDate, "yyyy-MM-dd'T'HH:mm:ss")

  // Fetch current period data
  const {
    data: currentData,
    isLoading: isLoadingCurrent,
    error: errorCurrent,
  } = useRevenueReport({ branchIds, from, to, groupBy })

  // Fetch previous period data
  const {
    data: previousData,
    isLoading: isLoadingPrevious,
    error: errorPrevious,
  } = useRevenueReport({
    branchIds,
    from: previousFrom,
    to: previousTo,
    groupBy,
  })

  // Fetch top dishes
  const {
    data: topDishesData,
    isLoading: isLoadingTopDishes,
    error: errorTopDishes,
  } = useTopDishes({ branchIds, from, to, topN: 4 })

  const isLoading = isLoadingCurrent || isLoadingPrevious || isLoadingTopDishes
  const error = errorCurrent || errorPrevious || errorTopDishes

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-card bg-surface-muted"
            />
          ))}
        </div>
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
          <p className="text-sm font-semibold text-status-danger">
            Không thể tải dữ liệu báo cáo
          </p>
          <p className="mt-2 text-xs text-text-tertiary">
            Vui lòng kiểm tra kết nối và thử lại
          </p>
        </div>
      </div>
    )
  }

  if (!currentData || !previousData) {
    return null
  }

  // Parse BigDecimal strings to numbers
  const currentRevenue = parseFloat(currentData.totalRevenue)
  const previousRevenue = parseFloat(previousData.totalRevenue)
  const currentAvgPerInvoice = parseFloat(currentData.avgRevenuePerInvoice)
  const previousAvgPerInvoice = parseFloat(previousData.avgRevenuePerInvoice)

  // Compute growth trends
  const revenueTrend = computeGrowthTrend(currentRevenue, previousRevenue)
  const invoicesTrend = computeGrowthTrend(
    currentData.totalInvoices,
    previousData.totalInvoices
  )
  const avgPerInvoiceTrend = computeGrowthTrend(
    currentAvgPerInvoice,
    previousAvgPerInvoice
  )
  const guestsTrend = computeGrowthTrend(
    currentData.totalGuests,
    previousData.totalGuests
  )

  // Map trend data to DailyRevenueItem[] for bar chart
  const dailyRevenueData: DailyRevenueItem[] = currentData.trend.map((point) => {
    const pointDate = new Date(point.label)
    const dayOfWeek = pointDate.getDay()
    
    // Convert to Vietnamese day abbreviation
    const dayAbbreviations = ["CN", "T2", "T3", "T4", "T5", "T6", "T7"]
    const fullDayNames = [
      "Chủ nhật",
      "Thứ 2",
      "Thứ 3",
      "Thứ 4",
      "Thứ 5",
      "Thứ 6",
      "Thứ 7",
    ]
    
    return {
      day: dayAbbreviations[dayOfWeek],
      fullDay: fullDayNames[dayOfWeek],
      date: point.label,
      revenue: parseFloat(point.revenue),
    }
  })

  // Map top dishes data to TopSellingDishItem[]
  const topDishesItems: TopSellingDishItem[] =
    topDishesData?.topByRevenue.slice(0, 4).map((dish) => ({
      rank: dish.rank,
      dishName: dish.dishName,
      quantity: dish.totalQuantity,
      totalAmount: parseFloat(dish.totalRevenue),
    })) ?? []

  return (
    <div className="space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Doanh thu"
          value={formatCurrency(currentRevenue)}
          trend={revenueTrend}
        />
        <StatCard
          label="Số đơn"
          value={formatNumber(currentData.totalInvoices)}
          trend={invoicesTrend}
        />
        <StatCard
          label="Trung bình/bàn"
          value={formatCurrency(currentAvgPerInvoice)}
          trend={avgPerInvoiceTrend}
        />
        <StatCard
          label="Số bàn phục vụ"
          value={formatNumber(currentData.totalGuests)}
          trend={guestsTrend}
        />
      </div>

      {/* Bar Chart: Doanh thu 7 ngày qua */}
      <RevenueBarChart data={dailyRevenueData} />

      {/* Top Selling Dishes Card */}
      <TopDishesCard dishes={topDishesItems} />
    </div>
  )
}
