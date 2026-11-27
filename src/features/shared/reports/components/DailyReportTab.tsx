import { StatCard } from "@/components/common/StatCard"
import { RevenueBarChart } from "./RevenueBarChart"
import { HourlyRevenueBarChart } from "./HourlyRevenueBarChart"
import { TopDishesCard } from "./TopDishesCard"
import { PaymentMethodBreakdownCard } from "./PaymentMethodBreakdownCard"
import { CategoryRevenueCard } from "./CategoryRevenueCard"
import { AnomalyAlertCard } from "./AnomalyAlertCard"
import {
  useRevenueReport,
  useTopDishes,
  useAnomalyReport,
  useHourlyRevenue,
} from "@/api/reports.api"
import { computeGrowthTrend, formatCurrency, formatNumber } from "@/lib/format"
import { calendarDate, vietnamTodayKey } from "@/lib/calendar-range"
import {
  differenceInCalendarDays,
  differenceInCalendarMonths,
  eachDayOfInterval,
  eachMonthOfInterval,
  eachYearOfInterval,
  format as formatDate,
  isSameDay,
  subDays,
} from "date-fns"
import type { DailyRevenueItem, HourlyRevenueItem } from "../types"

interface DailyReportTabProps {
  branchIds: number[]
  from: string
  to: string
}

export function DailyReportTab({ branchIds, from, to }: DailyReportTabProps) {
  // Compute previous period dates for trend comparisons
  const fromDate = new Date(from)
  const toDate = new Date(to)
  const durationMs = toDate.getTime() - fromDate.getTime()

  const previousToDate = new Date(fromDate.getTime() - 1000)
  const previousFromDate = new Date(previousToDate.getTime() - durationMs)

  const previousFrom = formatDate(previousFromDate, "yyyy-MM-dd'T'HH:mm:ss")
  const previousTo = formatDate(previousToDate, "yyyy-MM-dd'T'HH:mm:ss")

  // Số ngày trong khoảng thời gian được lọc
  const totalDays = Math.max(1, differenceInCalendarDays(toDate, fromDate) + 1)
  const isSingleDay = totalDays === 1
  const totalMonths = differenceInCalendarMonths(toDate, fromDate) + 1
  const period = totalDays <= 31 ? "day" : totalMonths <= 24 ? "month" : "year"
  const groupBy = period === "day" ? "DAY" : "MONTH"

  // Fetch current period data (for stat cards, payment methods, summary & daily trend)
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

  // Fetch hourly data specifically when filtering a single day (e.g. Hôm nay, Hôm qua)
  const { data: hourlyData, isLoading: isLoadingHourly } = useHourlyRevenue(
    isSingleDay ? { branchIds, from, to } : undefined,
  )

  // Fetch top & slowest dishes (FR-RPT-03, topN: 50 for full category coverage)
  const {
    data: topDishesData,
    isLoading: isLoadingTopDishes,
    error: errorTopDishes,
  } = useTopDishes({ branchIds, from, to, topN: 50 })

  // Fetch AI Anomaly Detection report
  const { data: anomalyData, isLoading: isLoadingAnomalies } = useAnomalyReport({
    branchIds,
    from,
    to,
  })

  const isLoading =
    isLoadingCurrent ||
    isLoadingPrevious ||
    isLoadingTopDishes ||
    (isSingleDay ? isLoadingHourly : false)
  const error = errorCurrent || errorPrevious || errorTopDishes

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-card bg-surface-muted" />
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
          <p className="text-sm font-semibold text-status-danger">Không thể tải dữ liệu báo cáo</p>
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
  const invoicesTrend = computeGrowthTrend(currentData.totalInvoices, previousData.totalInvoices)
  const avgPerInvoiceTrend = computeGrowthTrend(currentAvgPerInvoice, previousAvgPerInvoice)
  const guestsTrend = computeGrowthTrend(currentData.totalGuests, previousData.totalGuests)

  const keyFormat = { day: "yyyy-MM-dd", month: "yyyy-MM", year: "yyyy" }[period]
  const labelFormat = { day: "dd/MM", month: "MM/yy", year: "yyyy" }[period]
  const detailFormat = { day: "dd/MM/yyyy", month: "'Tháng' MM/yyyy", year: "'Năm' yyyy" }[period]
  const trendMap = new Map<string, number>()
  for (const point of currentData.trend ?? []) {
    const key = point.label.trim().slice(0, keyFormat.length)
    trendMap.set(key, (trendMap.get(key) ?? 0) + (parseFloat(point.revenue) || 0))
  }

  const interval = { start: fromDate, end: toDate }
  const eachPeriod = {
    day: eachDayOfInterval,
    month: eachMonthOfInterval,
    year: eachYearOfInterval,
  }[period]
  const revenueData: DailyRevenueItem[] = eachPeriod(interval).map((date) => {
    const key = formatDate(date, keyFormat)
    return {
      day: formatDate(date, labelFormat),
      fullDay: formatDate(date, detailFormat),
      date: key,
      revenue: trendMap.get(key) ?? 0,
    }
  })

  // Hourly items for single-day view (Hôm nay, Hôm qua, hoặc 1 ngày cụ thể)
  const hourlyRevenueData: HourlyRevenueItem[] = (hourlyData?.hourlySlots ?? []).map((slot) => ({
    hour: `${slot.hour}h`,
    timeRange: slot.label,
    revenue: parseFloat(slot.revenue) || 0,
    isPeakHour: false,
  }))

  // Tiêu đề biểu đồ linh hoạt theo khoảng thời gian được lọc
  const periodLabel = { day: "ngày", month: "tháng", year: "năm" }[period]
  const rangeLabel = `${formatDate(fromDate, "dd/MM/yyyy")} – ${formatDate(toDate, "dd/MM/yyyy")}`
  let chartTitle = `Doanh thu theo ${periodLabel}`
  if (isSingleDay) {
    const today = calendarDate(vietnamTodayKey())
    if (isSameDay(fromDate, today)) {
      chartTitle = `Doanh thu theo khung giờ · Hôm nay (${formatDate(fromDate, "dd/MM/yyyy")})`
    } else if (isSameDay(fromDate, subDays(today, 1))) {
      chartTitle = `Doanh thu theo khung giờ · Hôm qua (${formatDate(fromDate, "dd/MM/yyyy")})`
    } else {
      chartTitle = `Doanh thu theo khung giờ · Ngày ${formatDate(fromDate, "dd/MM/yyyy")}`
    }
  }

  return (
    <div className="space-y-6">
      {/* AI Anomaly Detection Card (FR-RPT-06 / Ops Auditor) */}
      <AnomalyAlertCard data={anomalyData} isLoading={isLoadingAnomalies} />

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

      {/* Row: Dynamic Revenue Bar Chart + Payment Methods Breakdown (FR-RPT-01) */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="min-w-0 lg:col-span-7 xl:col-span-8">
          {isSingleDay ? (
            <HourlyRevenueBarChart data={hourlyRevenueData} title={chartTitle} />
          ) : (
            <RevenueBarChart data={revenueData} title={chartTitle} subtitle={rangeLabel} />
          )}
        </div>
        <div className="min-w-0 lg:col-span-5 xl:col-span-4">
          <PaymentMethodBreakdownCard revenueByPaymentMethod={currentData.revenueByPaymentMethod} />
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
