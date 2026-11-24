/**
 * TS mirror của các enum trong backend (com.booking.backendbookingservice.enums.*)
 *
 * Quy ước: BE lưu enum dưới dạng số nguyên trong DB (AbstractEnumConverter) nhưng
 * serialize ra JSON dưới dạng TÊN enum (string). FE luôn làm việc với string union
 * bên dưới, đúng với những gì API trả về. Giá trị số gốc được ghi lại trong comment
 * để đối chiếu khi cần debug dữ liệu thô / seed dữ liệu.
 */

// AccountStatus.java — INACTIVE(0), ACTIVE(1)
export const ACCOUNT_STATUS = ["INACTIVE", "ACTIVE"] as const
export type AccountStatus = (typeof ACCOUNT_STATUS)[number]

// ApplyLevel.java — ITEM(1), INVOICE(2)
export const APPLY_LEVEL = ["ITEM", "INVOICE"] as const
export type ApplyLevel = (typeof APPLY_LEVEL)[number]

// AreaStatus.java — INACTIVE(0), ACTIVE(1)
export const AREA_STATUS = ["INACTIVE", "ACTIVE"] as const
export type AreaStatus = (typeof AREA_STATUS)[number]

// BranchStatus.java — INACTIVE(0), ACTIVE(1)
export const BRANCH_STATUS = ["INACTIVE", "ACTIVE"] as const
export type BranchStatus = (typeof BRANCH_STATUS)[number]

// CategoryStatus.java — INACTIVE(0), ACTIVE(1)
export const CATEGORY_STATUS = ["INACTIVE", "ACTIVE"] as const
export type CategoryStatus = (typeof CATEGORY_STATUS)[number]

// DiningTableStatus.java — INACTIVE(0), AVAILABLE(1), OCCUPIED(2), RESERVED(3)
// LƯU Ý: BE chỉ có đúng 4 giá trị này. "Chờ mở bàn" / "Chờ thanh toán" KHÔNG
// phải trạng thái của bàn (DiningTable) mà là trạng thái của PHIÊN BÀN
// (TableSessionStatus.WAITING_FOR_OPEN / WAITING_FOR_PAY bên dưới). FE trước đây
// nhầm 2 khái niệm này — xem `TableDisplayStatus` + `TABLE_DISPLAY_STATUS_LABEL`
// bên dưới để biết cách suy ra trạng thái hiển thị mở rộng.
export const DINING_TABLE_STATUS = ["INACTIVE", "AVAILABLE", "OCCUPIED", "RESERVED"] as const
export type DiningTableStatus = (typeof DINING_TABLE_STATUS)[number]

// CancelReason.java — RESTAURANT_ERROR(0), CUSTOMER_CHANGED_MIND(1)
// Dùng khi huỷ món SAU khi đã vào bếp (POST /order-details/{id}/cancel-after-kitchen)
export const CANCEL_REASON = ["RESTAURANT_ERROR", "CUSTOMER_CHANGED_MIND"] as const
export type CancelReason = (typeof CANCEL_REASON)[number]

// DiscountType.java — PERCENTAGE(1), FIXED_AMOUNT(2)
export const DISCOUNT_TYPE = ["PERCENTAGE", "FIXED_AMOUNT"] as const
export type DiscountType = (typeof DISCOUNT_TYPE)[number]

// InvoiceStatus.java — PENDING(0), PAID(1), CANCELLED(2), REFUNDED(3), ISSUED(4)
// ISSUED = đã phát hành HĐĐT lên cơ quan thuế. Trước đây FE THIẾU giá trị này, trong khi
// `GET /invoices/branch/{id}` vẫn trả về — nên mọi so sánh với "ISSUED" đều bị TS báo lỗi.
export const INVOICE_STATUS = ["PENDING", "PAID", "ISSUED", "CANCELLED", "REFUNDED"] as const
export type InvoiceStatus = (typeof INVOICE_STATUS)[number]

// DishStatus.java — INACTIVE(0), ACTIVE(1)
// LƯU Ý: FE trước đây gọi entity/enum này là "Menu" (Menu.java) — BE thực tế KHÔNG có
// class Menu.java, entity thật tên là Dish (xem Phần 2.1 file phân tích). "Menu" trong FE
// từ nay chỉ còn dành cho khái niệm "thực đơn theo chi nhánh" (BranchMenuController).
export const DISH_STATUS = ["INACTIVE", "ACTIVE"] as const
export type DishStatus = (typeof DISH_STATUS)[number]

