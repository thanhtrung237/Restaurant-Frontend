/**
 * Kiểu dữ liệu cho phân hệ Khuyến mãi (restaurant-admin)
 * Nguồn: QuanLy/Khuyến mãi.png
 */

export type PromotionTypeLabel = "Giảm cố định" | "Giảm %" | "Tặng món"

export type PromotionStatus = "RUNNING" | "PAUSED" | "EXPIRED"

export interface PromotionItem {
  id: number
  /** Tên chương trình khuyến mãi */
  name: string
  /** Thời gian áp dụng (hiển thị phụ đề nhỏ dưới tên) */
  timeRange: string
  /** Loại khuyến mãi (Giảm cố định / Giảm % / Tặng món) */
  type: PromotionTypeLabel
  /** Phạm vi áp dụng (Toàn hệ thống, 2 chi nhánh, Chi nhánh...) */
  scope: string
  /** Có phải phạm vi toàn hệ thống không (hiển thị màu nổi bật) */
  isSystemScope?: boolean
  /** Điều kiện áp dụng */
  condition: string
  /** Mức độ ưu tiên (hiển thị số trong badge tròn) */
  priority: number
  /** Trạng thái chương trình (Đang chạy / Tạm dừng / Hết hạn) */
  status: PromotionStatus
  /** Trạng thái bật/tắt (Switch thao tác) */
  isActive: boolean
}
