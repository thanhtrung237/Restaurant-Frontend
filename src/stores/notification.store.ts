/**
 * Zustand store cho thông báo real-time của nhân viên (không persist — reset khi F5
 * vì thông báo cũ mất đi khi reconnect WebSocket là hành vi phù hợp).
 */

import { create } from "zustand"

export type NotificationType = "NEW_ORDER" | "PAYMENT_REQUESTED" | "STAFF_CALL" | "ITEM_STATUS_CHANGED"
export type NotificationStatus = "PENDING" | "RESOLVED"

export interface StaffNotification {
  id: string          // uuid để key React
  type: NotificationType
  title: string
  body: string
  status?: NotificationStatus // Cho yêu cầu "Báo nhân viên": Chờ xử lý -> Đã xử lý (FR-CUS-07)
  meta?: Record<string, unknown>
  createdAt: number   // Date.now()
  read: boolean
}

interface NotificationState {
  notifications: StaffNotification[]
  unreadCount: number
  isRinging: boolean // Animation chuông rung rung trong khoảng 1 phút khi có thông báo mới
  addNotification: (n: Omit<StaffNotification, "id" | "createdAt" | "read">) => void
  markAllRead: () => void
  markRead: (id: string) => void
  toggleResolved: (id: string) => void
  stopRinging: () => void
  clearAll: () => void
}

let ringingTimeoutId: ReturnType<typeof setTimeout> | null = null

/**
 * Sinh id cho thông báo.
 * `crypto.randomUUID` CHỈ có trong "secure context" (HTTPS hoặc localhost). Khi mở FE qua
 * `http://192.168.x.x:5173` (điện thoại / tablet trong mạng LAN) hàm này là `undefined` →
 * ném TypeError → thông báo bị mất hoàn toàn. Nên luôn có đường lùi.
 */
let fallbackSeq = 0
function newNotificationId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID()
  }
  fallbackSeq += 1
  return `n-${Date.now().toString(36)}-${fallbackSeq}-${Math.random().toString(36).slice(2, 8)}`
}

export const useNotificationStore = create<NotificationState>((set) => ({
  notifications: [],
  unreadCount: 0,
  isRinging: false,

  addNotification: (n) => {
    const notif: StaffNotification = {
      ...n,
      id: newNotificationId(),
      createdAt: Date.now(),
      read: false,
      status: n.status ?? (n.type === "STAFF_CALL" ? "PENDING" : undefined),
    }

    // Bật animation chuông rung trong khoảng 1 phút (60 giây)
    if (ringingTimeoutId) clearTimeout(ringingTimeoutId)
    ringingTimeoutId = setTimeout(() => {
      set({ isRinging: false })
      ringingTimeoutId = null
    }, 60000)

    set((state) => ({
      notifications: [notif, ...state.notifications].slice(0, 50), // giữ tối đa 50
      unreadCount: state.unreadCount + 1,
      isRinging: true,
    }))
  },

  stopRinging: () => {
    if (ringingTimeoutId) {
      clearTimeout(ringingTimeoutId)
      ringingTimeoutId = null
    }
    set({ isRinging: false })
  },

  markAllRead: () => {
    if (ringingTimeoutId) {
      clearTimeout(ringingTimeoutId)
      ringingTimeoutId = null
    }
    set((state) => ({
      notifications: state.notifications.map((n) => ({ ...n, read: true })),
      unreadCount: 0,
      isRinging: false,
    }))
  },

  markRead: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) =>
        n.id === id ? { ...n, read: true } : n
      )
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      }
    }),

  toggleResolved: (id) =>
    set((state) => {
      const updated = state.notifications.map((n) => {
        if (n.id !== id) return n
        const nextStatus: NotificationStatus = n.status === "RESOLVED" ? "PENDING" : "RESOLVED"
        return { ...n, status: nextStatus, read: true }
      })
      return {
        notifications: updated,
        unreadCount: updated.filter((n) => !n.read).length,
      }
    }),

  clearAll: () => {
    if (ringingTimeoutId) {
      clearTimeout(ringingTimeoutId)
      ringingTimeoutId = null
    }
    set({ notifications: [], unreadCount: 0, isRinging: false })
  },
}))