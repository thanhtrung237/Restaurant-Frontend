import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { DishOptionGroup } from "@/types/models"
import type { DishOptionGroupAddRequest } from "@/types/requests"

export function getDishOptionGroup(id: number) {
  return apiGet<DishOptionGroup>(`/dish-option-groups/${id}`)
}
/** Các nhóm tuỳ chọn của 1 món — gọi ở màn Chi tiết món để dựng form chọn size/topping. */
export function getDishOptionGroupsByDish(dishId: number) {
  return apiGet<DishOptionGroup[]>(`/dish-option-groups/dish/${dishId}`)
}
export function getDishOptionGroupsByOptionGroup(optionGroupId: number) {
  return apiGet<DishOptionGroup[]>(`/dish-option-groups/option-group/${optionGroupId}`)
}
export function linkDishToOptionGroup(body: DishOptionGroupAddRequest) {
  return apiPost<DishOptionGroup>("/dish-option-groups", body)
}
export function unlinkDishFromOptionGroup(id: number) {
  return apiDelete<void>(`/dish-option-groups/${id}`)
}

export function useDishOptionGroups(dishId?: number) {
  return useQuery({
    queryKey: qk.dishOptionGroups.byDish(dishId as number),
    queryFn: () => getDishOptionGroupsByDish(dishId as number),
    enabled: typeof dishId === "number",
  })
}
export function useLinkDishToOptionGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: linkDishToOptionGroup,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.dishOptionGroups.all }),
  })
}
export function useUnlinkDishFromOptionGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: unlinkDishFromOptionGroup,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.dishOptionGroups.all }),
  })
}
