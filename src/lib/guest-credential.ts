import { CUSTOMER_BASE, LEGACY_CUSTOMER_BASE } from "@/app/router/paths/customer.paths"

/** A guest capability is kept per tab. Never manufacture credentials from session IDs. */
const KEY = "restaurant-guest-credential-v1"
interface Credential {
  sessionId: number
  token: string
}
export function getGuestCredential(): Credential | null {
  try {
    const value: unknown = JSON.parse(sessionStorage.getItem(KEY) ?? "null")
    if (
      value &&
      typeof value === "object" &&
      "sessionId" in value &&
      "token" in value &&
      typeof value.sessionId === "number" &&
      typeof value.token === "string"
    )
      return value as Credential
  } catch {
    /* Storage can be unavailable in private mode. */
  }
  return null
}
export function saveGuestCredential(sessionId: number, token: string) {
  sessionStorage.setItem(KEY, JSON.stringify({ sessionId, token }))
}
export function clearGuestCredential() {
  sessionStorage.removeItem(KEY)
}
export function isCustomerPage() {
  const pathname = window.location.pathname.toLowerCase()
  return [CUSTOMER_BASE, LEGACY_CUSTOMER_BASE].some((base) => pathname.startsWith(`${base}/`))
}
