/**
 * Nơi duy nhất giữ access/refresh token.
 *
 * Tách riêng khỏi `stores/auth.store.ts` để tránh phụ thuộc vòng:
 * `http.ts` cần đọc token, mà `auth.store` lại gọi API qua `http.ts`.
 * Store sẽ gọi `setTokens()`/`clearTokens()`; interceptor chỉ đọc từ đây.
 *
 * Lưu ở `localStorage` để giữ phiên khi F5. Đây là đánh đổi có ý thức: token nằm trong
 * localStorage thì script XSS đọc được. Backend hiện trả `refreshToken` trong body
 * `LoginResponse` và KHÔNG set cookie httpOnly, nên FE buộc phải tự giữ.
 * Nếu sau này BE chuyển sang cookie httpOnly thì bỏ phần `refreshToken` ở đây đi.
 */
const STORAGE_KEY = "pho-viet-auth-tokens"

export interface AuthTokens {
  accessToken: string | null
  refreshToken: string | null
}

let tokens: AuthTokens = { accessToken: null, refreshToken: null }
let unauthorizedHandler: (() => void) | null = null

function read(): AuthTokens {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return { accessToken: null, refreshToken: null }
    const parsed = JSON.parse(raw) as Partial<AuthTokens>
    return { accessToken: parsed.accessToken ?? null, refreshToken: parsed.refreshToken ?? null }
  } catch {
    return { accessToken: null, refreshToken: null }
  }
}

// Khôi phục ngay khi module được nạp (trước lần gọi API đầu tiên).
tokens = read()

export function getAccessToken(): string | null {
  return tokens.accessToken
}

export function getRefreshToken(): string | null {
  return tokens.refreshToken
}

export function setTokens(next: AuthTokens): void {
  tokens = next
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next))
  } catch {
    // localStorage bị chặn (chế độ riêng tư) — vẫn chạy được trong phiên hiện tại.
  }
}

export function clearTokens(): void {
  tokens = { accessToken: null, refreshToken: null }
  try {
    localStorage.removeItem(STORAGE_KEY)
  } catch {
    // bỏ qua
  }
}

/**
 * Đăng ký hàm chạy khi refresh token thất bại (token hết hạn / bị thu hồi).
 * Thường dùng để clear auth store và điều hướng về trang Đăng nhập — sẽ nối ở Phase 5.
 */
export function setUnauthorizedHandler(handler: (() => void) | null): void {
  unauthorizedHandler = handler
}

export function notifyUnauthorized(): void {
  unauthorizedHandler?.()
}
