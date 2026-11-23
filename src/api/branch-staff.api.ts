import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost, apiPut } from "@/lib/http"
import { useAuthStore } from "@/stores/auth.store"
import type { AccountStatus } from "@/types/enums"

export const branchStaffRoles = { WAITER: "Phục vụ", CASHIER: "Thu ngân" } as const
export type BranchStaffRole = keyof typeof branchStaffRoles

export interface BranchStaffMember {
  id: number
  fullName: string
  username: string
  employeeCode: string
  status: AccountStatus
  roles: string[]
  editable: boolean
}

export interface BranchStaffCreate {
  fullName: string
  username: string
  email?: string
  password: string
  roles: BranchStaffRole[]
}

type StaffChange = { create: BranchStaffCreate } | {
  accountId: number
  expected: string[]
  roles: BranchStaffRole[]
}

const staffPath = (branchId: number) => `/branches/${branchId}/staff`

function useStaffKey(branchId: number) {
  const account = useAuthStore((state) => state.account)
  return ["branch-staff", account?.id, account?.restaurantId, branchId] as const
}

export function useBranchStaff(branchId: number) {
  return useQuery({
    queryKey: useStaffKey(branchId),
    queryFn: () => apiGet<BranchStaffMember[]>(staffPath(branchId)),
  })
}

export function useSaveBranchStaff(branchId: number) {
  const key = useStaffKey(branchId)
  const cache = useQueryClient()
  return useMutation({
    mutationFn: (change: StaffChange) => {
      if ("create" in change) return apiPost<BranchStaffMember>(staffPath(branchId), change.create)
      return apiPut<BranchStaffMember>(`${staffPath(branchId)}/${change.accountId}/roles`, {
        expected: change.expected, roles: change.roles,
      })
    },
    onSuccess: (saved) => {
      cache.setQueryData<BranchStaffMember[]>(key, (previous) => [
        ...(previous ?? []).filter(({ id }) => id !== saved.id), saved,
      ].sort((a, b) => a.fullName.localeCompare(b.fullName, "vi") || a.id - b.id))
      void cache.invalidateQueries({ queryKey: key })
    },
  })
}
