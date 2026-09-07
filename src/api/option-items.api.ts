import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { PageParams, PageResponse } from "@/types/api"
import type { OptionItem } from "@/types/models"
import type { OptionItemAddRequest, OptionItemUpdateRequest } from "@/types/requests"

export function getOptionItem(id: number) {
  return apiGet<OptionItem>(`/option-items/${id}`)
}
export function getOptionItemsByGroup(optionGroupId: number) {
  return apiGet<OptionItem[]>(`/option-items/group/${optionGroupId}`)
}
export function listOptionItems(params?: PageParams & { optionGroupId?: number; keyword?: string }) {
  return apiGet<PageResponse<OptionItem>>("/option-items", { params })
}
export function createOptionItem(body: OptionItemAddRequest) {
  return apiPost<OptionItem>("/option-items", body)
}
export function updateOptionItem(id: number, body: OptionItemUpdateRequest) {
  return apiPut<OptionItem>(`/option-items/${id}`, body)
}
export function deleteOptionItem(id: number) {
  return apiDelete<void>(`/option-items/${id}`)
}

export function useOptionItemsByGroup(optionGroupId?: number) {
  return useQuery({
    queryKey: qk.optionItems.byGroup(optionGroupId as number),
    queryFn: () => getOptionItemsByGroup(optionGroupId as number),
    enabled: typeof optionGroupId === "number",
  })
}
export function useCreateOptionItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createOptionItem,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.optionItems.all }),
  })
}
export function useUpdateOptionItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: OptionItemUpdateRequest }) => updateOptionItem(vars.id, vars.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.optionItems.all }),
  })
}
export function useDeleteOptionItem() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteOptionItem,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.optionItems.all }),
  })
}
