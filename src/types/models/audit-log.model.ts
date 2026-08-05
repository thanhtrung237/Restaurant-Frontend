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
  valueBefore?: string
  valueAfter?: string
  reason?: string
}
