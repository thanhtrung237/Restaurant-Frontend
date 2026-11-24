import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { PageParams, PageResponse } from "@/types/api"
import type { Branch, BranchListItem } from "@/types/models"
import type { BranchStatus } from "@/types/enums"
import type {
  BranchAddRequest,
  BranchAdminConfigRequest,
  BranchCopyConfigRequest,
  BranchManagerConfigRequest,
  BranchUpdateRequest,
} from "@/types/requests"

export function getBranch(id: number) {
  return apiGet<Branch>(`/branches/${id}`)
}
export function getBranchByCode(restaurantId: number, code: string) {
  return apiGet<Branch>(`/branches/restaurant/${restaurantId}/code/${code}`)
}
export function listBranches(
  params?: PageParams & { restaurantId?: number; status?: BranchStatus },
) {
  return apiGet<PageResponse<BranchListItem>>("/branches", { params })
}
export function getBranchesByRestaurant(restaurantId: number) {
  return apiGet<BranchListItem[]>(`/branches/restaurant/${restaurantId}`)
}
export function createBranch(body: BranchAddRequest) {
  return apiPost<Branch>("/branches", body)
}
export function updateBranch(id: number, body: BranchUpdateRequest) {
  return apiPut<Branch>(`/branches/${id}`, body)
}
export function changeBranchStatus(id: number, status: BranchStatus) {
  return apiPut<Branch>(`/branches/${id}/status`, null, { params: { status } })
}
/** Cấu hình Quản lý chi nhánh được sửa: giờ mở/đóng, tài khoản ngân hàng, timeout, giữ bàn. */
export function updateBranchManagerConfig(id: number, body: BranchManagerConfigRequest) {
  return apiPut<Branch>(`/branches/${id}/config/manager`, body)
}
/** Cấu hình chỉ Quản trị nhà hàng được sửa: VAT, phí dịch vụ, ngưỡng duyệt chiết khấu, MST. */
export function updateBranchAdminConfig(id: number, body: BranchAdminConfigRequest) {
  return apiPut<Branch>(`/branches/${id}/config/admin`, body)
}
/** Copy cấu hình TỪ `body.sourceBranchId` SANG chi nhánh `{id}`. */
export function copyBranchConfig(id: number, body: BranchCopyConfigRequest) {
  return apiPost<Branch>(`/branches/${id}/copy-config`, body)
}
export function deleteBranch(id: number) {
  return apiDelete<void>(`/branches/${id}`)
}

export function useBranch(id?: number) {
  return useQuery({
    queryKey: qk.branches.detail(id as number),
    queryFn: () => getBranch(id as number),
    enabled: typeof id === "number",
  })
}
export function useBranchesByRestaurant(restaurantId?: number) {
  return useQuery({
    queryKey: qk.branches.byRestaurant(restaurantId as number),
    queryFn: () => getBranchesByRestaurant(restaurantId as number),
    enabled: typeof restaurantId === "number",
  })
}
export function useBranchesPage(
  params?: PageParams & { restaurantId?: number; status?: BranchStatus },
) {
  return useQuery({
    queryKey: qk.branches.list(params),
    queryFn: () => listBranches(params),
  })
}
export function useCreateBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createBranch,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.branches.all }),
  })
}
export function useUpdateBranch() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: BranchUpdateRequest }) =>
      updateBranch(vars.id, vars.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.branches.all }),
  })
}
export function useUpdateBranchManagerConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: BranchManagerConfigRequest }) =>
      updateBranchManagerConfig(vars.id, vars.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.branches.all }),
  })
}
export function useUpdateBranchAdminConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: BranchAdminConfigRequest }) =>
      updateBranchAdminConfig(vars.id, vars.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.branches.all }),
  })
}
export function useCopyBranchConfig() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: BranchCopyConfigRequest }) =>
      copyBranchConfig(vars.id, vars.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.branches.all }),
  })
}
