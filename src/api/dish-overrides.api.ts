import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { DishOverride } from "@/types/models"
import type { DishOverrideAddRequest, DishOverrideUpdateRequest } from "@/types/requests"

export function getDishOverride(id: number) {
  return apiGet<DishOverride>(`/dish-overrides/${id}`)
}
export function getDishOverridesByBranch(branchId: number) {
  return apiGet<DishOverride[]>(`/dish-overrides/branch/${branchId}`)
}
export function getDishOverridesByDish(dishId: number) {
  return apiGet<DishOverride[]>(`/dish-overrides/dish/${dishId}`)
}
export function createDishOverride(body: DishOverrideAddRequest) {
  return apiPost<DishOverride>("/dish-overrides", body)
}
export function updateDishOverride(id: number, body: DishOverrideUpdateRequest) {
  return apiPut<DishOverride>(`/dish-overrides/${id}`, body)
}
export function deleteDishOverride(id: number) {
  return apiDelete<void>(`/dish-overrides/${id}`)
}

export function useDishOverridesByBranch(branchId?: number) {
  return useQuery({
    queryKey: qk.dishOverrides.byBranch(branchId as number),
    queryFn: () => getDishOverridesByBranch(branchId as number),
    enabled: typeof branchId === "number",
  })
}
function invalidateOverrideScope(qc: ReturnType<typeof useQueryClient>) {
  void qc.invalidateQueries({ queryKey: qk.dishOverrides.all })
  void qc.invalidateQueries({ queryKey: qk.branchMenu.all })
}
export function useCreateDishOverride() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: createDishOverride, onSuccess: () => invalidateOverrideScope(qc) })
}
export function useUpdateDishOverride() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: DishOverrideUpdateRequest }) => updateDishOverride(vars.id, vars.body),
    onSuccess: () => invalidateOverrideScope(qc),
  })
}
export function useDeleteDishOverride() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteDishOverride, onSuccess: () => invalidateOverrideScope(qc) })
}
