/**
 * Audit log types
 * Tương thích trực tiếp với AuditLogResponse của backend
 */

export type AuditActionType =
  | "ALL"
  | "DISCOUNT"
  | "CHANGE_PRICE"
  | "CANCEL_ITEM"
  | "OPEN_TABLE"
  | "CHANGE_ROLE"
  | "CLOSE_TABLE"

export interface AuditLogItem {
  id: number
  time: string
  date: string
  performedByName: string
  performedByRole: string
  branchName: string
  actionType: AuditActionType
  actionLabel: string
  changeDescription: string
  approvedByName: string | null
}
