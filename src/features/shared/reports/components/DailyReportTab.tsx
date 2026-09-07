import { StatCard } from "@/components/common/StatCard"
import { RevenueBarChart } from "./RevenueBarChart"
import { TopDishesCard } from "./TopDishesCard"
import {
  MOCK_SUMMARY_DATA,
  MOCK_DAILY_REVENUE,
  MOCK_TOP_SELLING_DISHES,
} from "../mock-data"

export function DailyReportTab() {
  return (
    <div className="space-y-6">
      {/* 4 Stat Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Doanh thu"
          value={MOCK_SUMMARY_DATA.revenue.value}
          trend={MOCK_SUMMARY_DATA.revenue.trend}
        />
        <StatCard
          label="Số đơn"
          value={MOCK_SUMMARY_DATA.ordersCount.value}
          trend={MOCK_SUMMARY_DATA.ordersCount.trend}
        />
        <StatCard
          label="Trung bình/bàn"
          value={MOCK_SUMMARY_DATA.averagePerTable.value}
          trend={MOCK_SUMMARY_DATA.averagePerTable.trend}
        />
        <StatCard
          label="Số bàn phục vụ"
          value={MOCK_SUMMARY_DATA.tablesServed.value}
          trend={MOCK_SUMMARY_DATA.tablesServed.trend}
        />
      </div>

      {/* Bar Chart: Doanh thu 7 ngày qua */}
      <RevenueBarChart data={MOCK_DAILY_REVENUE} />

      {/* Top Selling Dishes Card */}
      <TopDishesCard dishes={MOCK_TOP_SELLING_DISHES} />
    </div>
  )
}