// OrderDetailStatus.java — PENDING(0), PREPARING(1), SERVED(2), CANCELLED(3), PENDING_WEIGHT(4)
// PENDING_WEIGHT: món bán theo cân, chờ nhân viên cân xong mới xác nhận số lượng/giá
// (POST /order-details/{id}/confirm-weight) — quan trọng cho bếp/KDS.
export const ORDER_DETAIL_STATUS = [
  "PENDING",
  "PREPARING",
  "SERVED",
  "CANCELLED",
  "PENDING_WEIGHT",
] as const
export type OrderDetailStatus = (typeof ORDER_DETAIL_STATUS)[number]

// OrderStatus.java — PENDING(0), CONFIRMED(1), COMPLETED(2), CANCELLED(3)
export const ORDER_STATUS = ["PENDING", "CONFIRMED", "COMPLETED", "CANCELLED"] as const
export type OrderStatus = (typeof ORDER_STATUS)[number]

// PaymentMethod.java — CASH(1), CARD(2), BANK_TRANSFER(3), E_WALLET(4)
export const PAYMENT_METHOD = ["CASH", "CARD", "BANK_TRANSFER", "E_WALLET"] as const
export type PaymentMethod = (typeof PAYMENT_METHOD)[number]

// PromotionStatus.java — INACTIVE(0), ACTIVE(1)
export const PROMOTION_STATUS = ["INACTIVE", "ACTIVE"] as const
export type PromotionStatus = (typeof PROMOTION_STATUS)[number]

// RestaurantStatus.java — INACTIVE(0), ACTIVE(1)
export const RESTAURANT_STATUS = ["INACTIVE", "ACTIVE"] as const
export type RestaurantStatus = (typeof RESTAURANT_STATUS)[number]

// RoleScope.java — PLATFORM(1), RESTAURANT(2), BRANCH(3)
export const ROLE_SCOPE = ["PLATFORM", "RESTAURANT", "BRANCH"] as const
export type RoleScope = (typeof ROLE_SCOPE)[number]

// SelectionType.java — REQUIRED(0), OPTIONAL(1)
// Kiểu chọn của 1 nhóm tùy chọn món (OptionGroup): bắt buộc chọn hay không.
export const SELECTION_TYPE = ["REQUIRED", "OPTIONAL"] as const
export type SelectionType = (typeof SELECTION_TYPE)[number]

// StockStatus.java — OUT_OF_STOCK(0), AVAILABLE(1)
// Thuộc cấp CHI NHÁNH (BranchDishStock), không phải cấp nhà hàng: cùng 1 món có thể
// còn ở chi nhánh này và hết ở chi nhánh khác.
export const STOCK_STATUS = ["OUT_OF_STOCK", "AVAILABLE"] as const
export type StockStatus = (typeof STOCK_STATUS)[number]

// TableSessionStatus.java — thực tế có 7 giá trị (BE KHÔNG bao giờ trả "OPEN"):
// WAITING_FOR_OPEN, SERVING, WAITING_FOR_PAY, CLOSED, CANCELLED, RESERVED, MERGED
export const TABLE_SESSION_STATUS = [
  "WAITING_FOR_OPEN",
  "SERVING",
  "WAITING_FOR_PAY",
  "CLOSED",
  "CANCELLED",
  "RESERVED",
  "MERGED",
] as const
export type TableSessionStatus = (typeof TABLE_SESSION_STATUS)[number]

/** Nhãn tiếng Việt hiển thị cho UI — dùng trong Badge/Chip, không dùng để so sánh logic. */
export const BRANCH_STATUS_LABEL: Record<BranchStatus, string> = {
  ACTIVE: "Hoạt động",
  INACTIVE: "Tạm nghỉ",
}

export const DINING_TABLE_STATUS_LABEL: Record<DiningTableStatus, string> = {
  INACTIVE: "Ngưng dùng",
  AVAILABLE: "Trống",
  OCCUPIED: "Đang phục vụ",
  RESERVED: "Đã đặt",
}

