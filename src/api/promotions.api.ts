import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { PageParams, PageResponse } from "@/types/api"
import type { Promotion, PromotionBranch } from "@/types/models"
import type { PromotionStatus } from "@/types/enums"
import type { PromotionAddRequest, PromotionBranchAddRequest, PromotionUpdateRequest } from "@/types/requests"

export function getPromotion(id: number) {
  return apiGet<Promotion>(`/promotions/${id}`)
}
export function getPromotionsByRestaurant(
  restaurantId: number,
  params?: PageParams & { status?: PromotionStatus },
) {
  return apiGet<PageResponse<Promotion>>(`/promotions/restaurant/${restaurantId}`, { params })
}
export function createPromotion(body: PromotionAddRequest) {
  return apiPost<Promotion>("/promotions", body)
}
export function updatePromotion(id: number, body: PromotionUpdateRequest) {
  return apiPut<Promotion>(`/promotions/${id}`, body)
}
export function changePromotionStatus(id: number, status: PromotionStatus) {
  return apiPut<Promotion>(`/promotions/${id}/status`, null, { params: { status } })
}
export function deletePromotion(id: number) {
  return apiDelete<void>(`/promotions/${id}`)
}

// --- gán khuyến mãi cho chi nhánh (PromotionBranchController) ---
export function getPromotionsByBranch(branchId: number) {
  return apiGet<PromotionBranch[]>(`/promotion-branches/branch/${branchId}`)
}
export function getBranchesByPromotion(promotionId: number) {
  return apiGet<PromotionBranch[]>(`/promotion-branches/promotion/${promotionId}`)
}
export function assignPromotionToBranch(body: PromotionBranchAddRequest) {
  return apiPost<PromotionBranch>("/promotion-branches", body)
}
export function removePromotionFromBranch(id: number) {
  return apiDelete<void>(`/promotion-branches/${id}`)
}

export function usePromotionsByRestaurant(
  restaurantId?: number,
  params?: PageParams & { status?: PromotionStatus },
) {
  return useQuery({
    queryKey: qk.promotions.byRestaurant(restaurantId as number, params),
    queryFn: () => getPromotionsByRestaurant(restaurantId as number, params),
    enabled: typeof restaurantId === "number",
  })
}
export function usePromotionsByBranch(branchId?: number) {
  return useQuery({
    queryKey: qk.promotionBranches.byBranch(branchId as number),
    queryFn: () => getPromotionsByBranch(branchId as number),
    enabled: typeof branchId === "number",
  })
}
export function useCreatePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createPromotion,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.promotions.all }),
  })
}
export function useUpdatePromotion() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: PromotionUpdateRequest }) => updatePromotion(vars.id, vars.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.promotions.all }),
  })
}
export function useChangePromotionStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; status: PromotionStatus }) => changePromotionStatus(vars.id, vars.status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.promotions.all }),
  })
}
export function useAssignPromotionToBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: assignPromotionToBranch,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.promotionBranches.all }),
  })
}
