import type { BaseResponse } from "./base.model"
import type { BranchStatus } from "../enums"

/**
 * Mirror của `BranchResponse.java`.
 * Nguồn: `GET /branches/{id}`, `GET /branches/restaurant/{restaurantId}`.
 *
 * Nhóm field cấu hình (dùng cho trang "Cấu hình chi nhánh" — cả bản branch-manager
 * lẫn restaurant-admin, qua `PUT /branches/{id}/config/manager` và
 * `PUT /branches/{id}/config/admin`):
 * - `discountApprovalThreshold` — ngưỡng tiền chiết khấu tay phải có người duyệt
 * - `pendingConfirmTimeoutMinutes` — quá hạn thì tự huỷ phiên chờ xác nhận mở bàn
 * - `reservationHoldMinutes` — giữ bàn đặt trước bao lâu
 * - `vatAppliedOnServiceFee` — có tính VAT trên phí dịch vụ hay không
 *
 * Nhóm field thống kê (BE tính sẵn, chỉ đọc — KHÔNG gửi lên khi update):
 * `tableCount`, `activeSessionCount`, `openSessionCount`, `hasOpenSessionWarning`.
 * `hasOpenSessionWarning` = true nghĩa là đang có phiên bàn mở, cần cảnh báo trước khi
 * đổi VAT / phí dịch vụ (vì phiên đang mở đã snapshot % cũ — xem TableSession).
 *
 * Response dùng `updatedAt`.
 */
export interface Branch extends BaseResponse {
  restaurantId: number
  restaurantName?: string
  code: string
  name: string
  address?: string
  phone?: string
  openingTime?: string // LocalTime -> "HH:mm:ss"
  closingTime?: string
  businessDayStartTime?: string
  taxCode?: string
  bankAccountNo?: string
  bankName?: string
  status: BranchStatus
  serviceFeeRate?: number // BigDecimal
  vatRate?: number
  vatAppliedOnServiceFee?: boolean
  discountApprovalThreshold?: number
  pendingConfirmTimeoutMinutes?: number
  reservationHoldMinutes?: number
  tableCount?: number
  activeSessionCount?: number
  hasOpenSessionWarning?: boolean
  openSessionCount?: number
  createdAt?: string
  updatedAt?: string
}

/**
 * Mirror của `BranchListResponse.java` — bản rút gọn dùng cho danh sách chi nhánh.
 * KHÔNG phải `Branch` đầy đủ: không có cấu hình VAT/phí, không có timestamps.
 */
export interface BranchListItem extends BaseResponse {
  code: string
  name: string
  address?: string
  phone?: string
  status: BranchStatus
  tableCount?: number
}
