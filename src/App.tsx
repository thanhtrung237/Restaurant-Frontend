import { Suspense, useEffect, useState, type ReactNode } from "react"
import { useQueryClient } from "@tanstack/react-query"
import { RouterProvider } from "react-router-dom"
import { router } from "@/app/router"
import QueryProvider from "@/app/providers/QueryProvider"
import { Toaster } from "@/components/ui/toaster"
import { Toaster as SonnerToaster } from "sonner"
import { setUnauthorizedHandler } from "@/lib/auth-token"
import { isCustomerPage } from "@/lib/guest-credential"
import { isApiStatus, restoreAccessToken } from "@/lib/http"
import { AUTH_SELECTION_KEY, useAuthStore } from "@/stores/auth.store"

function AuthSessionBridge({ children }: { children: ReactNode }) {
  const clearSession = useAuthStore((s) => s.clearSession)
  const queryClient = useQueryClient()
  const [state, setState] = useState(() =>
    !isCustomerPage() && useAuthStore.getState().account?.id ? "restoring" : "ready",
  )

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession()
      queryClient.clear()
    })

    function syncSession(event: StorageEvent) {
      const currentAccount = useAuthStore.getState().account
      if (event.key !== AUTH_SELECTION_KEY || !currentAccount || isCustomerPage()) return

      const saved = JSON.parse(event.newValue ?? "null")
      if (saved?.state?.account?.id !== currentAccount.id) window.location.reload()
    }

    window.addEventListener("storage", syncSession)
    return () => {
      setUnauthorizedHandler(null)
      window.removeEventListener("storage", syncSession)
    }
  }, [clearSession, queryClient])

  useEffect(() => {
    const { account, confirmSession } = useAuthStore.getState()
    if (state !== "restoring" || !account) return

    let active = true
    void restoreAccessToken(account.id)
      .then(() => {
        if (!active) return
        confirmSession()
        setState("ready")
      })
      .catch((error) => {
        if (!active) return
        if (isApiStatus(error, 401)) {
          clearSession()
          setState("ready")
        } else {
          setState("unavailable")
        }
      })
    return () => {
      active = false
    }
  }, [clearSession, state])

  if (state === "restoring") {
    return (
      <div className="p-6 text-sm text-muted-foreground" role="status">
        Đang khôi phục phiên...
      </div>
    )
  }
  if (state === "unavailable") {
    return (
      <div className="p-6 text-sm" role="alert">
        Không thể khôi phục phiên.{" "}
        <button className="underline" onClick={() => setState("restoring")}>
          Thử lại
        </button>
      </div>
    )
  }
  return children
}

function App() {
  return (
    <QueryProvider>
      <AuthSessionBridge>
        <Suspense fallback={<div className="p-6 text-sm text-muted-foreground">Đang tải...</div>}>
          <RouterProvider router={router} />
        </Suspense>
      </AuthSessionBridge>
      <Toaster />
      <SonnerToaster position="top-right" />
    </QueryProvider>
  )
}

export default App
