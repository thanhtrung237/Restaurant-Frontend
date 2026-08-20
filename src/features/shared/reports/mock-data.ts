import type {
  ReportSummaryData,
  DailyRevenueItem,
  HourlyRevenueItem,
  HourlySummaryData,
  BranchComparisonItem,
  TopSellingDishItem,
  BranchOption,
  TimeRangeOption,
} from "./types"

export const MOCK_SUMMARY_DATA: ReportSummaryData = {
  revenue: {
    value: "12.4tr đ",
    trend: { value: "8,2% so với hôm qua", direction: "up" },
  },
  ordersCount: {
    value: "86",
    trend: { value: "5,1% so với hôm qua", direction: "up" },
  },
  averagePerTable: {
    value: "385.000đ",
    trend: { value: "2,3% so với hôm qua", direction: "down" },
  },
  tablesServed: {
    value: "32",
    trend: { value: "12% so với hôm qua", direction: "up" },
  },
}

export const MOCK_HOURLY_SUMMARY: HourlySummaryData = {
  peakHours: {
    label: "Khung giờ cao điểm",
    value: "18h – 20h",
    note: "chiếm 34% doanh thu ngày",
  },
  peakRevenue: {
    label: "Doanh thu giờ cao điểm",
    value: "4.2tr đ",
    note: "trung bình mỗi ngày",
  },
  peakTables: {
    label: "Số bàn / giờ cao điểm",
    value: "11 bàn",
    note: "so với 4 bàn giờ thấp",
  },
}

export const MOCK_DAILY_REVENUE: DailyRevenueItem[] = [
  { day: "T2", fullDay: "Thứ 2", date: "2026-07-20", revenue: 4800000 },
  { day: "T3", fullDay: "Thứ 3", date: "2026-07-21", revenue: 6200000 },
  { day: "T4", fullDay: "Thứ 4", date: "2026-07-22", revenue: 3900000 },
  { day: "T5", fullDay: "Thứ 5", date: "2026-07-23", revenue: 7900000 },
  { day: "T6", fullDay: "Thứ 6", date: "2026-07-24", revenue: 9300000 },
  {
    day: "T7",
    fullDay: "Thứ 7",
    date: "2026-07-25",
    revenue: 12437000,
  },
  { day: "CN", fullDay: "Chủ nhật", date: "2026-07-26", revenue: 7100000 },
]

export const MOCK_HOURLY_REVENUE: HourlyRevenueItem[] = [
  { hour: "8h", timeRange: "08:00 – 09:00", revenue: 580000 },
  { hour: "9h", timeRange: "09:00 – 10:00", revenue: 820000 },
  { hour: "10h", timeRange: "10:00 – 11:00", revenue: 980000 },
  { hour: "11h", timeRange: "11:00 – 12:00", revenue: 1950000 },
  {
    hour: "12h",
    timeRange: "12:00 – 13:00",
    revenue: 2600000,
    isPeakHour: true,
  },
  { hour: "13h", timeRange: "13:00 – 14:00", revenue: 2050000 },
  { hour: "14h", timeRange: "14:00 – 15:00", revenue: 1250000 },
  { hour: "15h", timeRange: "15:00 – 16:00", revenue: 850000 },
  { hour: "16h", timeRange: "16:00 – 17:00", revenue: 1020000 },
  { hour: "17h", timeRange: "17:00 – 18:00", revenue: 1650000 },
  {
    hour: "18h",
    timeRange: "18:00 – 19:00",
    revenue: 2750000,
    isPeakHour: true,
  },
  {
    hour: "19h",
    timeRange: "19:00 – 20:00",
    revenue: 2850000,
    isPeakHour: true,
  },
  {
    hour: "20h",
    timeRange: "20:00 – 21:00",
    revenue: 2450000,
    isPeakHour: true,
  },
  { hour: "21h", timeRange: "21:00 – 22:00", revenue: 1680000 },
  { hour: "22h", timeRange: "22:00 – 23:00", revenue: 1100000 },
  { hour: "23h", timeRange: "23:00 – 24:00", revenue: 620000 },
]

export const MOCK_BRANCH_COMPARISON: BranchComparisonItem[] = [
  {
    rank: 1,
    branchName: "Chi nhánh Quận 1",
    shortName: "Quận 1",
    revenue: 210480000,
    orderCount: 545,
    averagePerOrder: 385000,
    cancelRate: "1.8%",
    vsAverage: { value: "+18%", direction: "up" },
  },
  {
    rank: 2,
    branchName: "Chi nhánh Quận 3",
    shortName: "Quận 3",
    revenue: 175320000,
    orderCount: 470,
    averagePerOrder: 372000,
    cancelRate: "2.1%",
    vsAverage: { value: "+5%", direction: "up" },
  },
  {
    rank: 3,
    branchName: "Chi nhánh Thủ Đức",
    shortName: "Thủ Đức",
    revenue: 95140000,
    orderCount: 310,
    averagePerOrder: 306000,
    cancelRate: "6.4%",
    isCancelRateHigh: true,
    vsAverage: { value: "-38%", direction: "down" },
  },
]

export const MOCK_COMPARE_METRICS = [
  { value: "revenue", label: "Theo doanh thu" },
  { value: "orders", label: "Theo số hóa đơn" },
  { value: "cancelRate", label: "Theo tỷ lệ hủy" },
]

export const MOCK_TOP_SELLING_DISHES: TopSellingDishItem[] = [
  {
    rank: 1,
    dishName: "Phở bò tái nạm",
    quantity: 48,
    totalAmount: 3120000,
  },
  {
    rank: 2,
    dishName: "Bún chả Hà Nội",
    quantity: 35,
    totalAmount: 2450000,
  },
  {
    rank: 3,
    dishName: "Cơm tấm sườn bì",
    quantity: 29,
    totalAmount: 2175000,
  },
  {
    rank: 4,
    dishName: "Gỏi cuốn tôm thịt",
    quantity: 41,
    totalAmount: 1845000,
  },
]

export const MOCK_BRANCHES: BranchOption[] = [
  { id: 1, name: "Chi nhánh Quận 1", code: "CN-Q1" },
  { id: 2, name: "Chi nhánh Quận 3", code: "CN-Q3" },
  { id: 3, name: "Chi nhánh Thủ Đức", code: "CN-TD" },
]

export const MOCK_TIME_RANGES: TimeRangeOption[] = [
  { value: "today", label: "Hôm nay" },
  { value: "yesterday", label: "Hôm qua" },
  { value: "7days", label: "7 ngày qua" },
  { value: "30days", label: "30 ngày qua" },
  { value: "thisMonth", label: "Tháng này" },
]
