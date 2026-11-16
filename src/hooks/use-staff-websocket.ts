/**
 * useStaffWebSocket — Kết nối STOMP/SockJS đến backend và phân phát thông báo real-time.
 *
 * Subscribe các topic theo branchId:
 *   /topic/branch/{branchId}/new-order       → NEW_ORDER (FR-SRV-03)
 *   /topic/branch/{branchId}/payment-request → PAYMENT_REQUESTED (FR-CUS-10)
 *   /topic/branch/{branchId}/staff-call      → STAFF_CALL (FR-CUS-07)
 *
 * Khi branchId = null (Quản trị nhà hàng chưa chọn chi nhánh), hook không kết nối.
 * Tất cả thông báo lưu vào Zustand store (useNotificationStore) và bắn toast trực quan.
 */

import { getAccessToken } from "@/lib/auth-token"
import * as React from "react"
import { Client } from "@stomp/stompjs"
import SockJS from "sockjs-client"
import { useQueryClient } from "@tanstack/react-query"
import { useNotificationStore } from "@/stores/notification.store"
import { useAuthStore } from "@/stores/auth.store"
import { toast } from "@/hooks/use-toast"
import { qk } from "@/lib/query-keys"
import { getWsUrl } from "@/lib/ws"

/**
 * Chạy một bước của handler và KHÔNG để lỗi ở bước này làm mất các bước sau
 * (vd: lưu chuông lỗi vẫn phải hiện toast). Lỗi được log ra console thay vì nuốt im lặng.
 */
function safely(label: string, fn: () => void) {
  try {
    fn()
  } catch (err) {
    console.error(`[WS] ${label} lỗi:`, err)
  }
}

export function useStaffWebSocket() {
  const branchId = useAuthStore((s) => s.branchId)
  const addNotification = useNotificationStore((s) => s.addNotification)
  const queryClient = useQueryClient()

  React.useEffect(() => {
    if (!branchId) return

    const client = new Client({
      webSocketFactory: () => new SockJS(getWsUrl()) as WebSocket,
      reconnectDelay: 5000,
      beforeConnect: () => { client.connectHeaders = { Authorization: `Bearer ${getAccessToken() ?? ""}` } },
      onStompError: (frame) => console.error("[WS] STOMP error:", frame.headers["message"], frame.body),
      onWebSocketError: (evt) => console.error("[WS] Không kết nối được WebSocket:", evt),
      onConnect: () => {
        // FR-SRV-03: Order mới — Phục vụ và QL chi nhánh nhận thông báo trực quan để xác nhận order
        client.subscribe(`/topic/branch/${branchId}/new-order`, (msg) => {
          let data: {
            type: string
            orderId: number
            tableSessionId: number
            tableNo: string
          }
          try {
            data = JSON.parse(msg.body)
          } catch (err) {
            console.error("[WS] new-order: payload không phải JSON:", msg.body, err)
            return
          }
          const tableName = data.tableNo ? `Bàn ${data.tableNo}` : `Phiên #${data.tableSessionId}`
          safely("new-order/addNotification", () =>
            addNotification({
              type: "NEW_ORDER",
              title: "Order mới",
              body: `${tableName} vừa gửi order mới`,
              meta: data,
            }),
          )
          safely("new-order/toast", () =>
            toast({
              title: "Order mới!",
              description: `${tableName} vừa gửi order #${data.orderId}. Vui lòng kiểm tra và xác nhận.`,
              variant: "warning",
            }),
          )
          // Invalidate queries để danh sách order và sơ đồ bàn cập nhật tức thì
          safely("new-order/invalidate", () => {
            void queryClient.invalidateQueries({ queryKey: qk.orders.all })
            void queryClient.invalidateQueries({ queryKey: qk.orderDetails.all })
            void queryClient.invalidateQueries({ queryKey: qk.tableSessions.all })
          })
        })

        // FR-CUS-10: Yêu cầu tính tiền — Hiện ngay kèm số bàn
        client.subscribe(`/topic/branch/${branchId}/payment-request`, (msg) => {
          let data: {
            type: string
            tableSessionId: number
            tableNo: string
          }
          try {
            data = JSON.parse(msg.body)
          } catch (err) {
            console.error("[WS] payment-request: payload không phải JSON:", msg.body, err)
            return
          }
          const tableName = data.tableNo ? `Bàn ${data.tableNo}` : `Phiên #${data.tableSessionId}`
          safely("payment-request/addNotification", () =>
            addNotification({
              type: "PAYMENT_REQUESTED",
              title: "Yêu cầu tính tiền",
              body: `${tableName} yêu cầu thanh toán`,
              meta: data,
            }),
          )
          safely("payment-request/toast", () =>
            toast({
              title: "Khách yêu cầu tính tiền!",
              description: `${tableName} vừa gửi yêu cầu thanh toán.`,
              variant: "info",
            }),
          )
          safely("payment-request/invalidate", () => {
            void queryClient.invalidateQueries({ queryKey: qk.tableSessions.all })
          })
        })

        // FR-CUS-07: Báo nhân viên — Yêu cầu có trạng thái Chờ xử lý -> Đã xử lý
        client.subscribe(`/topic/branch/${branchId}/staff-call`, (msg) => {
          let data: {
            type: string
            tableSessionId: number
            orderDetailId: number | null
            tableNo: string
            dishName: string
          }
          try {
            data = JSON.parse(msg.body)
          } catch (err) {
            console.error("[WS] staff-call: payload không phải JSON:", msg.body, err)
            return
          }
          const tableName = data.tableNo ? `Bàn ${data.tableNo}` : `Phiên #${data.tableSessionId}`
          const content = data.dishName ? `Món "${data.dishName}"` : "Cần hỗ trợ"
          safely("staff-call/addNotification", () =>
            addNotification({
              type: "STAFF_CALL",
              title: "Khách báo nhân viên",
              body: `${tableName} · ${content}`,
              status: "PENDING",
              meta: data,
            }),
          )
          safely("staff-call/toast", () =>
            toast({
              title: "Khách gọi nhân viên!",
              description: `${tableName} đang gọi nhân viên: ${content}`,
              variant: "danger",
            }),
          )
        })
      },
    })

    client.activate()
    return () => {
      client.deactivate()
    }
  }, [branchId, addNotification, queryClient])
}