import type { HourlyRevenueItem } from "../types"
import { RevenueBarChart } from "./RevenueBarChart"

interface HourlyRevenueBarChartProps {
  data: HourlyRevenueItem[]
  title?: string
}

export function HourlyRevenueBarChart({ data, title = "Doanh thu theo giờ" }: HourlyRevenueBarChartProps) {
  return (
    <RevenueBarChart
      data={data.map(({ hour, timeRange, revenue }) => ({ day: hour, fullDay: timeRange, revenue }))}
      title={title}
      maxBarSize={28}
    />
  )
}
