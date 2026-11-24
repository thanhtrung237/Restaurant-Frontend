import { useNavigate, useParams, generatePath } from "react-router-dom"
import { X, Info, Phone } from "lucide-react"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import { useTableByQrCode } from "@/features/customer/api"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { useToast } from "@/hooks/use-toast"

/**
 * Chưa thể gọi món / Từ chối
 * Nguồn: Mobile / Từ chối
 *
 * Hiển thị khi chi nhánh tạm ngưng nhận gọi món qua QR hoặc bàn chưa thể nhận order.
 */
export default function OrderRejectedPage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  const { toast } = useToast()

  // Trang này có thể mở khi CHƯA có phiên bàn, nên không dựa hẳn vào session store.
  // Tách branchId từ mã QR giống các màn khách khác (vd: "QR-B1-T01" -> 1).
  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const branchMatch = qrCode ? qrCode.match(/(?:QR[-_\s]*)?B(\d+)/i) : null
  const branchId = branchMatch ? Number(branchMatch[1]) : undefined

  // `GET /tables/branch/{branchId}/qr/{qrCode}` là endpoint công khai và trả kèm
  // `branchName` — dùng được cho khách chưa đăng nhập.
  // (`GET /branches/{id}` KHÔNG dùng được: BE đặt @PreAuthorize("isAuthenticated()").)
  const { data: table } = useTableByQrCode(branchId, qrCode)

  const tableName = tableSession?.tableName || table?.name || "Bàn"
  const branchName = table?.branchName || ""

  function handleCallStaff() {
    toast({
      title: "Đã gọi nhân viên hỗ trợ",
      description: `${tableName} · Nhân viên sẽ đến hỗ trợ trong giây lát.`,
      variant: "info",
    })
  }

  function handleRescan() {
    navigate(generatePath(CUSTOMER_PATHS.TABLE_OPEN_QR, { qrCode: qrCode ?? "" }))
  }

  return (
    <div className="flex min-h-dvh w-full flex-1 flex-col bg-white">
      <div className="mx-auto flex w-full max-w-lg md:max-w-xl flex-1 flex-col justify-between px-5 pt-[max(3rem,env(safe-area-inset-top))] pb-[max(2rem,env(safe-area-inset-bottom))]">
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {/* Biểu tượng lỗi tròn đồng tâm đỏ */}
          <div className="flex size-[104px] items-center justify-center rounded-full bg-[#FEE4E2]/70">
            <div className="flex size-[64px] items-center justify-center rounded-full bg-[#F04438]">
              <X className="size-8 text-white" strokeWidth={3} />
            </div>
          </div>

          <h1 className="mt-6 text-xl sm:text-2xl font-bold tracking-tight text-text-primary">
            Chưa thể gọi món
          </h1>
          <p className="mt-2 max-w-[290px] text-xs sm:text-sm leading-relaxed text-text-secondary">
            Chi nhánh này hiện đang tạm ngưng nhận gọi món qua QR. Vui lòng liên hệ nhân viên để
            được hỗ trợ đặt món trực tiếp.
          </p>

          {/* Thẻ thông tin bàn và chi nhánh */}
          <div className="mt-6 flex w-full items-center gap-3.5 rounded-[20px] bg-[#F8F9FA] p-4 text-left">
            <div className="flex size-11 shrink-0 items-center justify-center rounded-[14px] bg-[#FEEBE4]">
              <span className="text-lg font-black text-brand-primary">P</span>
            </div>
            <div className="min-w-0">
              <p className="truncate text-sm font-bold text-text-primary">
                Phở Việt · {branchName}
              </p>
              <p className="mt-0.5 text-xs text-text-tertiary">{tableName} · mã QR hợp lệ</p>
            </div>
          </div>

          {/* Banner lưu ý */}
          <div className="mt-3 flex w-full items-start gap-2.5 rounded-[16px] bg-[#FEF6EE] px-4 py-3 text-left">
            <Info className="mt-0.5 size-4.5 shrink-0 text-[#B54708]" />
            <p className="text-xs sm:text-[13px] font-medium leading-snug text-[#B54708]">
              Nếu bạn nghĩ đây là nhầm lẫn, hãy thử quét lại mã QR.
            </p>
          </div>
        </div>

        {/* Nhóm nút hành động dưới cùng */}
        <div className="mt-8 flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={handleCallStaff}
            className="flex h-12 w-full items-center justify-center gap-2 rounded-[16px] bg-brand-primary text-sm sm:text-base font-bold text-white shadow-none transition-colors hover:bg-brand-primary-hover active:scale-[0.99]"
          >
            <Phone className="size-4.5 text-white" />
            <span>Gọi nhân viên hỗ trợ</span>
          </button>

          <button
            type="button"
            onClick={handleRescan}
            className="text-sm font-semibold text-[#344054] transition-colors hover:text-text-primary active:scale-95"
          >
            Quét lại mã QR
          </button>
        </div>
      </div>
    </div>
  )
}
