import type { BaseResponse } from "./base.model"
import type { TableSessionStatus } from "../enums"

/**
 * Mirror của `TableSessionResponse.java` — 1 lượt phục vụ của 1 bàn, từ lúc mở tới lúc đóng.
 * Nguồn: `GET /table-sessions/{id}`, `GET /table-sessions/branch/{branchId}/open`.
 *
 * Phân biệt rõ với `DiningTable`:
 * - `DiningTable.status` = trạng thái VẬT LÝ của bàn (INACTIVE/AVAILABLE/OCCUPIED/RESERVED)
 * - `TableSession.status` = trạng thái PHIÊN (WAITING_FOR_OPEN/SERVING/WAITING_FOR_PAY/...)
 * Không dùng lẫn 2 enum này.
 *
 * Snapshot thuế/phí (`vatRateAtOpen`, `serviceFeeRateAtOpen`, `coverFeePerGuestAtOpen`):
 * chốt tại thời điểm mở bàn. Khi tính hoá đơn phải dùng số của phiên, KHÔNG lấy
 * `Branch.vatRate` hiện tại — nếu không sẽ sai khi nhà hàng đổi % giữa chừng.
 *
 * Nhóm `reservation*`: dành cho luồng đặt bàn trước (status = RESERVED).
 */
export interface TableSession extends BaseResponse {
  tableId: number | null
  takeaway?: boolean
  canAddTakeawayItems?: boolean
  pickedUpAt?: string | null
  tableName?: string
  /** BE bắt buộc có (`nullable = false`) — dùng để scope theo chi nhánh. */
  branchId: number
  restaurantId?: number
  guestCount?: number
  note?: string
  coverFeePerGuestAtOpen?: number // BigDecimal
  customerIdRef?: string
  openedAt?: string // LocalDateTime
  closedAt?: string
  status: TableSessionStatus
  /** Số lượt gọi món (Order) trong phiên — BE tính sẵn. */
  orderCount?: number
  // --- snapshot lúc mở phiên ---
  vatRateAtOpen?: number
  serviceFeeRateAtOpen?: number
  // --- đặt bàn trước ---
  reservationName?: string
  reservationPhone?: string
  reservationTime?: string // LocalDateTime
  reservationNote?: string
  createdAt?: string
  modifiedAt?: string
}
