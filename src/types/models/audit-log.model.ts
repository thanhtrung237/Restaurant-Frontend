import type { BaseResponse } from "./base.model"

/**
 * Mirror của `AuditLogResponse.java` — nhật ký thay đổi có kèm người duyệt
 * (dùng cho chiết khấu tay, đổi cấu hình chi nhánh, ...).
 *
 * DTO này KHÔNG có `createdAt`/`modifiedAt` — mốc thời gian là `occurredAt`.
 */
export interface AuditLog extends BaseResponse {
  restaurantId?: number
  restaurantName?: string
  branchId?: number
  branchName?: string
  performedById?: number
  performedByName?: string
  approvedById?: number
  approvedByName?: string
  occurredAt: string // LocalDateTime
  entityType: string
  /** ID bản ghi bị tác động — để màn Nhật ký link được sang đúng hoá đơn/phiên/tài khoản. */
  entityId?: number
  /**
   * FR-LOG-01 — loại hành động, dùng để lọc nhật ký.
   * Giá trị do BE sinh từ `services/audit/AuditAction.java`.
   */
  actionType?: AuditActionType
  valueBefore?: string
  valueAfter?: string
  reason?: string
}

/** Mirror của `services/audit/AuditAction.java`. */
export const AUDIT_ACTION_TYPE = [
  "CREATE",
  "UPDATE",
  "DELETE",
  "STATUS_CHANGE",
  "CANCEL",
  "PAYMENT",
  "DISCOUNT",
  "ISSUE_EINVOICE",
  "CONFIG_CHANGE",
  "PERMISSION_CHANGE",
  "LOGIN",
  "LOGOUT",
] as const

export type AuditActionType = (typeof AUDIT_ACTION_TYPE)[number]

export const AUDIT_ACTION_TYPE_LABEL: Record<AuditActionType, string> = {
  CREATE: "Tạo mới",
  UPDATE: "Cập nhật",
  DELETE: "Xoá",
  STATUS_CHANGE: "Đổi trạng thái",
  CANCEL: "Huỷ",
  PAYMENT: "Thanh toán",
  DISCOUNT: "Chiết khấu tay",
  ISSUE_EINVOICE: "Phát hành HĐĐT",
  CONFIG_CHANGE: "Đổi cấu hình",
  PERMISSION_CHANGE: "Đổi phân quyền",
  LOGIN: "Đăng nhập",
  LOGOUT: "Đăng xuất",
}
