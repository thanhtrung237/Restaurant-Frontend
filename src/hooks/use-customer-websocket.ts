/**
 * useCustomerWebSocket — Kết nối STOMP/SockJS cho phía Khách hàng theo dõi trạng thái món.
 *
 * Subscribe topic:
 *   /topic/session/{sessionId}/item-status (FR-CUS-08, T-01: độ trễ ≤ 5s, không polling)
 *
 * Nhận trạng thái cập nhật món:
 *   PENDING (Đã nhận) → PENDING_WEIGHT (Đang cân) → PREPARING (Đang chế biến) → SERVED (Đã phục vụ)
 */

import * as React from "react"
import { Client } from "@stomp/stompjs"
import SockJS from "sockjs-client"
import { useQueryClient } from "@tanstack/react-query"
import { qk } from "@/lib/query-keys"
import { toast } from "@/hooks/use-toast"
import { ORDER_DETAIL_STATUS_LABEL } from "@/types/enums"
import type { OrderDetailStatus } from "@/types/enums"
import { getWsUrl } from "@/lib/ws"

export function useCustomerWebSocket(tableSessionId?: number) {
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (!tableSessionId) return

    const client = new Client({
      webSocketFactory: () => new SockJS(getWsUrl()) as WebSocket,
      reconnectDelay: 5000,
      onConnect: () => {
        client.subscribe(`/topic/session/${tableSessionId}/item-status`, (msg) => {
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

            const statusLabel = ORDER_DETAIL_STATUS_LABEL[data.status] || data.status
            toast({
              title: "Cập nhật món ăn",
              description: `Món ăn của bạn đã chuyển sang trạng thái: ${statusLabel}`,
              variant: "info",
            })
          } catch (_) {
            // ignore
          }
        })
      },
    })

    client.activate()
    return () => {
      client.deactivate()
    }
  }, [tableSessionId, queryClient])
}
