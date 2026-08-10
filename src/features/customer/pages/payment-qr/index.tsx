import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { Bell } from "lucide-react"
import { PseudoQrCode } from "@/components/common/PseudoQrCode"
import { useToast } from "@/hooks/use-toast"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import {
  useInvoice,
  useInvoiceBySession,
  useInvoiceQrCode,
  useInvoiceQrCodeBySession,
  useTableByQrCode,
  getOpenSessionByTable,
} from "@/features/customer/api"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { useCustomerPaymentStore } from "@/features/customer/store/payment.store"
import { formatVnd } from "@/features/customer/lib/pricing"

// Thời hạn hiển thị mã QR (03:20)
const QR_EXPIRES_SECONDS = 200
// Poll invoice mỗi 1 giây để phản hồi ngay khi Thu ngân xác nhận
const POLL_INTERVAL_MS = 1000

/**
 * Thanh toán QR
 * Nguồn: Mobile / Thanh toán QR
 *
 * API Flow:
 * 1. Lấy thông tin hóa đơn & VietQR từ backend qua invoiceId / tableSessionId
 * 2. Poll invoice: GET /invoices/session/{tableSessionId} (mỗi 1s)
 * 3. Khi invoice.status = PAID hoặc ISSUED → navigate to payment-success
 * 4. Timeout sau 200s → navigate to payment-failed
 */
