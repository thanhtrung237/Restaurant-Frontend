import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { PageParams, PageResponse } from "@/types/api"
import type { Dish } from "@/types/models"
import type { DishStatus } from "@/types/enums"
import type { DishAddRequest, DishUpdateRequest } from "@/types/requests"

export function getDish(id: number) {
  return apiGet<Dish>(`/dishes/${id}`)
}
export function getDishesByRestaurant(restaurantId: number, params?: PageParams & { status?: DishStatus }) {
  return apiGet<PageResponse<Dish>>(`/dishes/restaurant/${restaurantId}`, { params })
}
export function getDishesByBranch(branchId: number) {
  return apiGet<Dish[]>(`/dishes/branch/${branchId}`)
}
export function getDishesByCategory(categoryId: number) {
  return apiGet<Dish[]>(`/dishes/category/${categoryId}`)
}
export function createDish(body: DishAddRequest) {
  return apiPost<Dish>("/dishes", body)
}
export function updateDish(id: number, body: DishUpdateRequest) {
  return apiPut<Dish>(`/dishes/${id}`, body)
}
export function changeDishStatus(id: number, status: DishStatus) {
  return apiPut<Dish>(`/dishes/${id}/status`, null, { params: { status } })
}
/** Đếm số chi nhánh bị ảnh hưởng — dùng để cảnh báo trước khi sửa/ẩn món dùng chung. */
export function countAffectedBranches(id: number) {
  return apiGet<number>(`/dishes/${id}/affected-branches`)
}
export function deleteDish(id: number) {
  return apiDelete<void>(`/dishes/${id}`)
}

export function useDish(id?: number) {
  return useQuery({
    queryKey: qk.dishes.detail(id as number),
    queryFn: () => getDish(id as number),
    enabled: typeof id === "number",
  })
}
export function useDishesByRestaurant(restaurantId?: number, params?: PageParams & { status?: DishStatus }) {
  return useQuery({
    queryKey: qk.dishes.byRestaurant(restaurantId as number, params),
    queryFn: () => getDishesByRestaurant(restaurantId as number, params),
    enabled: typeof restaurantId === "number",
  })
}
export function useDishesByBranch(branchId?: number) {
  return useQuery({
    queryKey: qk.dishes.byBranch(branchId as number),
    queryFn: () => getDishesByBranch(branchId as number),
    enabled: typeof branchId === "number",
  })
}
export function useCreateDish() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createDish,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.dishes.all })
      void qc.invalidateQueries({ queryKey: qk.branchMenu.all })
    },
  })
}
export function useUpdateDish() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: DishUpdateRequest }) => updateDish(vars.id, vars.body),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.dishes.all })
      void qc.invalidateQueries({ queryKey: qk.branchMenu.all })
    },
  })
}
export function useChangeDishStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; status: DishStatus }) => changeDishStatus(vars.id, vars.status),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.dishes.all })
      void qc.invalidateQueries({ queryKey: qk.branchMenu.all })
    },
  })
}
