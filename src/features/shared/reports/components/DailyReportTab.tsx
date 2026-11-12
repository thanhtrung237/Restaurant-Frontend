import { StatCard } from "@/components/common/StatCard"
import { RevenueBarChart } from "./RevenueBarChart"
import { TopDishesCard } from "./TopDishesCard"
import { PaymentMethodBreakdownCard } from "./PaymentMethodBreakdownCard"
import { CategoryRevenueCard } from "./CategoryRevenueCard"
import { useRevenueReport, useTopDishes } from "@/api/reports.api"
import { computeGrowthTrend, formatCurrency, formatNumber } from "@/lib/format"
import { format as formatDate, subDays } from "date-fns"
import type { DailyRevenueItem } from "../types"

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
  // Compute previous period dates for trend comparisons
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const durationMs = toDate.getTime() - fromDate.getTime()

  const previousToDate = new Date(fromDate.getTime() - 1000)
  const previousFromDate = new Date(previousToDate.getTime() - durationMs)

  const previousFrom = formatDate(previousFromDate, "yyyy-MM-dd'T'HH:mm:ss")
  const previousTo = formatDate(previousToDate, "yyyy-MM-dd'T'HH:mm:ss")

  // Compute 7-day range ending at toDate for "Doanh thu 7 ngày qua" chart
  const sevenDaysStartDate = subDays(toDate, 6)
  const sevenDaysFrom = formatDate(sevenDaysStartDate, "yyyy-MM-dd'T'00:00:00")
  const sevenDaysTo = formatDate(toDate, "yyyy-MM-dd'T'23:59:59")

  // Fetch current period data (for stat cards, payment methods & summary)
  const {
    data: currentData,
    isLoading: isLoadingCurrent,
    error: errorCurrent,
  } = useRevenueReport({ branchIds, from, to, groupBy })

  // Fetch previous period data (for comparison trends)
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

  // Fetch 7-day data specifically for the 7-day revenue chart
  const {
    data: sevenDaysData,
    isLoading: isLoadingSevenDays,
  } = useRevenueReport({
    branchIds,
    from: sevenDaysFrom,
    to: sevenDaysTo,
    groupBy: "DAY",
  })

  // Fetch top & slowest dishes (FR-RPT-03, topN: 50 for full category coverage)
  const {
    data: topDishesData,
    isLoading: isLoadingTopDishes,
    error: errorTopDishes,
  } = useTopDishes({ branchIds, from, to, topN: 50 })

  const isLoading = isLoadingCurrent || isLoadingPrevious || isLoadingTopDishes || isLoadingSevenDays
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
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <div className="h-96 animate-pulse rounded-card bg-surface-muted lg:col-span-7 xl:col-span-8" />
          <div className="h-96 animate-pulse rounded-card bg-surface-muted lg:col-span-5 xl:col-span-4" />
        </div>
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
            Vui lòng kiểm tra kết nối mạng và thử lại.
          </p>
        </div>
      </div>
    )
  }

  if (!currentData || !previousData) {
    return null
  }

  // Parse BigDecimal strings to numbers
  const currentRevenue = parseFloat(currentData.totalRevenue) || 0
  const previousRevenue = parseFloat(previousData.totalRevenue) || 0
  const currentAvgPerInvoice = parseFloat(currentData.avgRevenuePerInvoice) || 0
  const previousAvgPerInvoice = parseFloat(previousData.avgRevenuePerInvoice) || 0

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

  // Map 7-day trend data from backend by date string (YYYY-MM-DD)
  const trendMap = new Map<string, number>()
  if (sevenDaysData?.trend) {
    for (const point of sevenDaysData.trend) {
      const dateKey = point.label.split("T")[0].trim()
      trendMap.set(dateKey, parseFloat(point.revenue) || 0)
    }
  }

  // Generate all 7 consecutive days ending at toDate (T-6 to T)
  const dailyRevenueData: DailyRevenueItem[] = []
  for (let i = 6; i >= 0; i--) {
    const d = subDays(toDate, i)
    const dateKey = formatDate(d, "yyyy-MM-dd")
    const dayOfWeek = d.getDay()

    dailyRevenueData.push({
      day: dayAbbreviations[dayOfWeek],
      fullDay: fullDayNames[dayOfWeek],
      date: dateKey,
      revenue: trendMap.get(dateKey) ?? 0,
    })
  }

  return (
    <div className="space-y-6">
      {/* 4 Core Stat Cards (FR-RPT-01) */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Tổng doanh thu"
          value={formatCurrency(currentRevenue)}
          trend={revenueTrend}
        />
        <StatCard
          label="Số đơn hàng"
          value={formatNumber(currentData.totalInvoices)}
          trend={invoicesTrend}
        />
        <StatCard
          label="Giá trị TB / đơn"
          value={formatCurrency(currentAvgPerInvoice)}
          trend={avgPerInvoiceTrend}
        />
        <StatCard
          label="Số lượng khách phục vụ"
          value={`${formatNumber(currentData.totalGuests)} khách`}
          trend={guestsTrend}
        />
      </div>

      {/* Row: 7-day revenue bar chart + Payment Methods Breakdown (FR-RPT-01) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 xl:col-span-8">
          <RevenueBarChart data={dailyRevenueData} />
        </div>
        <div className="lg:col-span-5 xl:col-span-4">
          <PaymentMethodBreakdownCard
            revenueByPaymentMethod={currentData.revenueByPaymentMethod}
            totalRevenue={currentRevenue}
          />
        </div>
      </div>

      {/* Row: Category Breakdown + Top Dishes & Slowest Dishes (FR-RPT-03) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <CategoryRevenueCard dishes={topDishesData?.topByRevenue} />
        </div>
        <div className="lg:col-span-7">
          <TopDishesCard
            topByRevenue={topDishesData?.topByRevenue}
            topByQuantity={topDishesData?.topByQuantity}
            slowestDishes={topDishesData?.slowestDishes}
          />
        </div>
      </div>
    </div>
  )
}
