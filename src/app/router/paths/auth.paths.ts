export const AUTH_PATHS = {
  LOGIN: "/dang-nhap",
  PLATFORM_LOGIN: "/dang-nhap-quan-tri",
  FORGOT_PASSWORD: "/quen-mat-khau",
  FIRST_LOGIN_PASSWORD: "/doi-mat-khau-lan-dau",
} as const

export function isPlatformHost() {
  const hostname = import.meta.env.VITE_PLATFORM_HOSTNAME?.trim().toLowerCase()
  return Boolean(hostname && window.location.hostname.toLowerCase() === hostname)
}
