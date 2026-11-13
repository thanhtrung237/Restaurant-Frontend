/**
 * TS mirror của toàn bộ `dtos/request/**` phía backend (body gửi lên khi POST/PUT).
 *
 * Quy ước dịch kiểu:
 * - `BigDecimal` → `number`
 * - `LocalDate`     → `string` dạng `"YYYY-MM-DD"`
 * - `LocalTime`     → `string` dạng `"HH:mm:ss"`
 * - `LocalDateTime` → `string` ISO, vd `"2026-01-01T19:00:00"`
 * - Field có `@NotNull`/`@NotBlank` ở BE → bắt buộc; còn lại → optional.
 *
 * Nhiều endpoint nhận tham số qua **query string** chứ không qua body
 * (vd đổi trạng thái: `PUT /dishes/{id}/status?status=ACTIVE`). Các trường hợp đó
 * không có DTO ở đây mà nằm ở tham số hàm trong `src/api/*.api.ts`.
 */
import type {
  AccountStatus, ApplyLevel, BranchStatus, CancelReason, CategoryStatus,
  DiscountType, DishStatus, PaymentMethod, PromotionStatus, RoleScope, SelectionType,
} from "../enums"

// ---------------------------------------------------------------- Auth
/** `POST /auth/login`. Platform Admin để restaurantCode = null, nhân viên nhà hàng bắt buộc. */
export interface LoginRequest {
  restaurantCode: string | null
  username: string
  password: string
  deviceInfo?: string
}

// ---------------------------------------------------------------- Account
export interface AccountAddRequest {
  restaurantId: number
  fullName: string
  username: string
  password: string
  email?: string
  /**
   * QĐ-03: mã nhân viên do BACKEND sinh (NV + số tăng dần theo nhà hàng). Không có trong
   * request nữa — gửi lên cũng bị bỏ qua. Mã do BE trả về trong `AccountResponse`.
   */
}
export interface AccountUpdateRequest {
  fullName?: string
  email?: string
}

// ---------------------------------------------------------------- Assignment
export interface AssignmentAddRequest {
  accountId: number
  roleId: number
  /** Bỏ trống với role cấp nhà hàng/nền tảng. */
  branchId?: number
}

// ---------------------------------------------------------------- Role
export interface RoleAddRequest {
  restaurantId: number
  name: string
  code: string
  scope: RoleScope
}
export interface RoleUpdateRequest {
  name?: string
  scope?: RoleScope
}

// ---------------------------------------------------------------- Restaurant
export interface RestaurantAddRequest {
  code: string
  name: string
  taxCode?: string
  address?: string
  phone?: string
  logoUrl?: string
}
export interface RestaurantUpdateRequest {
  name?: string
  taxCode?: string
  address?: string
  phone?: string
  logoUrl?: string
  status?: import("../enums").RestaurantStatus
}

// ---------------------------------------------------------------- Branch
export interface BranchAddRequest {
  restaurantId: number
  code: string
  name: string
  address?: string
  phone?: string
  openingTime?: string
  closingTime?: string
  businessDayStartTime?: string
  taxCode?: string
  bankAccountNo?: string
  serviceFeeRate?: number
  vatRate?: number
}
export interface BranchUpdateRequest {
  name?: string
  address?: string
  phone?: string
  openingTime?: string
  closingTime?: string
  businessDayStartTime?: string
  taxCode?: string
  bankAccountNo?: string
  serviceFeeRate?: number
  vatRate?: number
  status?: BranchStatus
}
/**
 * `PUT /branches/{id}/config/manager` — phần cấu hình Quản lý chi nhánh được sửa.
 * LƯU Ý: `bankName` chỉ sửa được ở đây (BranchAddRequest/BranchUpdateRequest không có).
 */
export interface BranchManagerConfigRequest {
  openingTime?: string
  closingTime?: string
  /**
   * 3 trường dưới đây nhận `null` = XOÁ TRẮNG cấu hình; bỏ hẳn field = giữ nguyên
   * giá trị cũ. Backend phân biệt hai trường hợp này (be-issues mục 7).
   */
  businessDayStartTime?: string | null
  bankAccountNo?: string | null
  bankName?: string | null
  pendingConfirmTimeoutMinutes?: number
  reservationHoldMinutes?: number
}
/** `PUT /branches/{id}/config/admin` — phần chỉ Quản trị nhà hàng được sửa (thuế/phí/ngưỡng duyệt). */
export interface BranchAdminConfigRequest {
  latitude?: number
  longitude?: number
  geofenceEnabled?: boolean
  geofenceRadiusMeters?: number
  geofenceMaxAccuracyMeters?: number
  vatRate?: number
  serviceFeeRate?: number
  vatAppliedOnServiceFee?: boolean
  discountApprovalThreshold?: number
  taxCode?: string
}
/** `POST /branches/{id}/copy-config` — copy cấu hình TỪ `sourceBranchId` SANG chi nhánh `{id}`. */
export interface BranchCopyConfigRequest {
  sourceBranchId: number
  copyOpeningHours?: boolean
  copyFeeRates?: boolean
  copyBankInfo?: boolean
}

