import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { apiDelete, apiGet, apiPut } from "@/lib/http"
import { useAuthStore } from "@/stores/auth.store"

export interface StaffNotification {
  id: number
  branchId: number
  tableSessionId: number
  tableName: string
  type: "NEW_ORDER" | "PAYMENT_REQUESTED" | "STAFF_CALL" | "PAYMENT_QR_OPENED" | "BANK_PAYMENT_VERIFIED" | "DISCOUNT_APPROVAL"
  orderId?: number | null
  orderDetailId?: number | null
  dishName?: string | null
  createdAt: string
  resolvedAt?: string | null
  read: boolean
}

type InboxAction =
  | { type: "read" | "resolve"; id: number }
  | { type: "readAll" | "hideAll" }

export const staffInboxKey = (accountId?: number, branchId?: number | null) =>
  ["staff-notifications", accountId, branchId] as const

export function getNotificationTableLabel(tableName: string | undefined | null, sessionId: number) {
  const name = tableName?.trim()
  if (!name) return `Phiên #${sessionId}`
  if (name.startsWith("Mang về #")) return name
  return /^bàn(?:\s|$)/iu.test(name) ? name[0].toLocaleUpperCase("vi-VN") + name.slice(1) : `Bàn ${name}`
}

export function useStaffInbox() {
  const branchId = useAuthStore((state) => state.branchId)
  const accountId = useAuthStore((state) => state.account?.id)
  const enabled = branchId != null && accountId != null
  const path = `/staff-notifications/branch/${branchId}`
  const key = staffInboxKey(accountId, branchId)
  const queryClient = useQueryClient()
  const inbox = useQuery({
    queryKey: key,
    queryFn: ({ signal }) => apiGet<StaffNotification[]>(path, { signal }),
    enabled,
    refetchInterval: 10_000,
    staleTime: 5_000,
  })
  const action = useMutation({
    mutationFn: (request: InboxAction) => {
      if (request.type === "hideAll") return apiDelete(path)
      if (request.type === "readAll") return apiPut<void>(`${path}/read`)
      if ("id" in request) return apiPut<void>(`${path}/${request.id}/${request.type}`)
      throw new Error("Thao tác thông báo không hợp lệ.")
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: key }),
  })
  return { branchId, enabled, inbox, action }
}
