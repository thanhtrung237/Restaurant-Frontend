import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { PageParams, PageResponse } from "@/types/api"
import type { Role, RoleListItem } from "@/types/models"
import type { RoleScope } from "@/types/enums"
import type { RoleAddRequest, RoleUpdateRequest } from "@/types/requests"

export function getRole(id: number) {
  return apiGet<Role>(`/roles/${id}`)
}
export function getRoleByCode(code: string) {
  return apiGet<Role>(`/roles/code/${code}`)
}
export function listRoles(params?: PageParams & { restaurantId?: number; scope?: RoleScope }) {
  return apiGet<PageResponse<RoleListItem>>("/roles", { params })
}
export function getRolesByRestaurant(restaurantId: number) {
  return apiGet<RoleListItem[]>(`/roles/restaurant/${restaurantId}`)
}
export function createRole(body: RoleAddRequest) {
  return apiPost<Role>("/roles", body)
}
export function updateRole(id: number, body: RoleUpdateRequest) {
  return apiPut<Role>(`/roles/${id}`, body)
}
export function deleteRole(id: number) {
  return apiDelete<void>(`/roles/${id}`)
}

export function useRolesByRestaurant(restaurantId?: number) {
  return useQuery({
    queryKey: qk.roles.byRestaurant(restaurantId as number),
    queryFn: () => getRolesByRestaurant(restaurantId as number),
    enabled: typeof restaurantId === "number",
  })
}
export function useCreateRole() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: createRole, onSuccess: () => void qc.invalidateQueries({ queryKey: qk.roles.all }) })
}
export function useUpdateRole() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: RoleUpdateRequest }) => updateRole(vars.id, vars.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.roles.all }),
  })
}
export function useDeleteRole() {
  const qc = useQueryClient()
  return useMutation({ mutationFn: deleteRole, onSuccess: () => void qc.invalidateQueries({ queryKey: qk.roles.all }) })
}
