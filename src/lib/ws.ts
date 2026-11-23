/**
 * Utility lấy URL WebSocket STOMP/SockJS
 */

export function getWsUrl(): string {
  if (import.meta.env.VITE_WS_URL) return import.meta.env.VITE_WS_URL
  const apiBase = import.meta.env.VITE_API_BASE_URL
  if (apiBase) {
    return apiBase.replace(/\/api\/v1\/?$/, "") + "/ws"
  }
  if (import.meta.env.DEV) return "/ws"
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost"
  return `http://${host}:8080/ws`
}
