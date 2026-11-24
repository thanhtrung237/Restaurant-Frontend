import { useQuery } from "@tanstack/react-query"
import { apiGet } from "@/lib/http"
import { useAuthStore } from "@/stores/auth.store"

export type OperationalPermission =
  | "RESERVE_TABLE"
  | "CONFIRM_ORDER"
  | "WEIGH_ORDER"
  | "SERVE_ORDER"
  | "MANAGE_STOCK"
  | "VIEW_REPORT"
  | "EXPORT_REPORT"

export interface PermissionItem {
  code: OperationalPermission
  group: string
  label: string
}

interface BranchPermissions {
  branchId?: number
  branchName: string
  permissions: PermissionItem[]
}

const root = ["operational-permissions"] as const
const endpoint = "/operational-permissions"

export function useEmployeeOperationalPermissions(employeeId?: number) {
  const account = useAuthStore((state) => state.account)
  return useQuery({
    queryKey: [...root, "employee", account?.id, account?.restaurantId, employeeId],
    queryFn: () => apiGet<BranchPermissions[]>(`${endpoint}/employees/${employeeId}`),
    enabled: employeeId !== undefined && Boolean(account),
  })
}

export function useBranchOperationalPermissions(branchId?: number | null) {
  const account = useAuthStore((state) => state.account)
  const role = useAuthStore((state) => state.role)
  const query = useQuery({
    queryKey: [...root, "branch", account?.id, account?.restaurantId, branchId],
    queryFn: () => apiGet<OperationalPermission[]>(`${endpoint}/branches/${branchId}/me`),
    enabled: Boolean(account && role && role !== "RESTAURANT_ADMIN" && branchId != null),
    staleTime: 5000,
    refetchInterval: 15000,
  })
  return {
    ...query,
    can: (permission: OperationalPermission) =>
      role === "RESTAURANT_ADMIN" || (query.data?.includes(permission) ?? false),
  }
}
