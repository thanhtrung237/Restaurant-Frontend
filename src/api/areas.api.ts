import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { Area } from "@/types/models"
import type { AreaStatus } from "@/types/enums"
import type { AreaAddRequest, AreaUpdateRequest } from "@/types/requests"

export function getArea(id: number) {
  return apiGet<Area>(`/areas/${id}`)
}
export function getAreasByBranch(branchId: number, status?: AreaStatus) {
  return apiGet<Area[]>(`/areas/branch/${branchId}`, { params: { status } })
}
export function createArea(body: AreaAddRequest) {
  return apiPost<Area>("/areas", body)
}
export function updateArea(id: number, body: AreaUpdateRequest) {
  return apiPut<Area>(`/areas/${id}`, body)
}
export function changeAreaStatus(id: number, status: AreaStatus) {
  return apiPut<Area>(`/areas/${id}/status`, null, { params: { status } })
}
export function deleteArea(id: number) {
  return apiDelete<void>(`/areas/${id}`)
}

export function useAreasByBranch(branchId?: number, status?: AreaStatus) {
  return useQuery({
    queryKey: qk.areas.byBranch(branchId as number, status),
    queryFn: () => getAreasByBranch(branchId as number, status),
    enabled: typeof branchId === "number",
  })
}
export function useCreateArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createArea,
    onSuccess: (area, { branchId }) => {
      qc.setQueryData<Area[]>(qk.areas.byBranch(branchId), (areas) => [
        ...(areas ?? []).filter((item) => item.id !== area.id),
        area,
      ])
      void qc.invalidateQueries({ queryKey: qk.areas.all })
    },
  })
}
export function useUpdateArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: AreaUpdateRequest }) => updateArea(vars.id, vars.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.areas.all }),
  })
}
export function useDeleteArea() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteArea,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.areas.all }),
  })
}
