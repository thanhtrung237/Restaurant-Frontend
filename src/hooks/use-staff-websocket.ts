import { createElement, useEffect } from "react"
import { Client } from "@stomp/stompjs"
import SockJS from "sockjs-client"
import { useQueryClient } from "@tanstack/react-query"
import { DoorOpen } from "lucide-react"
import {
  getNotificationTableLabel,
  staffInboxKey,
  type StaffNotification,
} from "@/api/staff-notifications.api"
import { useNotificationRing } from "@/stores/notification.store"
import { useAuthStore } from "@/stores/auth.store"
import { toast } from "@/hooks/use-toast"
import { getAccessToken } from "@/lib/auth-token"
import { qk } from "@/lib/query-keys"
import { getWsUrl } from "@/lib/ws"

interface StaffEvent {
  type?: string
  notificationId?: number
  tableSessionId: number
  tableNo?: string
  orderId?: number
  orderedById?: number
  dishName?: string
}

export function useStaffWebSocket() {
  const branchId = useAuthStore((state) => state.branchId)
  const accountId = useAuthStore((state) => state.account?.id)
  const queryClient = useQueryClient()
  const ring = useNotificationRing((state) => state.ring)

  useEffect(() => {
    if (branchId == null || accountId == null) return
    let active = true
    const seen = new Set<string>()
    const inboxKey = staffInboxKey(accountId, branchId)
    const refreshInbox = () => void queryClient.invalidateQueries({ queryKey: inboxKey })
    const refreshOpenTables = () =>
      void queryClient.invalidateQueries({ queryKey: qk.tableSessions.openByBranch(branchId) })
    const refreshTakeaway = () =>
      void queryClient.invalidateQueries({ queryKey: qk.takeawayOrders.byBranch(branchId) })

    function claim(key: string | null) {
      if (!key) return true
      if (seen.has(key)) return false
      seen.add(key)
      if (seen.size > 100) {
        const oldest = seen.values().next().value
        if (oldest) seen.delete(oldest)
      }
      return true
    }

    function notifyTableOpen(table: string) {
      toast({
        title: "Khách yêu cầu mở bàn",
        description: table,
        icon: createElement(DoorOpen, { className: "size-4", "aria-hidden": true }),
        variant: "info",
      })
      refreshOpenTables()
    }

    // Pick up requests missed while the socket was down using the existing inbox refresh.
    // The initial snapshot is history and should not produce popups.
    const newestId = (notices: StaffNotification[]) =>
      notices.reduce((latest, notice) => Math.max(latest, notice.id), 0)
    const cachedInbox = queryClient.getQueryData<StaffNotification[]>(inboxKey)
    let lastInboxId = cachedInbox === undefined ? undefined : newestId(cachedInbox)
    const unsubscribeInbox = queryClient.getQueryCache().subscribe((event) => {
      if (
        event.type !== "updated" ||
        event.action.type !== "success" ||
        event.query !== queryClient.getQueryCache().find({ queryKey: inboxKey, exact: true })
      ) {
        return
      }
      const notices = queryClient.getQueryData<StaffNotification[]>(inboxKey)
      if (!notices) return
      const previousId = lastInboxId
      lastInboxId = Math.max(previousId ?? 0, newestId(notices))
      if (previousId === undefined) return

      for (const notice of [...notices].reverse()) {
        if (
          notice.id > previousId &&
          !notice.read &&
          !notice.resolvedAt &&
          notice.type === "TABLE_OPEN_REQUESTED" &&
          claim(`notification-${notice.id}`)
        ) {
          ring(branchId)
          notifyTableOpen(getNotificationTableLabel(notice.tableName, notice.tableSessionId))
        }
      }
    })

    const client = new Client({
      webSocketFactory: () => new SockJS(getWsUrl()) as WebSocket,
      connectionTimeout: 10_000,
      reconnectDelay: 5000,
      beforeConnect: () => {
        client.connectHeaders = { Authorization: `Bearer ${getAccessToken() ?? ""}` }
      },
      onStompError: (frame) =>
        console.error("[WS] STOMP error:", frame.headers["message"], frame.body),
      onWebSocketError: (error) => console.error("[WS] Không kết nối được WebSocket:", error),
      onConnect: () => {
        if (!active) return
        client.subscribe(`/topic/branch/${branchId}/takeaway-updated`, ({ body }) => {
          if (!active) return
          let event: StaffEvent
          try {
            event = JSON.parse(body)
          } catch {
            return
          }
          const sessionId = event?.tableSessionId
          if (!Number.isSafeInteger(sessionId) || sessionId <= 0) return
          refreshTakeaway()
          void queryClient.invalidateQueries({ queryKey: qk.tableSessions.detail(sessionId) })
          void queryClient.invalidateQueries({ queryKey: qk.tableSessions.billPreview(sessionId) })
          void queryClient.invalidateQueries({ queryKey: qk.tableSessions.openByBranch(branchId) })
          void queryClient.invalidateQueries({ queryKey: qk.orderDetails.bySession(sessionId) })
          void queryClient.invalidateQueries({ queryKey: qk.invoices.bySession(sessionId) })
        })
        refreshTakeaway()
        const subscribe = (
          topic: string,
          handle: (event: StaffEvent, tableName: string) => void,
        ) => {
          client.subscribe(`/topic/branch/${branchId}/${topic}`, ({ body }) => {
            if (!active) return
            let event: StaffEvent
            try {
              event = JSON.parse(body)
            } catch (error) {
              console.error("[WS] Thông báo không hợp lệ:", error)
              return
            }
            if (!Number.isSafeInteger(event?.tableSessionId)) return
            const key =
              event.notificationId != null
                ? `notification-${event.notificationId}`
                : event.orderId != null
                  ? `order-${event.orderId}`
                  : null
            if (!claim(key)) return
            refreshInbox()
            ring(branchId)
            handle(event, getNotificationTableLabel(event.tableNo, event.tableSessionId))
          })
        }

        subscribe("table-open-request", (_event, table) => {
          notifyTableOpen(table)
        })
        subscribe("new-order", (event, table) => {
          if (event.orderedById !== accountId) {
            toast({
              title: "Có món mới",
              description: `${table} · Lượt gọi #${event.orderId}`,
              variant: "warning",
            })
          }
          void queryClient.invalidateQueries({ queryKey: qk.orders.all })
          void queryClient.invalidateQueries({ queryKey: qk.orderDetails.all })
          void queryClient.invalidateQueries({ queryKey: qk.tableSessions.all })
        })
        subscribe("payment-request", (event, table) => {
          const title =
            event.type === "PAYMENT_QR_OPENED"
              ? "Khách đã mở mã QR thanh toán"
              : event.type === "BANK_PAYMENT_VERIFIED"
                ? "Ngân hàng đã xác nhận thanh toán"
                : event.type === "DISCOUNT_APPROVAL"
                  ? "Yêu cầu duyệt chiết khấu"
                  : "Yêu cầu tính tiền"
          toast({
            title,
            description: table,
            variant: event.type === "BANK_PAYMENT_VERIFIED" ? "success" : "info",
          })
          if (event.type === "BANK_PAYMENT_VERIFIED" || event.type === "DISCOUNT_APPROVAL") {
            void queryClient.invalidateQueries({
              queryKey: qk.invoices.bySession(event.tableSessionId),
            })
          }
          void queryClient.invalidateQueries({ queryKey: qk.tableSessions.all })
        })
        subscribe("staff-call", (event, table) => {
          toast({
            title: "Khách gọi nhân viên",
            description: event.dishName ? `${table} · Món “${event.dishName}”` : table,
            variant: "danger",
          })
        })
        refreshInbox()
        refreshOpenTables()
      },
    })
    client.activate()
    return () => {
      active = false
      unsubscribeInbox()
      void client.deactivate()
    }
  }, [accountId, branchId, queryClient, ring])
}
