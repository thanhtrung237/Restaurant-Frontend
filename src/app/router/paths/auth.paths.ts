export const AUTH_PATHS = {
  LOGIN: "/dang-nhap",
  PLATFORM_LOGIN: "/dang-nhap-quan-tri",
  FORGOT_PASSWORD: "/quen-mat-khau",
  FIRST_LOGIN_PASSWORD: "/doi-mat-khau-lan-dau",
} as const

const PLATFORM_HOSTNAME = "platform-admin.thanhtrung.click"

export function isPlatformHost() {
  const hostname = window.location.hostname.toLowerCase()
  const configuredHostname = import.meta.env.VITE_PLATFORM_HOSTNAME?.trim().toLowerCase()
  return hostname === PLATFORM_HOSTNAME || hostname === configuredHostname
}
