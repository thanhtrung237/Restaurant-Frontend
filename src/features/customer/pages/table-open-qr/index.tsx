import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import {
  getTableByQrCode,
  getOpenSessionByTable,
  createTableSession,
  type TableSessionCreateRequest,
} from "@/features/customer/api"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"

const GUEST_COUNT_OPTIONS = [1, 2, 3, "4+"] as const

/**
 * Mở bàn (QR) — Landing sau khi khách quét mã QR dán tại bàn
 * Nguồn: Mobile / Mở bàn (QR)
 *
 * Flow:
 * 1. Parse QR code từ URL param (/ban/:qrCode)
 * 2. Fetch table info: GET /tables/branch/{branchId}/qr/{qrCode}
 * 3. Check session hiện tại: GET /table-sessions/table/{tableId}/open
 * 4. Nếu chưa có session: Khách chọn số người → POST /table-sessions
 * 5. Nếu đã có session: Join vào session đó
 * 6. Navigate sang waiting-table-open hoặc menu (nếu session đã SERVING)
 */
export default function TableOpenQrPage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  const { toast } = useToast()

  const [loading, setLoading] = React.useState(true)
  const [error, setError] = React.useState<string | null>(null)
  const [tableInfo, setTableInfo] = React.useState<{
    tableId: number
    branchId: number
    tableName: string
    restaurantName: string
    branchName: string
    existingSessionId?: number
  } | null>(null)

  const [selectedGuestCount, setSelectedGuestCount] = React.useState<number | "4+">(2)
  const [submitting, setSubmitting] = React.useState(false)

  // Fetch table info khi component mount
  React.useEffect(() => {
    if (!qrCode) {
      setError("Mã QR không hợp lệ")
      setLoading(false)
      return
    }

    async function fetchTableInfo() {
      try {
        setLoading(true)
        setError(null)

        // Parse QR code: format có thể là "branchId-tableId" hoặc chỉ là qrCode string
        // Backend sẽ tự map qrCode → table
        // Giả sử QR format: "Q1-B01" → parse branchId từ đó
        // Hoặc đơn giản gọi API với qrCode, BE trả về table
        
        // Trích xuất branchId nếu mã QR có format "QR-B1-..." hoặc fallback = 1
        const branchMatch = qrCode ? qrCode.match(/(?:QR-)?B(\d+)/i) : null
        const branchId = branchMatch ? parseInt(branchMatch[1], 10) : 1

        const table = await getTableByQrCode(branchId, qrCode ?? "")
        
        // Check xem bàn đã có session đang mở chưa
        let existingSession = null
        try {
          existingSession = await getOpenSessionByTable(table.id)
        } catch {
          // Không có session đang mở - OK
        }

        setTableInfo({
          tableId: table.id,
          branchId: table.branchId,
          tableName: table.name,
          restaurantName: "Phở Việt", // TODO: fetch from API
          branchName: table.branchName || "Chi nhánh chính",
          existingSessionId: existingSession?.id,
        })

        // Nếu đã có session và đang SERVING, lưu vào store và chuyển thẳng vào menu
        if (existingSession && existingSession.status === "SERVING") {
          useCustomerSessionStore.getState().setSession({
            qrCode: qrCode ?? "",
            sessionToken: `session-${existingSession.id}`,
            tableSession: existingSession,
          })
          navigate(
            generatePath(CUSTOMER_PATHS.MENU, { qrCode: qrCode ?? "" }),
            { replace: true, state: { tableSessionId: existingSession.id, tableName: table.name } }
          )
          return
        }

        // Nếu có session nhưng đang WAITING_FOR_OPEN, lưu vào store và chuyển sang waiting
        if (existingSession && existingSession.status === "WAITING_FOR_OPEN") {
          useCustomerSessionStore.getState().setSession({
            qrCode: qrCode ?? "",
            sessionToken: `session-${existingSession.id}`,
            tableSession: existingSession,
          })
          navigate(
            generatePath(CUSTOMER_PATHS.WAITING_TABLE_OPEN, { qrCode: qrCode ?? "" }),
            {
              replace: true,
              state: {
                tableSessionId: existingSession.id,
                tableName: table.name,
                guestCount: existingSession.guestCount,
              },
            }
          )
          return
        }

        // Nếu có session đang WAITING_FOR_PAY, lưu vào store và chuyển sang hóa đơn
        if (existingSession && existingSession.status === "WAITING_FOR_PAY") {
          useCustomerSessionStore.getState().setSession({
            qrCode: qrCode ?? "",
            sessionToken: `session-${existingSession.id}`,
            tableSession: existingSession,
          })
          navigate(
            generatePath(CUSTOMER_PATHS.INVOICE, { qrCode: qrCode ?? "" }),
            { replace: true }
          )
          return
        }

      } catch (err) {
        console.error("Error fetching table:", err)
        setError(
          err instanceof Error 
            ? err.message 
            : "Không thể tải thông tin bàn. Vui lòng thử lại."
        )
      } finally {
        setLoading(false)
      }
    }

    fetchTableInfo()
  }, [qrCode, navigate])

  async function handleOpenTableRequest() {
    if (!tableInfo) return

    try {
      setSubmitting(true)

      const guestCount = typeof selectedGuestCount === "number" 
        ? selectedGuestCount 
        : 4

      // Tạo session mới — gửi kèm guestCount để Phục vụ xem/xác nhận không phải nhập lại
      const request: TableSessionCreateRequest = {
        tableId: tableInfo.tableId,
        guestCount,
      }

      const session = await createTableSession(request)

      // Cập nhật ngay vào store
      useCustomerSessionStore.getState().setSession({
        qrCode: qrCode ?? "",
        sessionToken: `session-${session.id}`,
        tableSession: session,
      })

      // Navigate sang waiting page với sessionId
      navigate(
        generatePath(CUSTOMER_PATHS.WAITING_TABLE_OPEN, { qrCode: qrCode ?? "" }),
        {
          replace: true,
          state: {
            tableSessionId: session.id,
            tableName: tableInfo.tableName,
            guestCount,
          },
        }
      )
    } catch (err) {
      console.error("Error creating session:", err)
      toast({
        title: "Lỗi mở bàn",
        description: err instanceof Error ? err.message : "Không thể mở bàn, vui lòng thử lại.",
        variant: "danger",
      })
      setSubmitting(false)
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="flex flex-1 items-center justify-center bg-surface-page min-h-dvh">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
          <p className="text-sm text-text-secondary">Đang tải thông tin bàn...</p>
        </div>
      </div>
    )
  }

  // Error state
  if (error || !tableInfo) {
    return (
      <div className="flex flex-1 flex-col items-center justify-center bg-surface-page min-h-dvh px-6">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-status-danger-subtle">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-text-primary">
            {error || "Không tìm thấy bàn"}
          </h2>
          <p className="mt-2 text-sm text-text-secondary">
            Vui lòng kiểm tra lại mã QR hoặc liên hệ nhân viên.
          </p>
          <Button
            type="button"
            onClick={() => window.location.reload()}
            className="mt-6"
          >
            Thử lại
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-1 flex-col bg-surface-page min-h-dvh w-full">
      {/* ---- Banner thương hiệu (Tràn viền 100% mọi màn hình) ---- */}
      <div className="w-full bg-brand-primary px-4 sm:px-6 pt-[max(2.5rem,env(safe-area-inset-top))] pb-8 shadow-sm">
        <div className="w-full max-w-lg md:max-w-xl mx-auto flex flex-col items-center">
          <div className="mb-3.5 flex size-[72px] sm:size-20 shrink-0 items-center justify-center rounded-[20px] bg-white shadow-xs">
            <span className="text-3xl sm:text-4xl font-bold text-brand-primary">P</span>
          </div>
          <h1 className="text-center text-xl sm:text-2xl font-bold text-white tracking-tight">
            {tableInfo.restaurantName}
          </h1>
          <p className="mt-1 text-center text-sm sm:text-base font-normal text-white/90">
            {tableInfo.branchName}
          </p>
        </div>
      </div>

      {/* ---- Nội dung chính (Thích ứng linh hoạt mọi điện thoại và tablet) ---- */}
      <div className="flex flex-1 flex-col justify-between w-full max-w-lg md:max-w-xl mx-auto px-4 sm:px-6 pt-5 sm:pt-7 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-col">
          {/* Thẻ thông tin bàn */}
          <div className="rounded-[20px] border border-border-default/70 bg-white px-5 py-6 sm:py-8 text-center shadow-[0_2px_12px_rgba(0,0,0,0.03)]">
            <p className="text-xs sm:text-sm font-semibold tracking-wider text-text-tertiary uppercase">
              BẠN ĐANG NGỒI TẠI
            </p>
            <p className="my-1.5 sm:my-2 text-3xl sm:text-4xl font-bold tracking-tight text-brand-primary">
              {tableInfo.tableName}
            </p>
            <p className="text-xs sm:text-sm text-text-tertiary">
              Đơn món sẽ được ghi theo phiên của bàn này
            </p>
          </div>

          {/* Số lượng khách */}
          <div className="mt-6 sm:mt-8">
            <p className="text-xs sm:text-sm font-semibold tracking-wider text-text-tertiary uppercase">
              SỐ LƯỢNG KHÁCH
            </p>
            <div className="mt-3 grid grid-cols-4 gap-2.5 sm:gap-4">
              {GUEST_COUNT_OPTIONS.map((option) => {
                const isSelected = option === selectedGuestCount
                return (
                  <button
                    key={option}
                    type="button"
                    onClick={() => setSelectedGuestCount(option)}
                    className={cn(
                      "flex h-[52px] sm:h-[58px] min-w-0 items-center justify-center rounded-[16px] sm:rounded-[18px] border text-base sm:text-lg font-bold transition-all",
                      isSelected
                        ? "border-[#FFD5C8] bg-brand-primary-subtle text-brand-primary shadow-2xs"
                        : "border-border-default bg-white text-text-primary hover:border-border-strong active:scale-95"
                    )}
                  >
                    {option}
                  </button>
                )
              })}
            </div>
          </div>
        </div>

        {/* Khối hành động và ghi chú chân trang */}
        <div className="mt-8 flex flex-col items-center w-full">
          <p className="mb-3.5 text-center text-xs sm:text-sm leading-relaxed text-text-tertiary">
            Quét mã QR tại bàn · Không cần tải app · Không cần đăng nhập
          </p>
          <Button
            type="button"
            size="lg"
            className="w-full h-[52px] sm:h-[56px] rounded-[16px] sm:rounded-[18px] bg-brand-primary hover:bg-brand-primary-hover text-base sm:text-lg font-bold text-white shadow-none transition-transform active:scale-[0.99]"
            onClick={handleOpenTableRequest}
            disabled={submitting}
          >
            {submitting ? "Đang gửi..." : "Gửi yêu cầu mở bàn"}
          </Button>
        </div>
      </div>
    </div>
  )
}