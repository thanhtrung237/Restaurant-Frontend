import { useMutation, useQueryClient } from "@tanstack/react-query"
import { apiPost, COOKIE_AUTH_CONFIG } from "@/lib/http"
import { clearTokens } from "@/lib/auth-token"
import type { LoginResponse } from "@/types/models"
import type { LoginRequest } from "@/types/requests"

/** `POST /auth/login` — công khai. Bắt buộc 3 field: restaurantCode, username, password. */
export function login(body: LoginRequest) {
  return apiPost<LoginResponse>("/auth/login", body, COOKIE_AUTH_CONFIG)
}

export function logout() {
  return apiPost<void>("/auth/logout", null, COOKIE_AUTH_CONFIG)
}

export function useLoginMutation() {
  return useMutation({
    mutationFn: login,
  })
}

export function useLogoutMutation() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: logout,
    onSuccess: () => {
      clearTokens()
      qc.clear()
    },
  })
}
