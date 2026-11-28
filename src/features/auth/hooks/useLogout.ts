import * as React from "react"
import { useNavigate } from "react-router-dom"
import { useLogoutMutation } from "@/api/auth.api"
import { useAuthStore } from "@/stores/auth.store"
import { AUTH_PATHS } from "@/app/router/paths"
import { APP_ROLE } from "@/config/roles"
import { toast } from "sonner"

export function useLogout() {
  const navigate = useNavigate()
  const clearSession = useAuthStore((s) => s.clearSession)
  const isPlatform = useAuthStore((s) => s.role === APP_ROLE.PLATFORM_ADMIN)
  const logoutMutation = useLogoutMutation()
  const { mutateAsync } = logoutMutation

  const logout = React.useCallback(async () => {
    try {
      await mutateAsync()
    } catch {
      toast.error("Không thể đăng xuất. Vui lòng thử lại.")
      return
    }
    clearSession()
    navigate(isPlatform ? AUTH_PATHS.PLATFORM_LOGIN : AUTH_PATHS.LOGIN, { replace: true })
  }, [mutateAsync, clearSession, isPlatform, navigate])

  return { logout, isLoggingOut: logoutMutation.isPending }
}
