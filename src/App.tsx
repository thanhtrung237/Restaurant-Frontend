import { Suspense, useEffect } from "react"
import { RouterProvider } from "react-router-dom"
import { router } from "@/app/router"
import QueryProvider from "@/app/providers/QueryProvider"
import { Toaster } from "@/components/ui/toaster"
import { setUnauthorizedHandler } from "@/lib/auth-token"
import { useAuthStore } from "@/stores/auth.store"

/**
 * Nối interceptor 401 (lib/http.ts) với Zustand store: khi refresh-token thất bại
 * (hết hạn/bị thu hồi), notifyUnauthorized() bên lib/auth-token.ts sẽ chạy handler
 * này để clear useAuthStore — RequireAuth tự động điều hướng về trang Đăng nhập
 * ở lần render kế tiếp, không cần push route thủ công ở đây.
 */
function AuthSessionBridge() {
  const clearSession = useAuthStore((s) => s.clearSession)

  useEffect(() => {
    setUnauthorizedHandler(() => clearSession())
    return () => setUnauthorizedHandler(null)
  }, [clearSession])

  return null
}

function App() {
  return (
    <QueryProvider>
      <AuthSessionBridge />
      <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Đang tải...</div>}>
        <RouterProvider router={router} />
      </Suspense>
      <Toaster />
    </QueryProvider>
  )
}

export default App
