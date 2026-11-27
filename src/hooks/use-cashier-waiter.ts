import { useAssignmentsByAccount } from "@/api/assignments.api"
import { APP_ROLE, mapRoleCodeToAppRole } from "@/config/roles"
import { useAuthStore } from "@/stores/auth.store"

export function useCashierWaiter() {
  const role = useAuthStore((state) => state.role)
  const accountId = useAuthStore((state) => state.account?.id)
  const branchId = useAuthStore((state) => state.branchId)
  const enabled = role === APP_ROLE.CASHIER && branchId != null
  const assignments = useAssignmentsByAccount(enabled ? accountId : undefined)
  return {
    loading: enabled && assignments.isLoading,
    allowed:
      enabled &&
      assignments.isSuccess &&
      [APP_ROLE.CASHIER, APP_ROLE.WAITER].every((requiredRole) =>
        assignments.data.some(
          (assignment) =>
            assignment.branchId === branchId &&
            mapRoleCodeToAppRole(assignment.roleCode) === requiredRole,
        ),
      ),
  }
}
