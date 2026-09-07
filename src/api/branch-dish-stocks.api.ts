import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { BranchDishStock } from "@/types/models"

export function getBranchStock(branchId: number) {
  return apiGet<BranchDishStock[]>(`/branch-dish-stocks/branch/${branchId}`)
}
/** Chỉ các món đang HẾT — dùng cho màn "Cảnh báo món hết". */
export function getOutOfStock(branchId: number) {
  return apiGet<BranchDishStock[]>(`/branch-dish-stocks/branch/${branchId}/out-of-stock`)
}
/** Đảo trạng thái còn ↔ hết của 1 món tại 1 chi nhánh (không cần body). */
export function toggleDishStock(branchId: number, dishId: number) {
  return apiPut<BranchDishStock>(`/branch-dish-stocks/branch/${branchId}/dish/${dishId}/toggle`)
}
/** Mở lại tất cả món (thường chạy đầu ngày). */
export function restoreAllStock(branchId: number) {
  return apiPut<void>(`/branch-dish-stocks/branch/${branchId}/restore-all`)
}

export function useBranchStock(branchId?: number) {
  return useQuery({
    queryKey: qk.branchDishStocks.byBranch(branchId as number),
    queryFn: () => getBranchStock(branchId as number),
    enabled: typeof branchId === "number",
  })
}
export function useOutOfStock(branchId?: number) {
  return useQuery({
    queryKey: qk.branchDishStocks.outOfStock(branchId as number),
    queryFn: () => getOutOfStock(branchId as number),
    enabled: typeof branchId === "number",
  })
}
export function useToggleDishStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { branchId: number; dishId: number }) => toggleDishStock(vars.branchId, vars.dishId),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.branchDishStocks.all })
      // Thực đơn khách cũng đổi theo (món hết sẽ hiện khác) → làm mới luôn.
      void qc.invalidateQueries({ queryKey: qk.branchMenu.all })
    },
  })
}
export function useRestoreAllStock() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: restoreAllStock,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.branchDishStocks.all })
      void qc.invalidateQueries({ queryKey: qk.branchMenu.all })
    },
  })
}