// ---------------------------------------------------------------- Area
export interface AreaAddRequest {
  branchId: number
  name: string
}
export interface AreaUpdateRequest {
  name?: string
}

// ---------------------------------------------------------------- DiningTable
export interface DiningTableAddRequest {
  branchId: number
  name: string
  areaId?: number
  capacity?: number
  qrCode?: string
}
export interface DiningTableUpdateRequest {
  areaId?: number
  name?: string
  capacity?: number
  qrCode?: string
}
/** `POST /tables/{id}/reserve` — đặt bàn trước ở cấp BÀN (khác với đặt qua TableSession). */
export interface DiningTableReservationRequest {
  branchId: number
  customerName?: string
  customerPhone?: string
  guestCount?: number
  reservationTime?: string
  note?: string
}

// ---------------------------------------------------------------- Category
export interface CategoryAddRequest {
  restaurantId: number
  name: string
  displayOrder?: number
}
export interface CategoryUpdateRequest {
  name?: string
  displayOrder?: number
  status?: CategoryStatus
}

// ---------------------------------------------------------------- Dish
export interface DishAddRequest {
  restaurantId: number
  categoryId: number
  name: string
  basePrice: number
  /** Chỉ set khi tạo món RIÊNG của 1 chi nhánh; món dùng chung để trống. */
  branchId?: number
  taxGroup?: string
  kitchenStationType?: string
  imageUrl?: string
  soldByWeight?: boolean
  description?: string
}
export interface DishUpdateRequest {
  categoryId?: number
  name?: string
  basePrice?: number
  taxGroup?: string
  kitchenStationType?: string
  imageUrl?: string
  soldByWeight?: boolean
  status?: DishStatus
  description?: string
}

// ---------------------------------------------------------------- DishOverride
export interface DishOverrideAddRequest {
  branchId: number
  dishId: number
  overridePrice?: number
  isHidden?: boolean
}
export interface DishOverrideUpdateRequest {
  overridePrice?: number
  isHidden?: boolean
}

// ---------------------------------------------------------------- Option groups / items
export interface OptionGroupAddRequest {
  restaurantId: number
  name: string
  selectionType: SelectionType
  minSelect?: number
  maxSelect?: number
}
export interface OptionGroupUpdateRequest {
  name?: string
  selectionType?: SelectionType
  minSelect?: number
  maxSelect?: number
}
export interface OptionItemAddRequest {
  optionGroupId: number
  name: string
  /** BE mặc định 0 nếu không gửi. */
  extraPrice?: number
}
export interface OptionItemUpdateRequest {
  name?: string
  extraPrice?: number
}
/** `POST /dish-option-groups` — gắn 1 nhóm tuỳ chọn vào 1 món. */
export interface DishOptionGroupAddRequest {
  dishId: number
  optionGroupId: number
}

// ---------------------------------------------------------------- TableSession
/**
 * `POST /table-sessions` — luồng CHÍNH.
 * Chỉ cần `tableId` để mở phiên ngay (phiên vào trạng thái WAITING_FOR_OPEN).
 */
export interface TableSessionCreateRequest {
  tableId: number
  /** Số khách khách tự chọn khi quét QR (luồng WAITING_FOR_OPEN). */
  guestCount?: number
}
/**
 * `POST /table-sessions/reserve` — đặt bàn trước (FR-TBL-03).
 * Tạo phiên RESERVED với đầy đủ thông tin khách.
 */
export interface TableSessionReservationRequest {
  tableId: number
  reservationName: string
  reservationPhone: string
  reservationTime: string // LocalDateTime
  guestCount?: number
  reservationNote?: string
}
/** `POST /table-sessions/{id}/confirm-open` — Phục vụ xác nhận mở bàn cho khách. */
export interface TableSessionConfirmOpenRequest {
  guestCount?: number
  note?: string
}
/** `POST /table-sessions/{id}/cancel-reservation` — body optional ở BE. */
export interface TableSessionCancelReservationRequest {
  reason?: string
}
/**
 * `POST /table-sessions/legacy` — mở bàn thẳng, bỏ qua bước chờ xác nhận.
 * Dùng khi nhân viên tự mở bàn tại quầy, không phải khách quét QR.
 */
