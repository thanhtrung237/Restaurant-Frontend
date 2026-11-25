/**
 * Format số thành tiền tệ VND
 * @param value - Số tiền cần format (number hoặc string từ backend BigDecimal)
 * @returns Chuỗi tiền tệ đã được format (VD: "100.000 ₫")
 */
export function formatCurrency(value: number | string): string {
  const numValue = typeof value === "string" ? parseFloat(value) : value
  return new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND",
  }).format(numValue)
}

/**
 * Format số thành phần trăm
 * @param value - Số cần format (0-1 hoặc 0-100)
 * @param decimals - Số chữ số thập phân (mặc định 0)
 * @returns Chuỗi phần trăm đã được format (VD: "15%")
 */
export function formatPercent(value: number, decimals: number = 0): string {
  return `${value.toFixed(decimals)}%`
}

/**
 * Format số với dấu phân cách hàng nghìn
 * @param value - Số cần format
 * @returns Chuỗi số đã được format (VD: "1.000.000")
 */
export function formatNumber(value: number): string {
  return new Intl.NumberFormat("vi-VN").format(value)
}

import {
  startOfDay,
  endOfDay,
  subDays,
  startOfMonth,
  endOfMonth,
  format as formatDate,
} from "date-fns"

// Import HourSlot type for findPeakHours
import type { HourSlot } from "@/types/models/reports"

/**
 * Tính toán xu hướng tăng trưởng giữa hai giá trị
 * @param current - Giá trị hiện tại
 * @param previous - Giá trị kỳ trước
 * @returns Object chứa giá trị phần trăm đã format và hướng tăng trưởng
 */
export function computeGrowthTrend(
  current: number,
  previous: number,
): { value: string; direction: "up" | "down" | "neutral" } {
  // Handle division by zero
  if (previous === 0) {
    return { value: "N/A", direction: "neutral" }
  }

  const percentChange = ((current - previous) / previous) * 100

  let direction: "up" | "down" | "neutral"
  if (percentChange > 0) {
    direction = "up"
  } else if (percentChange < 0) {
    direction = "down"
  } else {
    direction = "neutral"
  }

  const formattedValue =
    percentChange > 0 ? `+${percentChange.toFixed(1)}%` : `${percentChange.toFixed(1)}%`

  return { value: formattedValue, direction }
}

/**
 * Tìm khung giờ cao điểm từ dữ liệu theo giờ
 * @param hourlySlots - Mảng dữ liệu doanh thu theo từng giờ
 * @returns Object chứa thông tin khung giờ cao điểm
 */
export function findPeakHours(hourlySlots: HourSlot[]): {
  hours: string
  totalRevenue: string
  maxTables: number
  peakPercentage: string
} {
  if (hourlySlots.length === 0) {
    return {
      hours: "N/A",
      totalRevenue: "0",
      maxTables: 0,
      peakPercentage: "0%",
    }
  }

  // Sort by revenue DESC
  const sortedSlots = [...hourlySlots].sort((a, b) => {
    const revenueA = parseFloat(a.revenue)
    const revenueB = parseFloat(b.revenue)
    return revenueB - revenueA
  })

  // Take top 3-4 slots for peak hours
  const topSlots = sortedSlots.slice(0, Math.min(4, sortedSlots.length))

  // Sort by hour to find consecutive range
  const topSlotsSortedByHour = topSlots.sort((a, b) => a.hour - b.hour)

  // Get hour range
  const minHour = topSlotsSortedByHour[0].hour
  const maxHour = topSlotsSortedByHour[topSlotsSortedByHour.length - 1].hour
  const hoursRange = `${minHour}h – ${maxHour}h`

  // Sum revenue for peak hours
  const totalPeakRevenue = topSlots.reduce((sum, slot) => {
    return sum + parseFloat(slot.revenue)
  }, 0)

  // Find max table count among peak hours
  const maxTables = Math.max(...topSlots.map((slot) => slot.tableCount))

  // Calculate total daily revenue
  const totalDailyRevenue = hourlySlots.reduce((sum, slot) => {
    return sum + parseFloat(slot.revenue)
  }, 0)

  // Compute peak percentage
  const peakPercentage =
    totalDailyRevenue > 0 ? ((totalPeakRevenue / totalDailyRevenue) * 100).toFixed(1) + "%" : "0%"

  return {
    hours: hoursRange,
    totalRevenue: formatCurrency(totalPeakRevenue),
    maxTables,
    peakPercentage,
  }
}

/**
 * Format Date object thành chuỗi ISO phù hợp với backend LocalDateTime
 * @param date - Date object cần format
 * @returns Chuỗi ISO format 'YYYY-MM-DDTHH:mm:ss' (không có Z suffix)
 */
export function formatISODateForAPI(date: Date): string {
  return formatDate(date, "yyyy-MM-dd'T'HH:mm:ss")
}

/**
 * Lấy khoảng thời gian từ giá trị filter
 * @param filterValue - Giá trị filter ('today', 'yesterday', '7days', '30days', 'thisMonth')
 * @returns Object chứa from và to timestamp dạng ISO string
 */
export function getDateRangeForFilter(filterValue: string): {
  from: string
  to: string
} {
  const now = new Date()

  switch (filterValue) {
    case "today": {
      const start = startOfDay(now)
      const end = endOfDay(now)
      return {
        from: formatISODateForAPI(start),
        to: formatISODateForAPI(end),
      }
    }

    case "yesterday": {
      const yesterday = subDays(now, 1)
      const start = startOfDay(yesterday)
      const end = endOfDay(yesterday)
      return {
        from: formatISODateForAPI(start),
        to: formatISODateForAPI(end),
      }
    }

    case "7days": {
      const sevenDaysAgo = subDays(now, 7)
      const start = startOfDay(sevenDaysAgo)
      const end = endOfDay(now)
      return {
        from: formatISODateForAPI(start),
        to: formatISODateForAPI(end),
      }
    }

    case "30days": {
      const thirtyDaysAgo = subDays(now, 30)
      const start = startOfDay(thirtyDaysAgo)
      const end = endOfDay(now)
      return {
        from: formatISODateForAPI(start),
        to: formatISODateForAPI(end),
      }
    }

    case "thisMonth": {
      const start = startOfMonth(now)
      const end = endOfMonth(now)
      return {
        from: formatISODateForAPI(start),
        to: formatISODateForAPI(end),
      }
    }

    default: {
      // Default to today
      const start = startOfDay(now)
      const end = endOfDay(now)
      return {
        from: formatISODateForAPI(start),
        to: formatISODateForAPI(end),
      }
    }
  }
}
