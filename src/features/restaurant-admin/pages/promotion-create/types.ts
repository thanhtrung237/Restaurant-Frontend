/**
 * Kiểu dữ liệu cho form Tạo khuyến mãi (restaurant-admin)
 * Nguồn: QuanLy/Tạo khuyến mãi.png
 */

export type PromotionApplyLevel = "dish" | "order"

export type PromotionTarget = "all_order" | "category" | "specific_dish"

export type PromotionActionType = "fixed_amount" | "percentage" | "gift_dish"

export interface PromotionFormData {
  // Thông tin chương trình
  name: string
  customerDescription: string
  applyLevel: PromotionApplyLevel

  // Điều kiện áp dụng
  applyTarget: PromotionTarget
  minOrderValue: string
  minQuantity: string

  // Hành động
  actionType: PromotionActionType
  discountValue: string

  // Thời gian
  startDate: string
  endDate: string
  startTime: string
  endTime: string
  daysOfWeek: string[] // ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

  // Phạm vi & ưu tiên
  isAllBranches: boolean
  selectedBranches: string[]
  priority: string
  isActiveNow: boolean
}
