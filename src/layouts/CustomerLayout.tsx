import { Outlet, useParams } from "react-router-dom"
import { useTableSession } from "@/api/table-sessions.api"
import { getGuestCredential } from "@/lib/guest-credential"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { useCustomerWebSocket } from "@/hooks/use-customer-websocket"

/**
 * Layout cho Khách hàng — Thích ứng linh động với toàn bộ các thiết bị (iPhone, Android, Tablet, Desktop).
 *
 * Responsive:
 * - `min-h-dvh`: theo đúng chiều cao khả dụng trên mobile (hỗ trợ thanh địa chỉ ẩn/hiện).
 * - `w-full`: 100% full-width trên mọi thiết bị di động, không bị giới hạn cứng max-w-md.
 * - Các trang con có thể tràn viền header/banner 100% và co giãn nội dung tối ưu theo từng kích thước màn hình.
 * - `env(safe-area-inset-*)`: khoảng an toàn cho notch / home bar (iOS).
 */
export default function CustomerLayout() {
  const { qrCode } = useParams()
  const session = useCustomerSessionStore((state) =>
    state.qrCode === qrCode ? state.tableSession : null,
  )
  const sessionToken = useCustomerSessionStore((state) => state.sessionToken)
  const sessionId = getGuestCredential()?.sessionId === session?.id ? session?.id : undefined
  const { data: currentSession } = useTableSession(sessionId)
  useCustomerWebSocket(
    sessionId,
    currentSession?.restaurantId ?? session?.restaurantId,
    sessionToken,
    (currentSession?.status ?? session?.status) === "CLOSED",
  )

  return (
    <div
      className="flex min-h-dvh w-full min-w-0 flex-col bg-surface-page"
      style={{
        paddingLeft: "env(safe-area-inset-left)",
        paddingRight: "env(safe-area-inset-right)",
      }}
    >
      <Outlet />
    </div>
  )
}
