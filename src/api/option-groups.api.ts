import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { PageParams, PageResponse } from "@/types/api"
import type { OptionGroup } from "@/types/models"
import type { OptionGroupAddRequest, OptionGroupUpdateRequest } from "@/types/requests"

export function getOptionGroup(id: number) {
  return apiGet<OptionGroup>(`/option-groups/${id}`)
}
export function getOptionGroupsByRestaurant(restaurantId: number) {
  return apiGet<OptionGroup[]>(`/option-groups/restaurant/${restaurantId}`)
}
export function listOptionGroups(
  params?: PageParams & { restaurantId?: number; keyword?: string },
) {
  return apiGet<PageResponse<OptionGroup>>("/option-groups", { params })
}
export function createOptionGroup(body: OptionGroupAddRequest) {
  return apiPost<OptionGroup>("/option-groups", body)
}
export function updateOptionGroup(id: number, body: OptionGroupUpdateRequest) {
  return apiPut<OptionGroup>(`/option-groups/${id}`, body)
}
export function deleteOptionGroup(id: number) {
  return apiDelete<void>(`/option-groups/${id}`)
}

export function useOptionGroupsByRestaurant(restaurantId?: number) {
  return useQuery({
    queryKey: qk.optionGroups.byRestaurant(restaurantId as number),
    queryFn: () => getOptionGroupsByRestaurant(restaurantId as number),
    enabled: typeof restaurantId === "number",
  })
}
export function useCreateOptionGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createOptionGroup,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.optionGroups.all }),
  })
}
export function useUpdateOptionGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: OptionGroupUpdateRequest }) =>
      updateOptionGroup(vars.id, vars.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.optionGroups.all }),
  })
}
export function useDeleteOptionGroup() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteOptionGroup,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.optionGroups.all }),
  })
}
