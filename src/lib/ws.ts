/**
 * Utility lấy URL WebSocket STOMP/SockJS
 */

export function getWsUrl(): string {
  const configured = import.meta.env.VITE_WS_URL?.trim()
  if (configured) {
    // SockJS starts with an HTTP(S) request to /info before upgrading.
    return configured.replace(/^wss:/i, "https:").replace(/^ws:/i, "http:").replace(/\/+$/, "")
  }
  const apiBase = import.meta.env.VITE_API_BASE_URL?.trim()
  if (apiBase) {
    return apiBase.replace(/\/+$/, "").replace(/\/api\/v1$/, "") + "/ws"
  }
  if (import.meta.env.DEV) return "/ws"
  const host = typeof window !== "undefined" ? window.location.hostname : "localhost"
  return `http://${host}:8080/ws`
}
