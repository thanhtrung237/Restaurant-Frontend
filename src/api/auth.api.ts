import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiPost } from "@/lib/http"
import { clearTokens, setTokens } from "@/lib/auth-token"
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
 * `POST /auth/logout` — BE đọc refresh token từ header/cookie để thu hồi.
 * Xem ghi chú CORS trong `lib/http.ts`: header `Refresh-Token` hiện bị chặn,
 * nên logout có thể không thu hồi được token ở phía server cho tới khi BE sửa CORS.
 * FE vẫn phải clear token phía client trong mọi trường hợp.
 */
export function logout() {
  return apiPost<void>("/auth/logout")
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
    onSuccess: (data) => {
      setTokens({ accessToken: data.accessToken, refreshToken: data.refreshToken })
    },
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