/**
 * ============================================================================
 * NHÃN TRẠNG THÁI — ĐỌC KỸ TRƯỚC KHI SỬA
 * ============================================================================
 * Đặc tả tách BẠCH hai khái niệm rất dễ nhầm (FR-SRV-01 ghi rõ yêu cầu này):
 *
 *   - PHIÊN BÀN (Mục 2.1) : CHỜ MỞ BÀN / ĐANG PHỤC VỤ / CHỜ THANH TOÁN / ...
 *   - DÒNG MÓN  (Mục 2.3) : CHỜ XÁC NHẬN / ĐANG CHẾ BIẾN / ĐÃ PHỤC VỤ / ...
 *
 * "Chờ mở bàn" là của PHIÊN BÀN (sơ đồ bàn). "Chờ xác nhận" là của DÒNG MÓN
 * (màn bếp / order). KHÔNG dùng lẫn: trước đây sơ đồ bàn hiển thị "Chờ xác nhận"
 * cho phiên bàn, gây hiểu nhầm giữa hai khái niệm khác hẳn nhau.
 *
 * Mọi nơi hiển thị nhãn phải lấy từ các map dưới đây, không viết chuỗi trực tiếp.
 */

/** Nhãn trạng thái DÒNG MÓN (Mục 2.3) — dùng ở màn bếp, order, món đã gọi. */
export const ORDER_DETAIL_STATUS_LABEL: Record<OrderDetailStatus, string> = {
  PENDING: "Chờ xác nhận",
  PREPARING: "Đang chế biến",
  SERVED: "Đã phục vụ",
  CANCELLED: "Đã huỷ",
  PENDING_WEIGHT: "Chờ cân",
}

/** Nhãn trạng thái PHIÊN BÀN (Mục 2.1) — dùng ở sơ đồ bàn, màn khách chờ mở bàn. */
export const TABLE_SESSION_STATUS_LABEL: Record<TableSessionStatus, string> = {
  WAITING_FOR_OPEN: "Chờ mở bàn",
  SERVING: "Đang phục vụ",
  WAITING_FOR_PAY: "Chờ thanh toán",
  CLOSED: "Đã đóng",
  CANCELLED: "Đã huỷ",
  RESERVED: "Đã đặt trước",
  MERGED: "Đã gộp bàn",
}

/**
 * Trạng thái HIỂN THỊ của thẻ bàn trên sơ đồ = `DiningTableStatus` (trạng thái vật lý
 * của bàn) mở rộng thêm mấy trạng thái suy ra từ phiên bàn. KHÔNG phải enum của backend.
 */
export type TableDisplayStatus = DiningTableStatus | "WAITING_OPEN" | "AWAITING_PAYMENT" | "MERGED"

/**
 * Nhãn cho thẻ bàn + legend + bộ lọc ở sơ đồ bàn.
 * Các trạng thái bắt nguồn từ phiên bàn lấy thẳng nhãn của phiên để không lệch chữ.
 */
export const TABLE_DISPLAY_STATUS_LABEL: Record<TableDisplayStatus, string> = {
  AVAILABLE: "Trống",
  INACTIVE: "Ngưng dùng",
  OCCUPIED: "Đang phục vụ",
  RESERVED: "Đặt trước",
  WAITING_OPEN: TABLE_SESSION_STATUS_LABEL.WAITING_FOR_OPEN,
  AWAITING_PAYMENT: TABLE_SESSION_STATUS_LABEL.WAITING_FOR_PAY,
  MERGED: "Đã gộp",
}

export const CANCEL_REASON_LABEL: Record<CancelReason, string> = {
  RESTAURANT_ERROR: "Lỗi từ nhà hàng",
  CUSTOMER_CHANGED_MIND: "Khách đổi ý",
}

export const INVOICE_STATUS_LABEL: Record<InvoiceStatus, string> = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  ISSUED: "Đã phát hành HĐĐT",
  CANCELLED: "Đã huỷ",
  REFUNDED: "Đã hoàn tiền",
}

export const PAYMENT_METHOD_LABEL: Record<PaymentMethod, string> = {
  CASH: "Tiền mặt",
  CARD: "Thẻ",
  BANK_TRANSFER: "Chuyển khoản",
  E_WALLET: "Ví điện tử",
}

export const STOCK_STATUS_LABEL: Record<StockStatus, string> = {
  AVAILABLE: "Còn hàng",
  OUT_OF_STOCK: "Hết hàng",
}

export const SELECTION_TYPE_LABEL: Record<SelectionType, string> = {
  REQUIRED: "Bắt buộc chọn",
  OPTIONAL: "Tùy chọn",
}
