/**
 * Helper functions để chuyển đổi format dữ liệu khuyến mãi
 * giữa dạng hiển thị (UI) và dạng API
 */

import type { Promotion } from "@/types/models"

// ==================== Ngày tháng ====================

/**
 * Chuyển đổi từ định dạng hiển thị sang API
 * @param ddmmyyyy - "01/07/2026"
 * @returns "2026-07-01"
 */
export function formatDateForApi(ddmmyyyy: string): string {
  if (!ddmmyyyy || !ddmmyyyy.includes("/")) return ""
  const [day, month, year] = ddmmyyyy.split("/")
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`
}

/**
 * Chuyển đổi từ API sang định dạng hiển thị
 * @param isoDate - "2026-07-01"
 * @returns "01/07/2026"
 */
export function formatDateForDisplay(isoDate: string): string {
  if (!isoDate) return ""
  const [year, month, day] = isoDate.split("-")
  return `${day}/${month}/${year}`
}

// ==================== Tiền tệ ====================

/**
 * Chuyển đổi từ định dạng hiển thị sang API
 * @param displayMoney - "100.000đ" hoặc "100,000" hoặc "100000"
 * @returns 100000
 */
export function formatMoneyForApi(displayMoney: string): number {
  if (!displayMoney) return 0
  // Loại bỏ tất cả ký tự không phải số
  const cleanStr = displayMoney.replace(/[^\d]/g, "")
  return Number.parseInt(cleanStr, 10) || 0
}

/**
 * Chuyển đổi từ API sang định dạng hiển thị
 * @param amount - 100000
 * @returns "100.000đ"
 */
export function formatMoneyForDisplay(amount: number): string {
  if (!amount) return "0đ"
  return amount.toLocaleString("vi-VN") + "đ"
}

// ==================== Thứ trong tuần ====================

const DAY_MAP: Record<string, string> = {
  T2: "MON",
  T3: "TUE",
  T4: "WED",
  T5: "THU",
  T6: "FRI",
  T7: "SAT",
  CN: "SUN",
}

const REVERSE_DAY_MAP: Record<string, string> = {
  MON: "T2",
  TUE: "T3",
  WED: "T4",
  THU: "T5",
  FRI: "T6",
  SAT: "T7",
  SUN: "CN",
}

/**
 * Chuyển đổi từ định dạng hiển thị sang API
 * @param days - ["T2", "T3", "T4"]
 * @returns "MON,TUE,WED"
 */
export function formatDaysOfWeekForApi(days: string[]): string {
  if (!days || days.length === 0) return ""
  return days.map((d) => DAY_MAP[d] || d).join(",")
}

/**
 * Chuyển đổi từ API sang định dạng hiển thị
 * @param daysStr - "MON,TUE,WED"
 * @returns ["T2", "T3", "T4"]
 */
export function parseDaysOfWeekFromApi(daysStr: string): string[] {
  if (!daysStr) return []
  return daysStr.split(",").map((d) => REVERSE_DAY_MAP[d.trim()] || d.trim())
}

// ==================== Khung giờ ====================

/**
 * Chuyển đổi từ hai ô giờ thành chuỗi khung giờ
 * @param start - "11:00"
 * @param end - "14:00"
 * @returns "11:00-14:00" hoặc "" nếu cả hai rỗng
 */
export function formatTimeWindowForApi(start: string, end: string): string {
  const from = normalizePromotionTime(start)
  const to = normalizePromotionTime(end)
  if (!from && !to) return ""
  return `${from || "00:00"}-${to || "23:59"}`
}

function normalizePromotionTime(value: string): string {
  const time = value.trim()
  if (/^\d{1,2}$/.test(time)) return `${time.padStart(2, "0")}:00`
  if (/^\d:\d{2}$/.test(time)) return `0${time}`
  return time
}

/**
 * Chuyển đổi từ chuỗi khung giờ sang hai ô
 * @param timeWindow - "11:00-14:00"
 * @returns ["11:00", "14:00"]
 */
export function parseTimeWindowFromApi(timeWindow: string): [string, string] {
  if (!timeWindow || !timeWindow.includes("-")) return ["", ""]
  const [start, end] = timeWindow.split("-")
  return [normalizePromotionTime(start), normalizePromotionTime(end)]
}

// ==================== Trạng thái hiển thị ====================

export type PromotionDisplayStatus = "RUNNING" | "PAUSED" | "EXPIRED" | "OUT_OF_USES"

export interface PromotionDisplayInfo {
  status: PromotionDisplayStatus
  label: string
  color: string
  bgColor: string
}

/**
 * Tính trạng thái hiển thị của khuyến mãi dựa trên nhiều yếu tố
 */
export function getPromotionDisplayStatus(promotion: Promotion): PromotionDisplayInfo {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const endDate = new Date(promotion.endDate)
  endDate.setHours(23, 59, 59, 999)

  // Hết hạn
  if (endDate < today) {
    return {
      status: "EXPIRED",
      label: "Hết hạn",
      color: "text-text-tertiary",
      bgColor: "bg-surface-muted",
    }
  }

  // Hết lượt
  if (
    promotion.usageLimit != null &&
    promotion.usageCount != null &&
    promotion.usageCount >= promotion.usageLimit
  ) {
    return {
      status: "OUT_OF_USES",
      label: "Hết lượt",
      color: "text-red-600",
      bgColor: "bg-red-50",
    }
  }

  // Tạm dừng
  if (promotion.status === "INACTIVE") {
    return {
      status: "PAUSED",
      label: "Tạm dừng",
      color: "text-yellow-600",
      bgColor: "bg-yellow-50",
    }
  }

  // Đang chạy
  return {
    status: "RUNNING",
    label: "Đang chạy",
    color: "text-green-600",
    bgColor: "bg-green-50",
  }
}

// ==================== Định dạng lượt sử dụng ====================

/**
 * Định dạng hiển thị lượt sử dụng
 * @param usageCount - Số lượt đã dùng
 * @param usageLimit - Giới hạn (null = không giới hạn)
 * @returns "5 / 100" hoặc "5 / ∞"
 */
export function formatUsageDisplay(usageCount?: number, usageLimit?: number | null): string {
  const count = usageCount ?? 0
  const limit = usageLimit == null ? "∞" : usageLimit.toString()
  return `${count} / ${limit}`
}

// ==================== Validation ====================

/**
 * Kiểm tra ngày hợp lệ (định dạng dd/MM/yyyy)
 */
export function isValidDateFormat(date: string): boolean {
  if (!date) return false
  const regex = /^\d{2}\/\d{2}\/\d{4}$/
  if (!regex.test(date)) return false

  const [day, month, year] = date.split("/").map(Number)
  const dateObj = new Date(year, month - 1, day)

  return (
    dateObj.getFullYear() === year && dateObj.getMonth() === month - 1 && dateObj.getDate() === day
  )
}

/**
 * Kiểm tra ngày kết thúc sau ngày bắt đầu
 */
export function isEndDateAfterStartDate(startDate: string, endDate: string): boolean {
  const start = new Date(formatDateForApi(startDate))
  const end = new Date(formatDateForApi(endDate))
  return end >= start
}

export function formatPromotionBriefRule(promo: Promotion): string {
  const isDish = promo.applyLevel === "ITEM"
  let actionText = ""
  let conditionText = ""

  if (promo.action) {
    try {
      const act = JSON.parse(promo.action)
      const type = act.type || act.actionType
      if (type === "percentage") {
        const val = act.value ?? act.discountPercent ?? 0
        actionText = `Giảm ${val}%`
      } else if (type === "gift_dish") {
        actionText = `Mua ${act.buyQty || 2} tặng ${act.getQty || 1}`
      } else {
        const val = Number(act.value ?? act.discountAmount ?? 0)
        actionText = val > 0 ? `Giảm ${val.toLocaleString("vi-VN")}đ` : "Giảm giá"
      }
    } catch {
      actionText = ""
    }
  }

  if (promo.condition) {
    try {
      const cond = JSON.parse(promo.condition)
      if (isDish) {
        if (
          cond.target === "category" &&
          Array.isArray(cond.categoryIds) &&
          cond.categoryIds.length > 0
        ) {
          conditionText = `${cond.categoryIds.length} danh mục`
        } else if (
          cond.target === "specific_dish" &&
          Array.isArray(cond.dishIds) &&
          cond.dishIds.length > 0
        ) {
          conditionText = `${cond.dishIds.length} món cụ thể`
        } else {
          conditionText = "Tất cả món"
        }
        const minQ = cond.minQty || cond.minQuantity
        if (minQ && minQ > 1) {
          conditionText += ` (từ ${minQ} món)`
        }
      } else {
        const minOrder = cond.minOrderValue || cond.minTotal
        if (minOrder && Number(minOrder) > 0) {
          conditionText = `Đơn từ ${Number(minOrder).toLocaleString("vi-VN")}đ`
        } else {
          conditionText = "Toàn hóa đơn"
        }
      }
    } catch {
      conditionText = ""
    }
  }

  if (actionText && conditionText) {
    return `${actionText} · ${conditionText}`
  }
  return actionText || conditionText || (isDish ? "Khuyến mãi món" : "Khuyến mãi hóa đơn")
}
