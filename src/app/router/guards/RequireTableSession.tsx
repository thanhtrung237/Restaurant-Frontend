import * as React from "react"
import { Navigate, Outlet, useParams } from "react-router-dom"
import {
  useCustomerSessionStore,
  syncCustomerSessionWithBackend,
} from "@/features/customer/store/session.store"
import { CUSTOMER_PATHS } from "@/app/router/paths"

/**
 * Chặn truy cập các màn hình cần phiên bàn ĐANG PHỤC VỤ (gọi món, giỏ hàng, hóa đơn...).
 * Tự động đồng bộ và phục hồi phiên từ Database nếu khách đóng trình duyệt hoặc F5.
 */
export default function RequireTableSession() {
  const { qrCode } = useParams<{ qrCode: string }>()
  const { qrCode: activeQrCode, sessionToken, tableSession } = useCustomerSessionStore()

  // Kiểm tra xem store đã có sẵn phiên hợp lệ chưa
  const hasValidActiveServingSession =
    Boolean(sessionToken) &&
    activeQrCode === qrCode &&
    tableSession?.status === "SERVING"

  const [checking, setChecking] = React.useState<boolean>(!hasValidActiveServingSession)
  const [resolvedStatus, setResolvedStatus] = React.useState<string | null>(
    hasValidActiveServingSession ? "SERVING" : null
  )

  React.useEffect(() => {
    let isMounted = true

    if (hasValidActiveServingSession) {
      setChecking(false)
      setResolvedStatus("SERVING")
      return
    }

    if (!qrCode) {
      setChecking(false)
      setResolvedStatus(null)
      return
    }

    setChecking(true)
    syncCustomerSessionWithBackend(qrCode)
      .then((session) => {
        if (!isMounted) return
        if (session) {
          setResolvedStatus(session.status)
        } else {
          setResolvedStatus(null)
        }
      })
      .catch(() => {
        if (isMounted) setResolvedStatus(null)
      })
      .finally(() => {
        if (isMounted) setChecking(false)
      })

    return () => {
      isMounted = false
    }
  }, [qrCode, hasValidActiveServingSession])

  if (checking) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-page min-h-dvh">
        <div className="flex flex-col items-center gap-3">
          <div className="size-10 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
          <p className="text-xs text-text-secondary">Đang kết nối phiên bàn...</p>
        </div>
      </div>
    )
  }

  // 1. Phiên SERVING: Khách gọi món bình thường
  if (resolvedStatus === "SERVING" || hasValidActiveServingSession) {
    return <Outlet />
  }

  // 2. Phiên đang chờ xác nhận: Cho phép xem trước thực đơn (read-only preview)
  if (resolvedStatus === "WAITING_FOR_OPEN") {
    return <Outlet />
  }

  // 3. Phiên đang chờ thanh toán: Cho phép vào hoá đơn / thanh toán
  if (resolvedStatus === "WAITING_FOR_PAY") {
    return <Outlet />
  }

  // 4. Bàn không có phiên đang mở: Đưa về trang Quét QR mở bàn
  return (
    <Navigate
      to={CUSTOMER_PATHS.TABLE_OPEN_QR.replace(":qrCode", qrCode ?? "")}
      replace
    />
  )
}
