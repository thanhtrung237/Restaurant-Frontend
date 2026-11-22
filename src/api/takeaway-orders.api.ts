import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiGet, apiPost, apiPut } from "@/lib/http"
import { qk } from "@/lib/query-keys"
import type { OrderDetailAddRequest } from "@/types/requests"
import type { TableSessionStatus } from "@/types/enums"

export interface TakeawayOrder {
  id: number
  label: string
  customerName?: string | null
  openedAt: string
  portions: number
  kitchenStatus: "PENDING" | "PREPARING" | "READY" | "EMPTY"
  paid: boolean
  invoiceId?: number | null
  sessionStatus: TableSessionStatus
  canAddTakeawayItems?: boolean
}

export const takeawayOrdersKey = qk.takeawayOrders.byBranch
const path = (branchId: number) => `/takeaway-orders/branch/${branchId}`

export function useTakeawayOrders(branchId?: number) {
  return useQuery({
    queryKey: takeawayOrdersKey(branchId),
    enabled: branchId != null,
    queryFn: ({ signal }) => apiGet<TakeawayOrder[]>(path(branchId!), { signal }),
    refetchInterval: 3000,
  })
}

export function useCreateTakeaway() {
  const client = useQueryClient()
  return useMutation({
    mutationFn: ({ branchId, ...order }: { branchId: number; customerName?: string; items: OrderDetailAddRequest[] }) =>
      apiPost<TakeawayOrder>(path(branchId), order),
    onSuccess: (_, { branchId }) => {
      void client.invalidateQueries({ queryKey: takeawayOrdersKey(branchId) })
      void client.invalidateQueries({ queryKey: qk.tableSessions.all })
    },
  })
}

export function useHandoffTakeaway(branchId: number) {
  const client = useQueryClient()
  return useMutation({
    mutationFn: (id: number) => apiPut<void>(`${path(branchId)}/${id}/handoff`),
    onSuccess: async () => {
      await client.invalidateQueries({ queryKey: takeawayOrdersKey(branchId) })
      void client.invalidateQueries({ queryKey: qk.tableSessions.all })
    },
  })
}
