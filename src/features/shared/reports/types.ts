/**
 * Kiểu dữ liệu cho module Báo cáo / Thống kê doanh thu.
 * Tương thích với các DTOs phía backend:
 * - InvoiceResponse (doanh thu, tiền thanh toán)
 * - TableSessionResponse (bàn phục vụ, số khách)
 * - OrderDetailResponse (món bán ra, số lượng)
 * - BranchResponse (chi nhánh)
 */

export interface RevenueMetric {
  value: string
  trend?: {
    value: string
    direction: "up" | "down" | "neutral"
  }
  note?: string
}

export interface ReportSummaryData {
  revenue: RevenueMetric
  ordersCount: RevenueMetric
  averagePerTable: RevenueMetric
  tablesServed: RevenueMetric
}

export interface DailyRevenueItem {
  day: string // T2, T3, T4, T5, T6, T7, CN
  fullDay: string // Thứ 2, ..., Thứ 7, Chủ nhật
  date: string // 2026-07-26
  revenue: number // Giá trị số nguyên VND
  isActive?: boolean
}

export interface HourlyRevenueItem {
  hour: string // 8h, 9h, ..., 23h
  timeRange: string // 08:00 – 09:00
  revenue: number
  isPeakHour?: boolean // Giờ cao điểm (12h, 18h, 19h, 20h)
}

export interface HourlySummaryData {
  peakHours: {
    label: string
    value: string
    note: string
  }
  peakRevenue: {
    label: string
    value: string
    note: string
  }
  peakTables: {
    label: string
    value: string
    note: string
  }
}

export interface BranchComparisonItem {
  rank: number
  branchName: string
  shortName: string
  revenue: number
  orderCount: number
  averagePerOrder: number
  cancelRate: string
  cancelByRestaurantCount?: number
  cancelByCustomerCount?: number
  isCancelRateHigh?: boolean
  vsAverage: {
    value: string
    direction: "up" | "down"
  }
}

export interface TopSellingDishItem {
  rank: number
  dishName: string
  quantity: number
  totalAmount: number
}

export interface BranchOption {
  id: number | string
  name: string
  code?: string
}

export interface TimeRangeOption {
  value: string
  label: string
}
