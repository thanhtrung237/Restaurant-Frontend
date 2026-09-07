import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { BranchMenuItem } from "@/types/models"

/**
 * `GET /branches/{branchId}/menu` — thực đơn hiển thị cho KHÁCH.
 * BE đã resolve sẵn giá đè + lọc món ẩn + gắn trạng thái còn/hết,
 * nên FE chỉ hiển thị `effectivePrice`, không tự cộng giá.
 */
export function getBranchMenu(branchId: number) {
  return apiGet<BranchMenuItem[]>(`/branches/${branchId}/menu`)
}

/**
 * `GET /branches/{branchId}/menu/overview` — bản dành cho màn QUẢN TRỊ:
 * kèm cả món đang ẩn, chênh lệch giá gốc ↔ giá đè (`priceDifference`, `hasOverride`).
 */
export function getBranchMenuOverview(branchId: number) {
  return apiGet<BranchMenuItem[]>(`/branches/${branchId}/menu/overview`)
}

export function useBranchMenu(branchId?: number) {
  return useQuery({
    queryKey: qk.branchMenu.forCustomer(branchId as number),
    queryFn: () => getBranchMenu(branchId as number),
    enabled: typeof branchId === "number",
  })
}
export function useBranchMenuOverview(branchId?: number) {
  return useQuery({
    queryKey: qk.branchMenu.overview(branchId as number),
    queryFn: () => getBranchMenuOverview(branchId as number),
    enabled: typeof branchId === "number",
  })
}
