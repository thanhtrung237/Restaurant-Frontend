import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { PageResponse } from "@/types/api"
import type { Account } from "@/types/models"
import type { AccountStatus } from "@/types/enums"
import type { AccountAddRequest, AccountListParams, AccountUpdateRequest } from "@/types/requests"

export function getAccount(id: number) {
  return apiGet<Account>(`/accounts/${id}`)
}
export function getAccountByUsername(username: string) {
  return apiGet<Account>(`/accounts/username/${username}`)
}
export function listAccounts(params?: AccountListParams) {
  return apiGet<PageResponse<Account>>("/accounts", { params })
}
export function getAccountsByRestaurant(restaurantId: number) {
  return apiGet<Account[]>(`/accounts/restaurant/${restaurantId}`)
}
export function createAccount(body: AccountAddRequest) {
  return apiPost<Account>("/accounts", body)
}
export function updateAccount(id: number, body: AccountUpdateRequest) {
  return apiPut<Account>(`/accounts/${id}`, body)
}
/** Tham số truyền qua query string, KHÔNG phải body. */
export function changeAccountStatus(id: number, status: AccountStatus) {
  return apiPut<Account>(`/accounts/${id}/status`, null, { params: { status } })
}
export function changePassword(id: number, oldPassword: string, newPassword: string) {
  return apiPut<void>(`/accounts/${id}/change-password`, null, { params: { oldPassword, newPassword } })
}
/** Admin đặt lại mật khẩu hộ — dùng cho luồng "Quên mật khẩu" (BE không có endpoint tự phục hồi). */
export function resetPassword(id: number, newPassword: string) {
  return apiPut<void>(`/accounts/${id}/reset-password`, null, { params: { newPassword } })
}
export function deleteAccount(id: number) {
  return apiDelete<void>(`/accounts/${id}`)
}

export function useAccount(id?: number) {
  return useQuery({
    queryKey: qk.accounts.detail(id as number),
    queryFn: () => getAccount(id as number),
    enabled: typeof id === "number",
  })
}
export function useAccountsByRestaurant(restaurantId?: number) {
  return useQuery({
    queryKey: qk.accounts.byRestaurant(restaurantId as number),
    queryFn: () => getAccountsByRestaurant(restaurantId as number),
    enabled: typeof restaurantId === "number",
  })
}
export function useAccountsPage(params?: AccountListParams) {
  return useQuery({ queryKey: qk.accounts.list(params), queryFn: () => listAccounts(params) })
}
export function useCreateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: createAccount,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.accounts.all }),
  })
}
export function useUpdateAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; body: AccountUpdateRequest }) => updateAccount(vars.id, vars.body),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.accounts.all }),
  })
}
export function useChangeAccountStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; status: AccountStatus }) => changeAccountStatus(vars.id, vars.status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.accounts.all }),
  })
}
export function useChangePassword() {
  return useMutation({
    mutationFn: (vars: { id: number; oldPassword: string; newPassword: string }) =>
      changePassword(vars.id, vars.oldPassword, vars.newPassword),
  })
}
export function useDeleteAccount() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: deleteAccount,
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.accounts.all }),
  })
}
