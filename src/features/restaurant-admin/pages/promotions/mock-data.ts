import type { PromotionItem } from "./types"

/**
 * Dữ liệu mẫu 5 chương trình khuyến mãi
 * Nguồn: QuanLy/Khuyến mãi.png
 */
export const MOCK_PROMOTIONS: PromotionItem[] = [
  {
    id: 1,
    name: "Combo trưa tiết kiệm",
    timeRange: "11:00–14:00 hằng ngày",
    type: "Giảm cố định",
    scope: "Toàn hệ thống",
    isSystemScope: true,
    condition: "Đơn ≥ 100.000đ",
    priority: 1,
    status: "RUNNING",
    isActive: true,
  },
  {
    id: 2,
    name: "Giảm 10% Khai vị",
    timeRange: "Cả ngày",
    type: "Giảm %",
    scope: "Toàn hệ thống",
    isSystemScope: true,
    condition: "Danh mục Khai vị",
    priority: 2,
    status: "RUNNING",
    isActive: true,
  },
  {
    id: 3,
    name: "Giảm 15% cuối tuần",
    timeRange: "Thứ 7 & CN",
    type: "Giảm %",
    scope: "2 chi nhánh",
    isSystemScope: false,
    condition: "Toàn đơn",
    priority: 2,
    status: "RUNNING",
    isActive: true,
  },
  {
    id: 4,
    name: "Mua 2 tặng 1 Trà tắc",
    timeRange: "17:00–19:00",
    type: "Tặng món",
    scope: "Chi nhánh Thủ Đức",
    isSystemScope: false,
    condition: "Món Trà tắc",
    priority: 3,
    status: "PAUSED",
    isActive: false,
  },
  {
    id: 5,
    name: "Ưu đãi khai trương",
    timeRange: "01/06 - 30/06",
    type: "Giảm %",
    scope: "Chi nhánh Q3",
    isSystemScope: false,
    condition: "Toàn đơn",
    priority: 1,
    status: "EXPIRED",
    isActive: true,
  },
]
