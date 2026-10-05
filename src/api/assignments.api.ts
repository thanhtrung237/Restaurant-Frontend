import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { Assignment } from "@/types/models"
import type { AssignmentAddRequest } from "@/types/requests"

export function getAssignment(id: number) {
  return apiGet<Assignment>(`/assignments/${id}`)
}
/** Nguồn duy nhất để biết 1 tài khoản thuộc (những) chi nhánh nào. */
export function getAssignmentsByAccount(accountId: number) {
  return apiGet<Assignment[]>(`/assignments/account/${accountId}`)
}
export function getAssignmentsByBranch(branchId: number) {
  return apiGet<Assignment[]>(`/assignments/branch/${branchId}`)
}
export function getAssignmentsByRole(roleId: number) {
  return apiGet<Assignment[]>(`/assignments/role/${roleId}`)
}
export function createAssignment(body: AssignmentAddRequest) {
  return apiPost<Assignment>("/assignments", body)
}
export function deleteAssignment(id: number) {
  return apiDelete<void>(`/assignments/${id}`)
}

export function useAssignmentsByAccount(accountId?: number) {
  return useQuery({
    queryKey: qk.assignments.byAccount(accountId as number),
    queryFn: () => getAssignmentsByAccount(accountId as number),
    enabled: typeof accountId === "number",
  })
}
export function useAssignmentsByBranch(branchId?: number) {
  return useQuery({
    queryKey: qk.assignments.byBranch(branchId as number),
    queryFn: () => getAssignmentsByBranch(branchId as number),
    enabled: typeof branchId === "number",
  })
}
export function useCreateAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAssignment,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.assignments.all })
      void qc.invalidateQueries({ queryKey: qk.accounts.all })
    },
  })
}
export function useDeleteAssignment() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteAssignment,
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: qk.assignments.all })
      // Danh sách tài khoản mang theo `assignments`, nên gỡ phân công là bảng Nhân viên
      // cũng phải đọc lại — thiếu dòng này thì chip vai trò vẫn còn trên màn hình.
      void qc.invalidateQueries({ queryKey: qk.accounts.all })
    },
  })
}
