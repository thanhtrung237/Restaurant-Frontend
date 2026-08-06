import type { StockStatus } from "../enums"

/**
 * Mirror của `BranchMenuItemResponse.java` — 1 dòng trong THỰC ĐƠN CỦA CHI NHÁNH.
 * Nguồn: `GET /branches/{branchId}/menu` và `GET /branches/{branchId}/menu/overview`.
 *
 * Đây là DTO dạng "view", KHÔNG phải entity: không có `id` riêng (khoá là `dishId`)
 * và không có timestamps.
 *
 * Đây chính là khái niệm "menu" đúng nghĩa ở hệ thống này (thực đơn theo chi nhánh),
 * khác với `Dish` (món gốc ở cấp nhà hàng).
 *
 * Về giá — BE đã resolve sẵn theo BR-17, FE chỉ việc hiển thị:
 * - `basePrice`      : giá gốc cấp nhà hàng
 * - `overridePrice`  : giá đè riêng của chi nhánh (null = không đè)
 * - `effectivePrice` : giá THỰC SỰ hiển thị cho khách → dùng field này
 * - `priceDifference`: chênh lệch gốc ↔ đè, phục vụ màn admin (FR-MNU-04)
 * - `hasOverride`    : chi nhánh có bản đè giá hay không
 *
 * `isHidden` = món bị ẩn tại chi nhánh này; `stockStatus` = còn/hết hàng tại chi nhánh
 * (FR-MNU-03); `isBranchSpecific` = món riêng của chi nhánh, không phải món gốc nhà hàng.
 */
export interface BranchMenuItem {
  dishId: number
  dishName: string
  description?: string
  imageUrl?: string
  kitchenStationType?: string
  soldByWeight?: boolean
  categoryId: number
  categoryName?: string
  basePrice: number // BigDecimal
  overridePrice?: number
  effectivePrice: number
  priceDifference?: number
  hasOverride: boolean
  isHidden: boolean
  stockStatus?: StockStatus
  isBranchSpecific: boolean
}
