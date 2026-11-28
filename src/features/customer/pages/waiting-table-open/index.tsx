import * as React from "react"
import { useNavigate, useParams, useLocation, generatePath } from "react-router-dom"
import { Clock, List, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { useGoBack } from "@/hooks/use-go-back"
import {
  useCustomerSessionStore,
  syncCustomerSessionWithBackend,
} from "@/features/customer/store/session.store"
import { useTableSession } from "@/features/customer/api"

const POLL_INTERVAL_MS = 1000 // Poll mỗi 1 giây để chuyển trang ngay lập tức khi phục vụ mở bàn

interface LocationState {
  tableName?: string
  tableSessionId?: number
  guestCount?: number | string
}

/**
 * Chờ mở bàn — Poll session status cho đến khi Phục vụ xác nhận
 * Nguồn: Mobile / Chờ mở bàn
 *
 * Tự động đọc lại active session từ DB nếu khách đóng Chrome hoặc reload trang.
 * Chờ status chuyển từ WAITING_FOR_OPEN → SERVING
 * Khi SERVING thì navigate sang menu
 */
export default function WaitingTableOpenPage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  // Lỗi tải phiên: mở thẳng bằng link thì về màn quét QR của bàn (`/table/:qrCode`) —
  // đúng việc màn này khuyên khách làm ("quét lại mã QR").
  const goBack = useGoBack(generatePath(CUSTOMER_PATHS.TABLE_OPEN_QR, { qrCode: qrCode ?? "" }))
  const location = useLocation()
  const setSession = useCustomerSessionStore((s) => s.setSession)
  const storeSession = useCustomerSessionStore((s) => s.tableSession)

  const state = (location.state ?? {}) as LocationState
  const [activeSessionId, setActiveSessionId] = React.useState<number | undefined>(
    state.tableSessionId ?? storeSession?.id,
  )
  const [tableName, setTableName] = React.useState<string>(
    state.tableName || storeSession?.tableName || "Bàn",
  )
  const [guestCount, setGuestCount] = React.useState<number | string>(
    state.guestCount ?? storeSession?.guestCount ?? "—",
  )

  // Tự động kiểm tra trực tiếp từ Database khi vào trang hoặc F5/mở lại trình duyệt
  React.useEffect(() => {
    if (!qrCode) return
    let isMounted = true

    syncCustomerSessionWithBackend(qrCode).then((dbSession) => {
      if (!isMounted) return
      if (!dbSession) {
        // Không có phiên active trong database -> chuyển về màn quét QR để mở bàn
        navigate(generatePath(CUSTOMER_PATHS.TABLE_OPEN_QR, { qrCode: qrCode ?? "" }), {
          replace: true,
        })
        return
      }
      if (dbSession.status === "SERVING") {
        navigate(generatePath(CUSTOMER_PATHS.MENU, { qrCode: qrCode ?? "" }), { replace: true })
        return
      }
      if (dbSession.status === "WAITING_FOR_OPEN") {
        setActiveSessionId(dbSession.id)
        if (dbSession.tableName) setTableName(dbSession.tableName)
        if (dbSession.guestCount) setGuestCount(dbSession.guestCount)
      }
      if (dbSession.status === "WAITING_FOR_PAY") {
        navigate(generatePath(CUSTOMER_PATHS.INVOICE, { qrCode: qrCode ?? "" }), { replace: true })
      }
    })

    return () => {
      isMounted = false
    }
  }, [qrCode, navigate])

  // Poll session status liên tục mỗi giây
  const {
    data: session,
    isLoading,
    error,
  } = useTableSession(activeSessionId, { refetchInterval: POLL_INTERVAL_MS })

  // Khi session chuyển sang SERVING, lưu vào store và navigate sang menu
  React.useEffect(() => {
    if (session && session.status === "SERVING") {
      setSession({
        qrCode: qrCode ?? "",
        tableSession: session,
      })
      navigate(generatePath(CUSTOMER_PATHS.MENU, { qrCode: qrCode ?? "" }), { replace: true })
    }
    if (session) {
      if (session.tableName) setTableName(session.tableName)
      if (session.guestCount) setGuestCount(session.guestCount)
    }
  }, [session, qrCode, navigate, setSession])

  function handlePreviewMenu() {
    // Cho phép khách xem trước thực đơn trong lúc chờ
    const currentSession = session || storeSession
    if (currentSession) {
      setSession({
        qrCode: qrCode ?? "",
        tableSession: currentSession,
      })
      navigate(generatePath(CUSTOMER_PATHS.MENU, { qrCode: qrCode ?? "" }))
    }
  }

  // Error state
  if (error) {
    return (
      <div className="flex min-h-dvh flex-1 flex-col items-center justify-center bg-white px-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-status-danger-subtle">
            <TriangleAlert aria-hidden="true" className="size-7 text-status-danger" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Không thể tải thông tin phiên bàn</h2>
          <p className="mt-2 text-sm text-text-secondary">
            Vui lòng quét lại mã QR hoặc liên hệ nhân viên.
          </p>
          <Button type="button" onClick={goBack} className="mt-6">
            Quay lại
          </Button>
        </div>
      </div>
    )
  }

  const sessionId = session?.id ?? activeSessionId
  const restaurantDisplayName = "Phở Việt"
  const branchDisplayName =
    session?.tableName || tableName
      ? `${(session?.tableName || tableName).split(" ")[0]} - Chi nhánh`
      : "Chi nhánh chính"

  return (
    <div className="flex min-h-dvh flex-1 flex-col justify-between bg-white w-full">
      <div className="flex flex-1 flex-col justify-between w-full max-w-lg md:max-w-xl mx-auto px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        {/* ---- Nhóm nội dung chính giữa (Căn giữa hoàn toàn giữa màn hình) ---- */}
        <div className="my-auto flex w-full flex-col items-center py-4 text-center">
          {/* Vòng tròn đồng hồ đồng tâm (Radial Ripple) */}
          <div className="mb-6 flex size-[104px] items-center justify-center rounded-full bg-[#FDF0EB]">
            <div className="flex size-[80px] items-center justify-center rounded-full bg-[#FEDDD2]">
              <div className="flex size-[58px] items-center justify-center rounded-full bg-brand-primary shadow-xs">
                <Clock className="size-7 text-white" strokeWidth={2.5} />
              </div>
            </div>
          </div>

          {/* Tiêu đề */}
          <h1 className="text-xl font-bold tracking-tight text-text-primary sm:text-2xl">
            Đang chờ nhân viên xác
            <br />
            nhận
          </h1>

          {/* Mô tả chi tiết */}
          <p className="mt-2.5 max-w-[280px] text-xs leading-relaxed text-text-tertiary sm:text-[13px]">
            Bạn đã quét mã QR của {tableName}. Nhân viên sẽ mở bàn trong giây lát để bạn bắt đầu gọi
            món.
          </p>

          {/* 3 chấm trạng thái đang tải */}
          <div className="mt-4 flex items-center justify-center gap-1.5">
            <span
              className="size-2 rounded-full bg-brand-primary animate-pulse"
              style={{ animationDelay: "0ms" }}
            />
            <span
              className="size-2 rounded-full bg-brand-primary animate-pulse"
              style={{ animationDelay: "150ms" }}
            />
            <span
              className="size-2 rounded-full bg-brand-primary animate-pulse"
              style={{ animationDelay: "300ms" }}
            />
          </div>

          {/* Thẻ thông tin phiên bàn */}
          <div className="mt-6 flex w-full items-center gap-3.5 rounded-[16px] bg-[#F8F9FA] p-3.5">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-brand-primary-subtle">
              <span className="text-lg font-bold text-brand-primary">P</span>
            </div>
            <div className="flex flex-col text-left">
              <span className="text-sm font-bold leading-tight text-text-primary">
                {restaurantDisplayName} · {branchDisplayName}
              </span>
              <span className="mt-1 text-xs text-text-tertiary font-normal">
                {tableName} · {guestCount !== "—" ? `${guestCount} khách · ` : ""}Mã phiên #
                {sessionId}
              </span>
            </div>
          </div>

          {/* Trạng thái hiện tại */}
          {isLoading ? (
            <p className="mt-3 text-xs text-text-tertiary">Đang kiểm tra...</p>
          ) : session ? (
            <p className="mt-3 text-xs text-text-tertiary">
              Trạng thái: <span className="font-semibold">{session.status}</span>
            </p>
          ) : null}
        </div>

        {/* ---- Nút hành động xem trước thực đơn ở dưới cùng ---- */}
        <div className="w-full pt-4">
          <Button
            type="button"
            variant="outline"
            size="lg"
            className="flex h-[52px] w-full items-center justify-center gap-2 rounded-[16px] border border-brand-primary bg-white text-base font-bold text-brand-primary shadow-none transition-transform hover:bg-brand-primary-subtle/50 active:scale-[0.99]"
            onClick={handlePreviewMenu}
            disabled={!session}
          >
            <List className="size-5 text-brand-primary" strokeWidth={2.5} />
            <span>Xem trước thực đơn</span>
          </Button>
        </div>
      </div>
    </div>
  )
}
