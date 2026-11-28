export const AUTH_PATHS = {
  LOGIN: "/login",
  PLATFORM_LOGIN: "/platform-login",
  FORGOT_PASSWORD: "/forgot-password",
  FIRST_LOGIN_PASSWORD: "/first-login-password",
} as const

const PLATFORM_HOSTNAME = "platform-admin.thanhtrung.click"

export function isPlatformHost() {
  const hostname = window.location.hostname.toLowerCase()
  const configuredHostname = import.meta.env.VITE_PLATFORM_HOSTNAME?.trim().toLowerCase()
  return hostname === PLATFORM_HOSTNAME || hostname === configuredHostname
}
