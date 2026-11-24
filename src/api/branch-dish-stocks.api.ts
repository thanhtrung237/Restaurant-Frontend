import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiPut, apiGet } from "@/lib/http"
import type { BranchDishStock } from "@/types/models"
import { qk } from "@/lib/query-keys"

// ============================================================================
// Query Keys
// ============================================================================

export const branchDishStocksKeys = {
  all: ["branch-dish-stocks"] as const,
  byBranch: (branchId: number) => [...branchDishStocksKeys.all, "branch", branchId] as const,
  outOfStock: (branchId: number) =>
    [...branchDishStocksKeys.byBranch(branchId), "out-of-stock"] as const,
}

function invalidateBranchStock(queryClient: ReturnType<typeof useQueryClient>, branchId: number) {
  return Promise.all([
    queryClient.invalidateQueries({ queryKey: qk.branchMenu.overview(branchId) }),
    queryClient.invalidateQueries({ queryKey: qk.branchMenu.forCustomer(branchId) }),
    queryClient.invalidateQueries({ queryKey: branchDishStocksKeys.outOfStock(branchId) }),
  ])
}

// ============================================================================
// API Functions
// ============================================================================

/**
 * Toggle stock status for a dish at a specific branch.
 * BE toggles inStock: true <-> false. No explicit value sent.
 * Requires: MANAGER or BRANCH_MANAGER (for assigned branch only)
 */
async function toggleBranchDishStock(branchId: number, dishId: number): Promise<BranchDishStock> {
  return apiPut<BranchDishStock>(`/branch-dish-stocks/branch/${branchId}/dish/${dishId}/toggle`)
}

/**
 * Restore all out-of-stock dishes for a branch.
 * Sets inStock = true for all dishes at the branch.
 * Requires: MANAGER or BRANCH_MANAGER (for assigned branch only)
 */
async function restoreAllBranchStock(branchId: number): Promise<void> {
  return apiPut<void>(`/branch-dish-stocks/branch/${branchId}/restore-all`)
}

/**
 * Get list of out-of-stock dishes for a branch.
 * Returns dishes where inStock = false.
 * Requires: MANAGER or BRANCH_MANAGER (for assigned branch only)
 */
async function getOutOfStockDishes(branchId: number): Promise<BranchDishStock[]> {
  return apiGet<BranchDishStock[]>(`/branch-dish-stocks/branch/${branchId}/out-of-stock`)
}

// ============================================================================
// React Query Hooks
// ============================================================================

/**
 * Hook to toggle stock status (in stock <-> out of stock).
 * Invalidates branch menu overview and out-of-stock list.
 */
export function useToggleBranchDishStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ branchId, dishId }: { branchId: number; dishId: number }) =>
      toggleBranchDishStock(branchId, dishId),
    onSuccess: (_, { branchId }) => invalidateBranchStock(queryClient, branchId),
  })
}

/**
 * Hook to restore all out-of-stock dishes to in-stock.
 */
export function useRestoreAllBranchStock() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (branchId: number) => restoreAllBranchStock(branchId),
    onSuccess: (_, branchId) => invalidateBranchStock(queryClient, branchId),
  })
}

/**
 * Hook to get list of out-of-stock dishes.
 */
export function useOutOfStockDishes(branchId?: number) {
  return useQuery({
    queryKey: branchDishStocksKeys.outOfStock(branchId ?? -1),
    queryFn: () => getOutOfStockDishes(branchId as number),
    enabled: !!branchId,
  })
}
