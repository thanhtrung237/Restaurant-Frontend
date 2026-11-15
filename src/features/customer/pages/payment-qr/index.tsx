import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { Bell, AlertTriangle } from "lucide-react"
import { PseudoQrCode } from "@/components/common/PseudoQrCode"
import { getBankLabel } from "@/config/banks"
import { ApiError } from "@/lib/http"
import { cn } from "@/lib/utils"
import { useToast } from "@/hooks/use-toast"
import { CUSTOMER_PATHS } from "@/app/router/paths"
import {
  useInvoice,
  useInvoiceBySession,
  useInvoiceQrCode,
  useInvoiceQrCodeBySession,
  useTableByQrCode,
  getOpenSessionByTable,
  useCallStaff,
} from "@/features/customer/api"
import { useCustomerSessionStore } from "@/features/customer/store/session.store"
import { useCustomerPaymentStore } from "@/features/customer/store/payment.store"
import { formatVnd } from "@/features/customer/lib/pricing"
import { useBill } from "@/hooks/useBill"

// Thời hạn hiển thị mã QR (03:20)
const QR_EXPIRES_SECONDS = 200
// Poll invoice mỗi 1 giây để phản hồi ngay khi Thu ngân xác nhận
const POLL_INTERVAL_MS = 1000

/**
 * Thanh toán QR
 * Nguồn: Mobile / Thanh toán QR
 *
 * API Flow:
 * 1. Poll hoá đơn của phiên: GET /invoices/session/{tableSessionId} (mỗi 1s)
 *    Chưa có hoá đơn → 404 / QR trả 409: Thu ngân chưa lập hoá đơn, màn này CHỜ.
 * 2. Có hoá đơn → GET /invoices/{id}/qr-code lấy VietQR, tự hiện, khách không phải bấm lại
 * 3. Khi invoice.status = PAID hoặc ISSUED → navigate to payment-success
 * 4. Timeout sau 200s kể từ lúc CÓ mã QR → navigate to payment-failed
 *
 * Hoá đơn do Thu ngân lập (POST /invoices — Bảng 4.2 "Thu tiền, đóng bàn"). Trước đây
 * chính 2 endpoint GET ở trên tự lập hoá đơn và đẩy phiên sang CHỜ THANH TOÁN
 * (be-issues mục 17); nay chúng chỉ đọc.
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

  // Lấy bill từ BE để hiển thị breakdown
  const { data: bill } = useBill(tableSessionId)

  // Fetch invoice theo session với polling mỗi 1 giây
  const { data: invoice } = useInvoiceBySession(tableSessionId, {
    refetchInterval: POLL_INTERVAL_MS,
    retry: false,
  })

  // Lấy dữ liệu VietQR chính thức từ backend (theo session ID hoặc invoice ID)
  const { data: qrDataBySession, isLoading: qrSessionLoading, error: qrSessionError } =
    useInvoiceQrCodeBySession(tableSessionId)
  const { data: qrDataByInvoice, isLoading: qrInvoiceLoading, error: qrInvoiceError } =
    useInvoiceQrCode(invoice?.id)
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

  /**
   * Chi nhánh chưa cấu hình tài khoản ngân hàng ⇒ không có QR để hiện.
   *
   * Backend nay trả **409** cho trường hợp này (be-issues mục 5 — trước đây nó thế bằng
   * một số tài khoản hardcode, khách quét là chuyển tiền nhầm người). Lớp nhận diện bộ
   * giá trị giả ở FE đã gỡ theo.
   *
   * Vẫn giữ điều kiện thiếu `accountNo` / `bankName`: hoá đơn đã thanh toán thì backend
   * trả 200 với các trường rỗng, lúc đó cũng không hiện QR.
   */
  /**
   * `!qrData` là điều kiện then chốt: query QR-theo-phiên lỗi 409 lúc chưa có hoá đơn thì
   * giữ nguyên lỗi đó (nó không tự gọi lại), nên khi hoá đơn xuất hiện và QR-theo-hoá-đơn
   * trả về dữ liệu, lỗi cũ vẫn còn trong tay. Bỏ `!qrData` là màn khách hiện nhầm
   * "chưa hỗ trợ chuyển khoản" ngay lúc đã có mã QR để quét.
   */
  const qrError = qrInvoiceError ?? qrSessionError
  const isConflict = !qrData && qrError instanceof ApiError && qrError.status === 409

  /**
   * Chưa có hoá đơn dùng được ⇒ đang chờ Thu ngân lập, KHÔNG phải lỗi.
   *
   * Backend trả 409 cho hai việc khác nhau: "chưa có hoá đơn" và "chi nhánh chưa cấu
   * hình tài khoản ngân hàng". Phân biệt bằng việc có hoá đơn hay không thì chắc hơn
   * là đọc câu thông báo. Hoá đơn đã huỷ coi như chưa có — backend cũng không sinh QR
   * cho nó.
   */
  const hasUsableInvoice = !!invoice && invoice.status !== "CANCELLED"
  const isAwaitingCashierInvoice = !hasUsableInvoice && !qrData?.qrImageUrl

  const isBankAccountNotConfigured = isConflict && hasUsableInvoice
  const isUnconfiguredBankAccount =
    !isAwaitingCashierInvoice &&
    (isBankAccountNotConfigured || !qrData?.accountNo || !qrData?.bankName)

  // KHÔNG đặt giá trị mặc định: thà không hiện còn hơn hiện số tài khoản sai.
  const bankName = getBankLabel(qrData?.bankName)
  const bankAccountNo = qrData?.accountNo ?? ""
  const accountName = qrData?.accountName ?? ""

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

  /**
    * Đếm ngược chỉ bắt đầu khi ĐÃ có mã QR.
    *
    * Đồng hồ này là hạn của mã QR. Nếu để nó chạy trong lúc chờ Thu ngân lập hoá đơn
    * thì sau 3:20 khách bị đẩy sang trang "thanh toán thất bại" dù chưa hề có gì để quét.
    */
  const hasQrCode = !!qrData?.qrImageUrl
  React.useEffect(() => {
    if (!hasQrCode) return
    const timer = setInterval(() => {
      setSecondsLeft((s) => (s <= 1 ? 0 : s - 1))
    }, 1000)
    return () => clearInterval(timer)
  }, [hasQrCode])

  // Xử lý timeout
  React.useEffect(() => {
    if (!hasQrCode) return
    if (secondsLeft > 0) return
    markFailed()
    navigate(
      generatePath(CUSTOMER_PATHS.PAYMENT_FAILED, { qrCode: qrCode ?? "" }) + "?reason=timeout",
      { replace: true }
    )
  }, [hasQrCode, secondsLeft, markFailed, navigate, qrCode])

  function handleCopyContent() {
    navigator.clipboard
      .writeText(transferContent)
      .then(() => toast({ title: "Đã sao chép nội dung chuyển khoản", variant: "success" }))
      .catch(() => toast({ title: "Không thể sao chép, vui lòng thử lại", variant: "danger" }))
  }

  const callStaffMutation = useCallStaff()

  function handleCallStaff() {
    const sessionId = tableSession?.id
    if (!sessionId) return
    callStaffMutation.mutate(sessionId, {
      onSuccess: () => {
        toast({
          title: "Đã gọi nhân viên",
          description: `${tableName} · Nhân viên sẽ đến hỗ trợ trong giây lát.`,
          variant: "success",
        })
      },
      onError: (err) => {
        toast({
          title: "Lỗi gọi nhân viên",
          description: err instanceof Error ? err.message : "Không thể gọi nhân viên lúc này. Vui lòng thử lại.",
          variant: "danger",
        })
      },
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
              {isAwaitingCashierInvoice ? (
                <div className="flex max-w-[260px] flex-col items-center gap-3 px-3 py-8 text-center">
                  <div className="size-8 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
                  <p className="text-sm font-semibold text-text-primary">
                    Đang chờ thu ngân lập hóa đơn
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Mã QR sẽ tự hiện ngay khi hóa đơn được lập. Bạn không cần bấm lại.
                  </p>
                </div>
              ) : isUnconfiguredBankAccount ? (
                <div className="flex max-w-[260px] flex-col items-center gap-3 px-3 py-8 text-center">
                  <span className="flex size-12 items-center justify-center rounded-full bg-status-warning-subtle text-status-warning">
                    <AlertTriangle className="size-6" />
                  </span>
                  <p className="text-sm font-semibold text-text-primary">
                    Hiện chưa hỗ trợ chuyển khoản tại bàn
                  </p>
                  <p className="text-xs text-text-tertiary">
                    Vui lòng thanh toán với thu ngân.
                  </p>
                </div>
              ) : qrData?.qrImageUrl ? (
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
            {!isAwaitingCashierInvoice && (
              <>
                <p className="mt-4 text-2xl sm:text-3xl font-extrabold tracking-tight text-brand-primary">
                  {formatVnd(amountToShow)}
                </p>
                
                {/* ---- Breakdown nhỏ để khách thấy số tiền khớp với tạm tính ---- */}
                {bill && (
                  <div className="mt-3 w-full max-w-[280px] rounded-lg bg-white border border-border-default/40 px-3 py-2 text-xs">
                    <div className="flex justify-between text-text-tertiary">
                      <span>Tiền hàng</span>
                      <span>{formatVnd(bill.grossSubTotal - bill.itemPromotionDiscount)}</span>
                    </div>
                    {bill.orderPromotionDiscount + bill.manualDiscount > 0 && (
                      <div className="flex justify-between text-status-success mt-0.5">
                        <span>Giảm giá</span>
                        <span>-{formatVnd(bill.orderPromotionDiscount + bill.manualDiscount)}</span>
                      </div>
                    )}
                    <div className="flex justify-between text-text-tertiary mt-0.5">
                      <span>Phí & VAT</span>
                      <span>+{formatVnd(bill.serviceFee + bill.vatAmount)}</span>
                    </div>
                  </div>
                )}
              </>
            )}

            {/* ---- Thẻ thông tin tài khoản chuyển khoản ---- */}
            <div
              className={cn(
                "mt-5 w-full rounded-[20px] bg-[#F8F9FA] p-4 sm:p-5 text-left text-sm",
                (isAwaitingCashierInvoice || isUnconfiguredBankAccount) && "hidden",
              )}
            >
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
              <span>
                {hasQrCode
                  ? `Đang chờ xác nhận · hết hạn sau ${countdownLabel}`
                  : "Vui lòng chờ thu ngân · chưa tính hạn mã QR"}
              </span>
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