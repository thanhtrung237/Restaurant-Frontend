import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { Category } from "@/types/models"
import type { CategoryStatus } from "@/types/enums"
import type { CategoryAddRequest, CategoryUpdateRequest } from "@/types/requests"

export function getCategory(id: number) {
  return apiGet<Category>(`/categories/${id}`)
}
export function getCategoriesByRestaurant(restaurantId: number, status?: CategoryStatus) {
  return apiGet<Category[]>(`/categories/restaurant/${restaurantId}`, { params: { status } })
}
export function createCategory(body: CategoryAddRequest) {
  return apiPost<Category>("/categories", body)
}
export function updateCategory(id: number, body: CategoryUpdateRequest) {
  return apiPut<Category>(`/categories/${id}`, body)
}
export function changeCategoryStatus(id: number, status: CategoryStatus) {
  return apiPut<Category>(`/categories/${id}/status`, null, { params: { status } })
}
export function deleteCategory(id: number) {
  return apiDelete<void>(`/categories/${id}`)
}

export function useCategoriesByRestaurant(restaurantId?: number, status?: CategoryStatus) {
  return useQuery({
    queryKey: qk.categories.byRestaurant(restaurantId as number, status),
    queryFn: () => getCategoriesByRestaurant(restaurantId as number, status),
    enabled: typeof restaurantId === "number",
  })
}
export function useCreateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createCategory,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.categories.all }),
  })
}
export function useUpdateCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: CategoryUpdateRequest }) =>
      updateCategory(vars.id, vars.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.categories.all }),
  })
}
export function useChangeCategoryStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; status: CategoryStatus }) =>
      changeCategoryStatus(vars.id, vars.status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.categories.all })
      // Danh mục ẩn thì món trong đó cũng biến mất khỏi menu khách (FR-MNU-01)
      void qc.invalidateQueries({ queryKey: qk.dishes.all })
      void qc.invalidateQueries({ queryKey: qk.branchMenu.all })
    },
  })
}
export function useDeleteCategory() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteCategory,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.categories.all }),
  })
}
