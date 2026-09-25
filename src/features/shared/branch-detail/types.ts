import type { BranchStatus } from "@/types/enums"

/**
 * Kiểu dữ liệu chi tiết một chi nhánh (Tab Thông tin)
 * Dùng chung bởi Quản lý chi nhánh (chi nhánh của mình) và Quản trị nhà hàng (bất kỳ chi nhánh nào).
 */
export interface BranchDetail {
  id: number
  name: string
  status: BranchStatus
  address: string
  managerName: string
  phone: string
  taxCode: string
  openingHours: string
  tableCount: number
  staffCount: number
  startDate: string
}

/**
 * Trạng thái của món trong menu chi nhánh
 */
export type BranchMenuStatus =
  | "ORIGINAL_PRICE" // Theo giá gốc
  | "OVERRIDDEN_PRICE" // Đã đè giá
  | "HIDDEN" // Tạm ẩn
  | "CUSTOM" // Món riêng

/**
 * Món trong menu chi nhánh (Tab Menu chi nhánh) — ĐÂY LÀ VIEW-MODEL CỦA UI,
 * không phải DTO của backend.
 *
 * Trùng tên với `BranchMenuItem` trong `@/types/models` (mirror của
 * `BranchMenuItemResponse.java`, lấy từ `GET /branches/{branchId}/menu`). Hai kiểu này
 * hiện không dùng chung file nên không xung đột, nhưng khi nối API thật (Phase 9) nên bỏ
 * kiểu này và map thẳng từ model chuẩn sang props hiển thị.
 */
export interface BranchMenuItem {
  id: number
  name: string
  category: string
  originalPrice: number | null
  branchPrice: number | null
  diffText: string
  status: BranchMenuStatus
  image?: string
}

/**
 * Bàn thuộc chi nhánh (Tab Bàn & QR)
 */
export interface BranchTableItem {
  id: number
  name: string
  capacity: number
  area: string
  status: "AVAILABLE" | "INACTIVE"
  qrCodeUrl?: string
}

/**
 * Cấu hình vận hành chi nhánh — Nhóm 1 (FR-BRN-02)
 * Dùng chung bởi cả Quản lý chi nhánh và Quản trị nhà hàng.
 * Lưu qua PUT /branches/{id}/config/manager
 */
export interface BranchConfigData {
  /** Khung giờ mở cửa (hiển thị, không lưu riêng) */
  openingHours: string
  /** Giờ bắt đầu ngày kinh doanh, "HH:mm" (BR-06) */
  businessDayStartTime: string
  /** Số tài khoản nhận chuyển khoản của chi nhánh (FR-PAY-03) */
  bankAccountNo: string
  /** Mã ngân hàng — xem `BANK_OPTIONS` trong config/banks.ts */
  bankName: string
  /** Thời gian tự huỷ CHỜ MỞ BÀN (phút) */
  autoCancelWaitingMinutes: number | string
  /** Thời gian giữ chỗ đặt bàn (phút) */
  reservationHoldingMinutes: number | string
}

/**
 * Cấu hình quản trị chi nhánh — Nhóm 2 (FR-BRN-02)
 * CHỈ Quản trị nhà hàng mới sửa được.
 * Lưu qua PUT /branches/{id}/config/admin
 */
export interface BranchAdminConfigData {
  /** Thuế VAT (0-100) */
  vatRate: number
  /** Phí dịch vụ (0-100) */
  serviceFeeRate: number
  /** VAT có áp dụng trên phí dịch vụ không */
  vatAppliedOnServiceFee: boolean
  /** Ngưỡng chiết khấu cần duyệt (≥ 0) */
  discountApprovalThreshold: number
  /** Mã số thuế riêng của chi nhánh (để trống = dùng MST nhà hàng, BR-20) */
  taxCode: string
}
