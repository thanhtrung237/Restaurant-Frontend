import { useMutation, useQueryClient } from "@tanstack/react-query"
import { changeBranchStatus } from "@/api/branches.api"
import { qk } from "@/lib/query-keys"
import type { BranchStatus } from "@/types/enums"

/**
 * Hook để thay đổi trạng thái chi nhánh (ACTIVE/INACTIVE)
 */
export function useChangeBranchStatus() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (vars: { id: number; status: BranchStatus }) =>
      changeBranchStatus(vars.id, vars.status),
    onSuccess: () => void qc.invalidateQueries({ queryKey: qk.branches.all }),
  })
}
