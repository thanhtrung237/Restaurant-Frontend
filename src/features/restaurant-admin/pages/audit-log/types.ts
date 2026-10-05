/**
 * Kiểu dữ liệu màn Nhật ký hoạt động.
 *
 * Dựng từ `AuditLogResponse` của backend (`GET /audit-logs`). Loại hành động dùng thẳng hằng
 * của BE — `services/audit/AuditAction.java`, mirror ở `types/models/audit-log.model.ts`.
 * Bản trước tự khai một tập riêng (`CHANGE_PRICE`, `CANCEL_ITEM`, `OPEN_TABLE`,
 * `CHANGE_ROLE`, `CLOSE_TABLE`) — BE không sinh giá trị nào trong số đó.
 */

import type { AuditActionType } from "@/types/models"

export interface AuditLogRow {
  id: number
  /** HH:mm của `occurredAt`. */
  time: string
  /** "Hôm nay" / "Hôm qua" / dd/MM/yyyy. */
  date: string
  performedByName: string
  /** Vai trò của người thực hiện — BE không trả, tra từ danh sách tài khoản. */
  performedByRole: string
  branchName: string
  actionType?: AuditActionType
  actionLabel: string
  /** "giá trị trước → giá trị sau" (BR-12), hoặc lý do nếu không có cặp giá trị. */
  changeDescription: string
  /** Dòng phụ: lý do, hoặc đối tượng bị tác động. */
  changeDetail?: string
  approvedByName: string | null
}

/** Khoảng thời gian của bộ lọc (FR-LOG-01). */
export type AuditDateRangeId = "TODAY" | "LAST_7_DAYS" | "LAST_30_DAYS" | "THIS_MONTH" | "ALL"

/** "ALL" = mọi loại thao tác / mọi nhân viên. */
export type AuditActionFilter = "ALL" | AuditActionType
export type AuditPerformerFilter = "ALL" | number
