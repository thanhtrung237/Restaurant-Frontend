import { Clock } from "lucide-react"
import { HourlyRevenueBarChart } from "./HourlyRevenueBarChart"
import { MOCK_HOURLY_SUMMARY, MOCK_HOURLY_REVENUE } from "../mock-data"

export function HourlyReportTab() {
  const { peakHours, peakRevenue, peakTables } = MOCK_HOURLY_SUMMARY

  return (
    <div className="space-y-6">
      {/* 3 Metric Cards for Peak Hours */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        {/* Card 1 */}
        <div className="rounded-stat-card border border-border-default/80 bg-surface-card px-5 py-[18px] shadow-2xs">
          <p className="text-sm text-text-tertiary">{peakHours.label}</p>
          <p className="mt-2 text-2xl font-bold text-text-primary">{peakHours.value}</p>
          <p className="mt-2 text-xs font-medium text-text-tertiary">{peakHours.note}</p>
        </div>

        {/* Card 2 */}
        <div className="rounded-stat-card border border-border-default/80 bg-surface-card px-5 py-[18px] shadow-2xs">
          <p className="text-sm text-text-tertiary">{peakRevenue.label}</p>
          <p className="mt-2 text-2xl font-bold text-text-primary">{peakRevenue.value}</p>
          <p className="mt-2 text-xs font-medium text-text-tertiary">{peakRevenue.note}</p>
        </div>

        {/* Card 3 */}
        <div className="rounded-stat-card border border-border-default/80 bg-surface-card px-5 py-[18px] shadow-2xs">
          <p className="text-sm text-text-tertiary">{peakTables.label}</p>
          <p className="mt-2 text-2xl font-bold text-text-primary">{peakTables.value}</p>
          <p className="mt-2 text-xs font-medium text-text-tertiary">{peakTables.note}</p>
        </div>
      </div>

      {/* Hourly Revenue Bar Chart */}
      <HourlyRevenueBarChart data={MOCK_HOURLY_REVENUE} />

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
