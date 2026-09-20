import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { PageResponse } from "@/types/api"
import type { AuditLog } from "@/types/models"
import type { AuditLogListParams } from "@/types/requests"

export function getAuditLog(id: number) {
  return apiGet<AuditLog>(`/audit-logs/${id}`)
}
/** Có phân trang + lọc theo khoảng thời gian — dùng cho màn Nhật ký hệ thống. */
export function listAuditLogs(params?: AuditLogListParams) {
  return apiGet<PageResponse<AuditLog>>("/audit-logs", { params })
}
export function getAuditLogsByRestaurant(restaurantId: number) {
  return apiGet<AuditLog[]>(`/audit-logs/restaurant/${restaurantId}`)
}
export function getAuditLogsByBranch(branchId: number) {
  return apiGet<AuditLog[]>(`/audit-logs/branch/${branchId}`)
}
export function getAuditLogsByEntityType(entityType: string) {
  return apiGet<AuditLog[]>(`/audit-logs/entity-type/${entityType}`)
}
export function getAuditLogsByPerformedBy(accountId: number) {
  return apiGet<AuditLog[]>(`/audit-logs/performed-by/${accountId}`)
}

export function useAuditLogs(params?: AuditLogListParams) {
  return useQuery({ queryKey: qk.auditLogs.list(params), queryFn: () => listAuditLogs(params) })
}
export function useAuditLogsByRestaurant(restaurantId?: number) {
  return useQuery({
    queryKey: qk.auditLogs.byRestaurant(restaurantId as number),
    queryFn: () => getAuditLogsByRestaurant(restaurantId as number),
    enabled: typeof restaurantId === "number",
  })
}
/**
 * Nhật ký của MỘT chi nhánh — không phân trang, mới nhất trước.
 * Dùng cho màn Nhật ký của Quản lý chi nhánh (BR-18: chỉ chi nhánh mình).
 */
export function useAuditLogsByBranch(branchId?: number) {
  return useQuery({
    queryKey: qk.auditLogs.byBranch(branchId as number),
    queryFn: () => getAuditLogsByBranch(branchId as number),
    enabled: typeof branchId === "number",
  })
}
/**
 * Nhật ký do MỘT người thực hiện — không phân trang, mới nhất trước.
 *
 * Màn Nhật ký dùng endpoint này khi người dùng chọn một nhân viên ở bộ lọc, thay vì lọc
 * trên trang đang xem: lọc trên trang sẽ bỏ sót bản ghi nằm ở trang sau.
 */
export function useAuditLogsByPerformedBy(accountId?: number) {
  return useQuery({
    queryKey: qk.auditLogs.byPerformedBy(accountId as number),
    queryFn: () => getAuditLogsByPerformedBy(accountId as number),
    enabled: typeof accountId === "number",
  })
}
