import { getGuestCredential } from "@/lib/guest-credential"
import * as React from "react"
import { Client } from "@stomp/stompjs"
import SockJS from "sockjs-client"
import { useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { toast } from "@/hooks/use-toast"
import { ORDER_DETAIL_STATUS_LABEL } from "@/types/enums"
import type { OrderDetailStatus } from "@/types/enums"
import { getWsUrl } from "@/lib/ws"

export function useCustomerWebSocket(
  tableSessionId?: number,
  restaurantId?: number,
  sessionToken?: string | null,
  isClosed?: boolean,
) {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (!tableSessionId || getGuestCredential()?.sessionId !== tableSessionId) return
    let active = true
    const refreshSession = () => {
      for (const key of [
        qk.tableSessions.detail(tableSessionId),
        qk.tableSessions.billPreview(tableSessionId),
        qk.orders.bySession(tableSessionId).slice(0, 3),
        qk.orderDetails.bySession(tableSessionId).slice(0, 3),
        qk.invoices.bySession(tableSessionId),
      ]) {
        void queryClient.invalidateQueries({ queryKey: key })
      }
    }

    const client = new Client({
      webSocketFactory: () => new SockJS(getWsUrl()) as WebSocket,
      connectionTimeout: 10_000,
      reconnectDelay: 5000,
      beforeConnect: () => {
        client.connectHeaders = { "X-Guest-Token": getGuestCredential()?.token ?? "" }
      },
      onConnect: () => {
        if (!active) return
        client.subscribe(`/topic/session/${tableSessionId}/session-updated`, () => {
          if (active) refreshSession()
        })
        refreshSession()
        if (restaurantId != null) {
          const refreshMenu = () => {
            if (!active) return
            for (const queryKey of [
              qk.branchMenu.all,
              qk.branchDishStocks.all,
              qk.promotions.all,
            ]) {
              void queryClient.invalidateQueries({ queryKey })
            }
          }
          client.subscribe(`/topic/restaurant/${restaurantId}/menu-updated`, refreshMenu, {
            "X-Guest-Session": String(tableSessionId),
          })
          refreshMenu()
        }
        if (isClosed) return
        client.subscribe(`/topic/session/${tableSessionId}/item-status`, (msg) => {
          if (!active) return
          try {
            const data = JSON.parse(msg.body) as {
              type?: string
              orderDetailId: number
              status: OrderDetailStatus
            }
            // Invalidate queries ngay lập tức mà không cần polling (T-01)
            void queryClient.invalidateQueries({
              queryKey: qk.orderDetails.bySession(tableSessionId),
            })

            if (!(data.status in ORDER_DETAIL_STATUS_LABEL)) return
            const statusLabel = ORDER_DETAIL_STATUS_LABEL[data.status] || data.status
            toast({
              title: "Cập nhật món ăn",
              description: `Món ăn của bạn đã chuyển sang trạng thái: ${statusLabel}`,
              variant: "info",
            })
          } catch {
            // ignore
          }
        })
      },
    })

    client.activate()
    return () => {
      active = false
      void client.deactivate()
    }
  }, [tableSessionId, restaurantId, sessionToken, isClosed, queryClient])
}
