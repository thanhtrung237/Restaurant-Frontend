import type { BranchComparisonItem } from "../types"
import { RevenueBarChart } from "./RevenueBarChart"

interface BranchRevenueBarChartProps {
  data: BranchComparisonItem[]
  title?: string
}

export function BranchRevenueBarChart({ data, title = "Doanh thu theo chi nhánh" }: BranchRevenueBarChartProps) {
  return (
    <RevenueBarChart
      data={data.map(({ shortName, branchName, revenue }) => ({ day: shortName, fullDay: branchName, revenue }))}
      title={title}
      maxBarSize={84}
    />
  )
}