export default function PaymentQrPage() {
  const navigate = useNavigate()
  const { qrCode } = useParams<{ qrCode: string }>()
  const { toast } = useToast()

  const tableSession = useCustomerSessionStore((s) => s.tableSession)
  const setSession = useCustomerSessionStore((s) => s.setSession)

  // Trích xuất branchId từ qrCode (hỗ trợ "QR-B1-T01", "QR B1 T01", "B1-T01",...)
  const branchMatch = qrCode ? qrCode.match(/(?:QR[-_\s]*)?B(\d+)/i) : null
  const branchId = branchMatch ? Number(branchMatch[1]) : 1

  const { data: tableByQr } = useTableByQrCode(branchId, qrCode)

  // Phục hồi session nếu khách truy cập trực tiếp link hoặc F5
  React.useEffect(() => {
    if (!tableSession && tableByQr?.id) {
      getOpenSessionByTable(tableByQr.id)
        .then((sess) => {
          if (sess) {
            setSession({
              qrCode: qrCode ?? "",
              sessionToken: `token-${sess.id}`,
              tableSession: sess,
            })
          }
        })
        .catch(() => {
          // Bàn chưa có phiên mở — bỏ qua lỗi 404
        })
    }
  }, [tableSession, tableByQr, qrCode, setSession])

  const tableName = tableSession?.tableName || tableByQr?.name || "Bàn"
  const tableCode = tableName.replace(/^Bàn\s*/, "")
  const tableSessionId = tableSession?.id

  const startPayment = useCustomerPaymentStore((s) => s.startPayment)
  const markPaid = useCustomerPaymentStore((s) => s.markPaid)
  const markFailed = useCustomerPaymentStore((s) => s.markFailed)

  const [secondsLeft, setSecondsLeft] = React.useState(QR_EXPIRES_SECONDS)

  // Fetch invoice theo session với polling mỗi 1 giây
  const { data: invoice } = useInvoiceBySession(tableSessionId, {
    refetchInterval: POLL_INTERVAL_MS,
  })

  // Lấy dữ liệu VietQR chính thức từ backend (theo session ID hoặc invoice ID)
  const { data: qrDataBySession, isLoading: qrSessionLoading } = useInvoiceQrCodeBySession(tableSessionId)
  const { data: qrDataByInvoice, isLoading: qrInvoiceLoading } = useInvoiceQrCode(invoice?.id)
  const qrData = qrDataByInvoice || qrDataBySession
  const qrLoading = (qrInvoiceLoading && !qrData) || (qrSessionLoading && !qrData)

  // Fetch trực tiếp theo invoice ID nếu có để phản hồi trạng thái cực nhanh
  const targetInvoiceId = invoice?.id || qrData?.invoiceId
  const { data: invoiceById } = useInvoice(targetInvoiceId, {
    refetchInterval: POLL_INTERVAL_MS,
  })

  const sessionNumber = tableSessionId ? String(tableSessionId).replace(/[^0-9]/g, "") || "1" : "1"
  const transferContent = qrData?.transferContent || (invoice?.invoiceNumber ? `TT ${invoice.invoiceNumber.replace(/-/g, "")}` : `PV ${tableCode || "B01"} PHIEN${sessionNumber}`)
  const amountToShow = qrData?.remainingAmount ?? invoice?.grandTotal ?? 0

  const bankName = qrData?.bankName || "Vietcombank"
  const bankAccountNo = qrData?.accountNo || "0071 0009 88888"
  const accountName = qrData?.accountName || "CTY TNHH PHỞ VIỆT"

  // Kiểm tra xem hóa đơn đã được thanh toán (PAID hoặc đã phát hành ISSUED)
  const isPaid =
    invoice?.status === "PAID" ||
    (invoice?.status as string) === "ISSUED" ||
    invoiceById?.status === "PAID" ||
    (invoiceById?.status as string) === "ISSUED" ||
    (qrData && qrData.remainingAmount === 0 && (qrData.totalPaid > 0 || (invoice?.totalPaid ?? 0) > 0))

  // Tự động chuyển trang khi hóa đơn đã được thanh toán (qua Webhook hoặc Thu ngân xác nhận)
  React.useEffect(() => {
    if (isPaid) {
      startPayment({ amount: amountToShow || invoice?.grandTotal || qrData?.grandTotal || 0 })
      markPaid("BANK_TRANSFER")
      navigate(generatePath(CUSTOMER_PATHS.PAYMENT_SUCCESS, { qrCode: qrCode ?? "" }), { replace: true })
    }
  }, [isPaid, amountToShow, invoice?.grandTotal, qrData?.grandTotal, startPayment, markPaid, navigate, qrCode])

  // Đếm ngược thời hạn
  React.useEffect(() => {
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [])

  // Xử lý timeout
  React.useEffect(() => {
    if (secondsLeft > 0) return
    markFailed()
    navigate(
      generatePath(CUSTOMER_PATHS.PAYMENT_FAILED, { qrCode: qrCode ?? "" }) + "?reason=timeout",
      { replace: true }
    )
  }, [secondsLeft, markFailed, navigate, qrCode])

  function handleCopyContent() {
    navigator.clipboard
      .writeText(transferContent)
      .then(() => toast({ title: "Đã sao chép nội dung chuyển khoản", variant: "success" }))
      .catch(() => toast({ title: "Không thể sao chép, vui lòng thử lại", variant: "danger" }))
  }

  function handleCallStaff() {
    toast({
      title: "Đã gọi nhân viên",
      description: `${tableName} · Nhân viên sẽ đến hỗ trợ trong giây lát.`,
      variant: "info",
    })
  }

  function handleCancel() {
    // TODO: Cancel payment nếu cần
    navigate(generatePath(CUSTOMER_PATHS.INVOICE, { qrCode: qrCode ?? "" }))
  }

  const minutes = Math.floor(secondsLeft / 60)
  const seconds = secondsLeft % 60
  const countdownLabel = `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`


  return (
    <div className="flex min-h-dvh flex-1 flex-col justify-between bg-white w-full">
      <div className="flex-1 overflow-y-auto w-full">
        <div className="w-full max-w-lg md:max-w-xl mx-auto px-5 pt-[max(2rem,env(safe-area-inset-top))] pb-4">
          <div className="flex flex-col items-center text-center">
            <h1 className="text-base sm:text-lg font-bold text-text-primary">
              Quét mã để chuyển khoản
            </h1>
            <p className="mt-1.5 max-w-xs text-xs sm:text-sm leading-relaxed text-text-secondary">
              Dùng app ngân hàng quét mã QR bên dưới. Hệ thống tự xác nhận ngay khi nhận được tiền.
            </p>

            {/* ---- Khung mã QR VietQR thật ---- */}
            <div className="mt-5 rounded-[24px] border border-border-default/60 bg-white p-3 shadow-xs flex items-center justify-center min-h-[200px]">
              {qrData?.qrImageUrl ? (
                <img
                  src={qrData.qrImageUrl}
                  alt="VietQR Thanh toán"
                  className="w-[220px] max-w-full rounded-xl object-contain"
                />
              ) : qrLoading ? (
                <div className="flex h-[180px] w-[180px] flex-col items-center justify-center gap-2">
                  <div className="size-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
                  <span className="text-xs text-text-tertiary">Đang tạo mã VietQR...</span>
                </div>
              ) : (
                <PseudoQrCode seed={`PV-${tableCode || "B01"}-${amountToShow}`} size={180} />
              )}
            </div>

            {/* ---- Số tiền cần thanh toán ---- */}
            <p className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-primary">
              {formatVnd(amountToShow)}
            </p>

            {/* ---- Thẻ thông tin tài khoản chuyển khoản ---- */}
            <div className="mt-5 w-full rounded-[20px] bg-[#F8F9FA] p-4 sm:p-5 text-left text-sm">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs sm:text-sm font-medium text-text-tertiary">Ngân hàng</span>
                  <span className="text-xs sm:text-sm font-bold text-text-primary">{bankName}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs sm:text-sm font-medium text-text-tertiary">Số tài khoản</span>
                  <span className="text-xs sm:text-sm font-bold text-text-primary">{bankAccountNo}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-xs sm:text-sm font-medium text-text-tertiary">Chủ tài khoản</span>
                  <span className="text-xs sm:text-sm font-bold text-text-primary">{accountName}</span>
                </div>
              </div>

              <div className="my-3 border-t border-border-default/40" />

              <div className="flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-xs sm:text-sm font-bold text-text-primary">Nội dung CK</p>
                  <p className="text-xs sm:text-sm font-bold text-text-primary">{transferContent}</p>
                </div>
                <button
                  type="button"
                  onClick={handleCopyContent}
                  className="shrink-0 rounded-full border border-brand-primary bg-white px-4 py-1.5 text-xs sm:text-sm font-bold text-brand-primary transition-colors hover:bg-brand-primary-subtle/30 active:scale-95"
                >
                  Sao chép
                </button>
              </div>
            </div>

            {/* ---- Trạng thái đếm ngược ---- */}
            <div className="mt-5 inline-flex items-center gap-2 rounded-full bg-[#FEF6EE] px-4 py-2 text-xs sm:text-[13px] font-semibold text-[#B54708]">
              <span className="size-2 shrink-0 rounded-full bg-[#F79009]" />
              <span>Đang chờ xác nhận · hết hạn sau {countdownLabel}</span>
            </div>
          </div>
        </div>
      </div>

      {/* ---- Nút nổi Gọi nhân viên & Nút Hủy dưới cùng ---- */}
      <div className="w-full">
        <div className="w-full max-w-lg md:max-w-xl mx-auto px-5 pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-2">
          <div className="mb-3 flex justify-end">
            <button
              type="button"
              onClick={handleCallStaff}
              className="inline-flex items-center gap-1.5 rounded-full border border-brand-primary bg-white px-4 py-2 text-xs sm:text-sm font-bold text-brand-primary shadow-[0_4px_16px_rgba(240,82,43,0.15)] transition-all hover:bg-brand-primary-subtle/40 active:scale-95"
            >
              <Bell className="size-4 text-brand-primary" />
              <span>Gọi nhân viên</span>
            </button>
          </div>

          <button
            type="button"
            onClick={handleCancel}
            className="flex h-12 w-full items-center justify-center rounded-[16px] border border-border-default bg-white text-sm sm:text-base font-bold text-text-secondary transition-colors hover:bg-surface-page active:scale-[0.99]"
          >
            Hủy và quay lại hóa đơn tạm tính
          </button>
        </div>
      </div>
    </div>
  )
}