import { Navigate, Outlet } from "react-router-dom"
import { useCashierWaiter } from "@/hooks/use-cashier-waiter"
import { FORBIDDEN_PATH } from "@/app/router/post-login-target"

export default function RequireCashierWaiter() {
  const { allowed, loading } = useCashierWaiter()
  if (loading)
    return (
      <p className="p-4 text-sm" role="status">
        Đang kiểm tra phân công…
      </p>
    )
  return allowed ? <Outlet /> : <Navigate to={FORBIDDEN_PATH} replace />
}
