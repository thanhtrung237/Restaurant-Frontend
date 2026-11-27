import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiPost } from "@/lib/http"
import { clearTokens, getRefreshToken } from "@/lib/auth-token"
import type { LoginResponse, RefreshTokenResponse } from "@/types/models"
import type { LoginRequest } from "@/types/requests"

/** `POST /auth/login` — công khai. Bắt buộc 3 field: restaurantCode, username, password. */
export function login(body: LoginRequest) {
  return apiPost<LoginResponse>("/auth/login", body)
}

/**
 * `POST /auth/refresh-token` — token gửi qua header `Refresh-Token`.
 * Bình thường KHÔNG gọi tay: interceptor trong `lib/http.ts` tự lo khi gặp 401.
 */
export function refreshToken(token: string) {
  return apiPost<RefreshTokenResponse>("/auth/refresh-token", null, {
    headers: { "Refresh-Token": token },
  })
}

/**
 * `POST /auth/logout` — BE đọc refresh token từ header `Refresh-Token` để thu hồi
 * (`AuthServiceImpl.getRefreshTokenFromRequest`). Trước đây hàm này KHÔNG gửi header
 * nào cả nên BE luôn nhận null → refresh token không bao giờ bị thu hồi phía server.
 * FE vẫn phải clear token phía client trong mọi trường hợp (xem `useLogoutMutation`).
 */
export function logout() {
  const token = getRefreshToken()
  return apiPost<void>("/auth/logout", null, {
    headers: token ? { "Refresh-Token": token } : undefined,
  })
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
  })
}

export function useLogoutMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      try {
        await logout()
      } catch {
        // Server từ chối cũng vẫn đăng xuất ở client — không để người dùng kẹt lại.
      }
    },
    onSettled: () => {
      clearTokens()
      qc.clear()
    },
  })
}
