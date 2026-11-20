import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { BranchMenuItem } from "@/types/models"

type BranchMenuResponse = Omit<BranchMenuItem, "isHidden" | "isBranchSpecific"> & {
  isHidden?: boolean
  isBranchSpecific?: boolean
  hidden?: boolean
  branchSpecific?: boolean
}

async function fetchBranchMenu(path: string): Promise<BranchMenuItem[]> {
  const items = await apiGet<BranchMenuResponse[]>(path)
  return items.map(({ hidden, branchSpecific, ...item }) => ({
    ...item,
    isHidden: item.isHidden ?? hidden ?? false,
    isBranchSpecific: item.isBranchSpecific ?? branchSpecific ?? false,
  }))
}

/**
 * `GET /branches/{branchId}/menu` — thực đơn hiển thị cho KHÁCH.
 * BE đã resolve sẵn giá đè + lọc món ẩn + gắn trạng thái còn/hết,
 * nên FE chỉ hiển thị `effectivePrice`, không tự cộng giá.
 */
export function getBranchMenu(branchId: number) {
  return fetchBranchMenu(`/branches/${branchId}/menu`)
}

/**
 * `GET /branches/{branchId}/menu/overview` — bản dành cho màn QUẢN TRỊ:
 * kèm cả món đang ẩn, chênh lệch giá gốc ↔ giá đè (`priceDifference`, `hasOverride`).
 */
export function getBranchMenuOverview(branchId: number) {
  return fetchBranchMenu(`/branches/${branchId}/menu/overview`)
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
