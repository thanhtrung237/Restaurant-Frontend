import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { PageParams, PageResponse } from "@/types/api"
import type { Restaurant, RestaurantListItem } from "@/types/models"
import type { RestaurantStatus } from "@/types/enums"
import type { RestaurantAddRequest, RestaurantUpdateRequest } from "@/types/requests"

export function getRestaurant(id: number) {
  return apiGet<Restaurant>(`/restaurants/${id}`)
}
/** Dùng ở trang Đăng nhập nếu cần kiểm tra `restaurantCode` trước khi submit. */
export function getRestaurantByCode(code: string) {
  return apiGet<Restaurant>(`/restaurants/code/${code}`)
}
export function listRestaurants(
  params?: PageParams & { keyword?: string; status?: RestaurantStatus },
) {
  return apiGet<PageResponse<RestaurantListItem>>("/restaurants", { params })
}
export function createRestaurant(body: RestaurantAddRequest) {
  return apiPost<Restaurant>("/restaurants", body)
}
export function updateRestaurant(id: number, body: RestaurantUpdateRequest) {
  return apiPut<Restaurant>(`/restaurants/${id}`, body)
}
export function changeRestaurantStatus(id: number, status: RestaurantStatus) {
  return apiPut<Restaurant>(`/restaurants/${id}/status`, null, { params: { status } })
}
export function deleteRestaurant(id: number) {
  return apiDelete<void>(`/restaurants/${id}`)
}

export function useRestaurant(id?: number) {
  return useQuery({
    queryKey: qk.restaurants.detail(id as number),
    queryFn: () => getRestaurant(id as number),
    enabled: typeof id === "number",
  })
}
export function useRestaurantsPage(
  params?: PageParams & { keyword?: string; status?: RestaurantStatus },
) {
  return useQuery({ queryKey: qk.restaurants.list(params), queryFn: () => listRestaurants(params) })
}
export function useCreateRestaurant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (body: RestaurantAddRequest) => createRestaurant(body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.restaurants.all }),
  })
}
export function useUpdateRestaurant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: RestaurantUpdateRequest }) =>
      updateRestaurant(vars.id, vars.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.restaurants.all }),
  })
}
export function useChangeRestaurantStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; status: RestaurantStatus }) =>
      changeRestaurantStatus(vars.id, vars.status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.restaurants.all }),
  })
}
export function useDeleteRestaurant() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => deleteRestaurant(id),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.restaurants.all }),
  })
}