export interface TableSessionOpenRequest {
  tableId: number
  guestCount?: number
  note?: string
  coverFeePerGuestAtOpen?: number
  customerIdRef?: string
}
export interface TableSessionUpdateRequest {
  guestCount?: number
  note?: string
  customerIdRef?: string
}
/** `POST /table-sessions/{id}/transfer` — Chuyển bàn (FR-SRV-06, BR-28). */
export interface TableSessionTransferRequest {
  targetTableId: number
}
/** `POST /table-sessions/merge` — Gộp bàn (FR-SRV-06, BR-26, BR-28). */
export interface TableSessionMergeRequest {
  sourceSessionId: number
  targetSessionId: number
}

// ---------------------------------------------------------------- Order
/** 1 dòng món khi gửi order. LƯU Ý: field là `dishId`, KHÔNG phải `menuId`. */
export interface OrderDetailAddRequest {
  dishId: number
  quantity: number
  promotionId?: number
  /** Chỉ dùng cho món bán theo cân. */
  weightKg?: number
  isTakeAway?: boolean
  note?: string
}
/** `POST /orders`. LƯU Ý: danh sách món tên là `items`, KHÔNG phải `orderDetails`. */
export interface OrderAddRequest {
  tableSessionId: number
  items: OrderDetailAddRequest[]
  /** Null khi khách tự gọi qua QR; có giá trị khi nhân viên gọi hộ. */
  orderedById?: number
  note?: string
}
export interface OrderUpdateRequest {
  note?: string
}

// ---------------------------------------------------------------- OrderDetail
export interface OrderDetailUpdateRequest {
  quantity?: number
  weightKg?: number
  isTakeAway?: boolean
  note?: string
}
/** `POST /order-details/{id}/confirm-weight` — bếp cân xong món bán theo cân. */
export interface OrderDetailConfirmWeightRequest {
  weightKg: number
}
/** `POST /order-details/{id}/cancel-after-kitchen` — huỷ món ĐÃ vào bếp, bắt buộc có lý do. */
export interface OrderDetailCancelRequest {
  cancelReason: CancelReason
}
/** `POST /order-details/batch-confirm` — xác nhận nhiều món cùng lúc (chuyển sang PREPARING). */
export interface OrderDetailBatchConfirmRequest {
  orderDetailIds: number[]
}

// ---------------------------------------------------------------- Invoice / Payment / Discount
/** `POST /invoices` — chốt hoá đơn cho 1 PHIÊN BÀN (không phải cho 1 order). */
export interface InvoiceCreateRequest {
  branchId: number
  tableSessionId: number
  promotionId?: number
  invoiceNote?: string
}
export interface PaymentAddRequest {
  invoiceId: number
  method: PaymentMethod
  amount: number
  transactionRef?: string
  /** Tiền khách đưa (tiền mặt) — BE tự tính `changeAmount` trả về. */
  amountTendered?: number
}
/** `POST /manual-discounts` — gắn vào `orderId` HOẶC `invoiceId` (một trong hai). */
export interface ManualDiscountAddRequest {
  type: DiscountType
  value: number
  reason: string
  orderId?: number
  invoiceId?: number
}

// ---------------------------------------------------------------- Promotion
export interface PromotionAddRequest {
  restaurantId: number
  name: string
  startDate: string
  endDate: string
  applyLevel: ApplyLevel
  description?: string
  timeWindow?: string
  daysOfWeek?: string
  condition?: string
  action?: string
  priority?: number
  code?: string
  usageLimit?: number
  allBranches?: boolean
  branchIds?: number[]
  isActiveNow?: boolean
}
export interface PromotionUpdateRequest {
  name?: string
  description?: string | null
  startDate?: string
  endDate?: string
  timeWindow?: string | null
  daysOfWeek?: string | null
  applyLevel?: ApplyLevel
  condition?: string
  action?: string
  priority?: number
  status?: PromotionStatus
  code?: string | null
  usageLimit?: number | null
  allBranches?: boolean
  branchIds?: number[]
}
export interface PromotionBranchAddRequest {
  branchId: number
  promotionId: number
}

// ---------------------------------------------------------------- Bộ lọc dùng lại
export interface AccountListParams {
  restaurantId?: number
  status?: AccountStatus
  page?: number
  size?: number
}
export interface AuditLogListParams {
  restaurantId?: number
  branchId?: number
  entityType?: string
  /**
   * Lọc theo loại thao tác (be-issues mục 22). Nhiều giá trị thì nối bằng dấu phẩy
   * (`LOGIN,LOGOUT`) — Spring tự tách thành `List<String>`. Không dùng mảng vì axios
   * serialize thành `actionType[]=...`, Spring không nhận dạng đó.
   */
  actionType?: string
  startDate?: string
  endDate?: string
  page?: number
  size?: number
}