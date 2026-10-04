/**
 * Kiểu dữ liệu cho form Tạo / Chỉnh sửa khuyến mãi (restaurant-admin)
 * Nguồn: QuanLy/Tạo khuyến mãi.png
 *
 * Nghiệp vụ BR-22 (Cấu hình điều kiện và hành động theo cấp MÓN / HÓA ĐƠN)
 */

export type PromotionApplyLevel = "dish" | "order"

export type PromotionTarget = "all_order" | "category" | "specific_dish"

export type PromotionActionType = "fixed_amount" | "percentage" | "gift_dish"

export interface PromotionFormData {
  // Thông tin chương trình
  name: string
  customerDescription: string
  applyLevel: PromotionApplyLevel
  code: string // Mã khuyến mãi
  usageLimit: string // Giới hạn lượt sử dụng (rỗng = không giới hạn)

  // Điều kiện áp dụng
  applyTarget: PromotionTarget
  selectedCategories: number[] // Danh mục được chọn khi applyTarget === "category"
  selectedDishes: number[] // Món được chọn khi applyTarget === "specific_dish"
  minOrderValue: string // Giá trị hóa đơn tối thiểu (chỉ cho cấp HÓA ĐƠN)
  minQuantity: string // Số lượng món tối thiểu (cho cấp MÓN)

  // Hành động
  actionType: PromotionActionType
  discountValue: string // % hoặc số tiền
  buyQty: string // X trong Mua X tặng Y
  getQty: string // Y trong Mua X tặng Y

  // Thời gian
  startDate: string // dd/MM/yyyy
  endDate: string // dd/MM/yyyy
  startTime: string // HH:mm
  endTime: string // HH:mm
  daysOfWeek: string[] // ["T2", "T3", "T4", "T5", "T6", "T7", "CN"]

  // Phạm vi & ưu tiên
  isAllBranches: boolean
  selectedBranchIds: number[]
  priority: string
  isActiveNow: boolean
}
