import { Clock } from "lucide-react"
import { HourlyRevenueBarChart } from "./HourlyRevenueBarChart"
import { useHourlyRevenue } from "@/api/reports.api"
import { findPeakHours } from "@/lib/format"
import type { HourlyRevenueItem } from "../types"

interface HourlyReportTabProps {
  branchIds: number[]
  from: string
  to: string
}

export function HourlyReportTab({ branchIds, from, to }: HourlyReportTabProps) {
  const { data, isLoading, error } = useHourlyRevenue({ branchIds, from, to })

  // Show loading skeleton
  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
          {[1, 2, 3].map((i) => (
            <div
              key={i}
              className="h-28 animate-pulse rounded-stat-card bg-surface-muted"
            />
          ))}
        </div>
        <div className="h-96 animate-pulse rounded-card bg-surface-muted" />
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

  if (!data) {
    return null
  }

  // Compute peak hours metrics
  const peakMetrics = findPeakHours(data.hourlySlots)

  // Map hourly slots to HourlyRevenueItem[] for chart
  const hourlyRevenueData: HourlyRevenueItem[] = data.hourlySlots.map((slot) => ({
    hour: `${slot.hour}h`,
    timeRange: slot.label,
    revenue: parseFloat(slot.revenue),
    isPeakHour: false, // Optional field, not used in chart logic
  }))

  return (
    <div className="space-y-6">
      {/* 3 Metric Cards for Peak Hours */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Card 1: Peak Hours */}
        <div className="rounded-stat-card border border-border-default/80 bg-surface-card px-5 py-[18px] shadow-2xs">
          <p className="text-sm text-text-tertiary">Khung giờ cao điểm</p>
          <p className="mt-2 text-2xl font-bold text-text-primary">
            {peakMetrics.hours}
          </p>
          <p className="mt-2 text-xs font-medium text-text-tertiary">
            Chiếm {peakMetrics.peakPercentage} tổng doanh thu
          </p>
        </div>

        {/* Card 2: Peak Revenue */}
        <div className="rounded-stat-card border border-border-default/80 bg-surface-card px-5 py-[18px] shadow-2xs">
          <p className="text-sm text-text-tertiary">Doanh thu cao điểm</p>
          <p className="mt-2 text-2xl font-bold text-text-primary">
            {peakMetrics.totalRevenue}
          </p>
          <p className="mt-2 text-xs font-medium text-text-tertiary">
            Trong khung giờ {peakMetrics.hours}
          </p>
        </div>

        {/* Card 3: Peak Tables */}
        <div className="rounded-stat-card border border-border-default/80 bg-surface-card px-5 py-[18px] shadow-2xs">
          <p className="text-sm text-text-tertiary">Số bàn cao điểm</p>
          <p className="mt-2 text-2xl font-bold text-text-primary">
            {peakMetrics.maxTables}
          </p>
          <p className="mt-2 text-xs font-medium text-text-tertiary">
            Đồng thời tại {peakMetrics.hours}
          </p>
        </div>
      </div>

      {/* Hourly Revenue Bar Chart */}
      <HourlyRevenueBarChart data={hourlyRevenueData} />

      {/* Info Notice Box for Staff Scheduling */}
      <div className="flex items-center gap-3 rounded-xl bg-[#EFF6FF] px-4 py-3 text-sm text-[#2563EB] shadow-2xs">
        <Clock className="size-4 shrink-0 text-[#2563EB]" />
        <p className="text-xs sm:text-sm font-normal text-[#1E40AF]">
          Cuối tuần (T7, CN) cao điểm dịch chuyển sang 19h–21h. Mỗi chi nhánh có giờ cao điểm khác nhau – lọc theo chi nhánh để xếp ca chính xác.
        </p>
      </div>
    </div>
  )
}
