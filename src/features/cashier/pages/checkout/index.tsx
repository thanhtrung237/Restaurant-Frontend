import { getStaffPaymentPaths } from "@/app/router/paths/staff-payment.paths"
import { takeawayListPath } from "@/app/router/paths/takeaway.paths"
import * as React from "react"
import { useNavigate, useParams, generatePath } from "react-router-dom"
import { ChevronLeft, Trash2, TriangleAlert } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Divider } from "@/components/ui/divider"
import { StatusBadge } from "@/components/common/StatusBadge"
import { useInvoiceBySession } from "@/api/invoices.api"
import {
  useSaveInvoiceDiscount,
  usePendingDiscountApproval,
  useDecideDiscountApproval,
  type InvoiceDiscountInput,
} from "@/api/manual-discounts.api"
import { useBranch } from "@/api/branches.api"
import { hasBranchTransferAccount } from "@/features/cashier/lib/branch-transfer-account"
import { useToast } from "@/hooks/use-toast"
import { usePageHeader } from "@/hooks/use-page-header"
import { CASHIER_PATHS } from "@/app/router/paths"
import { ROLE_HOME } from "@/app/router/RoleHomeRedirect"
import { useGoBack } from "@/hooks/use-go-back"
import { useBill } from "@/hooks/useBill"
import {
  useTableSession,
  useOrderDetailsBySession,
  useCreateInvoice,
  useCreatePayment,
} from "@/features/cashier/api"
import { useAuthStore } from "@/stores/auth.store"
import { ManualDiscountModal } from "@/features/cashier/components/ManualDiscountModal"
import { PaymentMethodButtons } from "@/features/cashier/components/PaymentMethodButtons"
import { cn } from "@/lib/utils"
import { useIsMutating } from "@tanstack/react-query"
import { CheckoutLines } from "./CheckoutLines"
import { qk } from "@/lib/query-keys"
import { APP_ROLE } from "@/config/roles"
import { isBillableDetail } from "@/lib/order-detail-billing"
import { CancelSessionDialog } from "@/features/shared/floor-ops/CancelSessionDialog"

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`

/**
 * Thanh toán (Checkout)
 * Nguồn: Desktop / Thanh toán
 *
 * Màn "Chốt bàn" của Thu ngân với API thực:
 * 1. Fetch table session + order details + bill (BE tính)
 * 2. Lập hóa đơn nháp khi cần lưu khoản chiết khấu hoặc thu tiền.
 * 3. Lưu chiết khấu theo hóa đơn và dùng tổng tiền backend trả về.
 * 4. Tạo payment (POST /payments)
 *
 * FE KHÔNG tự tính tiền — mọi con số lấy từ `useBill` / invoice của BE.
 */
export default function CheckoutPage() {
  const { tableSessionId: sessionIdParam } = useParams<{ tableSessionId: string }>()
  const tableSessionId = sessionIdParam ? parseInt(sessionIdParam, 10) : undefined
  return <Checkout key={sessionIdParam} tableSessionId={tableSessionId} />
}

function Checkout({ tableSessionId }: { tableSessionId?: number }) {
  const navigate = useNavigate()
  const { toast } = useToast()
  const currentUser = useAuthStore((s) => s.account)
  const branchId = useAuthStore((s) => s.branchId)
  const role = useAuthStore((s) => s.role)
  const paymentPaths = getStaffPaymentPaths(role)
  // Màn Thanh toán mở được bởi Thu ngân / QL chi nhánh / Quản trị NH (Bảng 4.2 "Thu tiền, đóng
  // bàn") nên fallback của nút "Quay lại" phải theo vai trò — ROLE_HOME là Sơ đồ bàn của vai trò.
  // Fetch data
  const { data: session, isLoading: sessionLoading } = useTableSession(tableSessionId)
  const tableMapPath = role ? ROLE_HOME[role] : CASHIER_PATHS.TABLE_MAP
  const goBack = useGoBack(session?.takeaway ? takeawayListPath(tableMapPath) : tableMapPath)
  const {
    data: orderDetails = [],
    isLoading: orderDetailsLoading,
    isSuccess: orderDetailsLoaded,
  } = useOrderDetailsBySession(tableSessionId)

  // Lấy bill từ BE (invoice nếu có, preview nếu chưa)
  const { data: bill, isLoading: billLoading } = useBill(tableSessionId, { refreshDraft: true })

  // Mutations
  const createInvoiceMutation = useCreateInvoice()
  const createPaymentMutation = useCreatePayment()
  const saveInvoiceDiscount = useSaveInvoiceDiscount(tableSessionId)
  const { data: currentInvoice, isSuccess: invoiceLoaded } = useInvoiceBySession(tableSessionId, {
    refetchInterval: (query) => (query.state.data?.status === "PENDING" ? 2500 : false),
  })
  const canReview = role === APP_ROLE.BRANCH_MANAGER || role === APP_ROLE.RESTAURANT_ADMIN
  const approvalPending = currentInvoice?.discountApprovalPending ?? false
  const sharedQuote = currentInvoice?.quoteShared ?? false
  const approval = usePendingDiscountApproval(approvalPending ? currentInvoice?.id : undefined)
  const decideApproval = useDecideDiscountApproval(tableSessionId)
  const adjusting = useIsMutating({ mutationKey: qk.orderDetails.checkoutRemoval }) > 0

  const effectiveBranchId = session?.branchId ?? branchId
  const transferBranch = useBranch(session?.branchId)
  const canSelectQr = transferBranch.isSuccess && hasBranchTransferAccount(transferBranch.data)

  // Local state
  const [cashTendered, setCashTendered] = React.useState<number | null>(null)
  const [verifiedTotal, setVerifiedTotal] = React.useState<number | null>(null)
  const [isDiscountModalOpen, setDiscountModalOpen] = React.useState(false)
  const [savingDiscount, setSavingDiscount] = React.useState(false)
  const [isIssuingInvoice, setIssuingInvoice] = React.useState(false)
  const [syncingQrInvoice, setSyncingQrInvoice] = React.useState(false)
  const [cancelSessionOpen, setCancelSessionOpen] = React.useState(false)
  // Chặn double-submit: React state (isPending) chỉ cập nhật sau khi re-render,
  // nên nếu bấm 2 lần liên tiếp rất nhanh (hoặc double-click) trước khi nút kịp
  // disable, handleIssueInvoice có thể chạy song song 2 lần và tạo 2 hóa đơn /
  // gọi đóng phiên 2 lần -> lỗi "Phiên bàn phải ở trạng thái CHỜ THANH TOÁN...".
  // Dùng ref để chặn ngay lập tức, đồng bộ, không phụ thuộc vào re-render.
  const isSubmittingRef = React.useRef(false)

  // Tiền hàng = tổng giá đã giảm của các món (gốc − KM món)
  const itemsSubTotal = Math.max(0, (bill?.grossSubTotal ?? 0) - (bill?.itemPromotionDiscount ?? 0))

  const effectiveOrderPromoDiscount = bill?.orderPromotionDiscount ?? 0
  const displayOrderPromoName = bill?.orderPromotionName
  const discountBaseAmount = Math.max(0, itemsSubTotal - effectiveOrderPromoDiscount)
  const effectiveManualDiscountAmount = bill?.manualDiscount ?? 0
  const serviceFeeRate = bill?.serviceFeeRate ?? 0
  const effectiveServiceFee = bill?.serviceFee ?? 0
  const vatRate = bill?.vatRate ?? 0
  const effectiveVatAmount = bill?.vatAmount ?? 0
  const displayGrandTotal = bill?.grandTotal ?? 0

  const grandTotal = verifiedTotal ?? displayGrandTotal
  const checkoutBusy =
    isIssuingInvoice || syncingQrInvoice || savingDiscount || decideApproval.isPending || adjusting
  const draftTotalChanged =
    currentInvoice?.status === "PENDING" &&
    !sharedQuote &&
    (currentInvoice.totalPaid ?? 0) === 0 &&
    bill != null &&
    (bill.grandTotal !== currentInvoice.grandTotal ||
      (bill.orderPromotionDiscount ?? 0) !==
        (currentInvoice.orderPromotionDiscount ??
          Math.max(
            0,
            (currentInvoice.totalPromotionDiscount ?? 0) -
              (currentInvoice.itemPromotionDiscount ?? 0),
          )))
  const emptyTableCheckout =
    session?.status === "WAITING_FOR_PAY" &&
    !session.takeaway &&
    orderDetailsLoaded &&
    !orderDetails.some(isBillableDetail) &&
    bill?.grandTotal === 0
  const canCancelEmptyTable =
    canReview &&
    emptyTableCheckout &&
    invoiceLoaded &&
    (!currentInvoice ||
      (["PENDING", "CANCELLED"].includes(currentInvoice.status) &&
        (currentInvoice.totalPaid ?? 0) === 0 &&
        !currentInvoice.eInvoiceRef))
  const canEditDiscount =
    !emptyTableCheckout &&
    !approvalPending &&
    session?.status === "WAITING_FOR_PAY" &&
    (!currentInvoice ||
      (currentInvoice.status === "PENDING" && (currentInvoice.totalPaid ?? 0) === 0))
  const changeAmount = cashTendered == null ? null : cashTendered - grandTotal
  const canIssueCashInvoice =
    !checkoutBusy &&
    session?.status === "WAITING_FOR_PAY" &&
    grandTotal > 0 &&
    cashTendered !== null &&
    cashTendered >= grandTotal
  const next100k = Math.ceil(grandTotal / 100_000) * 100_000
  const next500k = Math.ceil((next100k + 1) / 500_000) * 500_000
  const quickAmounts = [next100k, next500k].filter((amount) => amount > grandTotal)

  async function goToQrTransfer(printPrebill = false) {
    if (!tableSessionId || !paymentPaths || !canSelectQr || checkoutBusy || isSubmittingRef.current)
      return
    if (draftTotalChanged) {
      if (!effectiveBranchId) return
      isSubmittingRef.current = true
      setSyncingQrInvoice(true)
      try {
        const refreshedInvoice = await createInvoiceMutation.mutateAsync({
          branchId: effectiveBranchId,
          tableSessionId,
        })
        if (refreshedInvoice.grandTotal !== grandTotal) {
          setVerifiedTotal(refreshedInvoice.grandTotal)
          toast({
            title: "Số tiền phải thu đã thay đổi",
            description: "Kiểm tra lại tạm tính trước khi tiếp tục.",
          })
          return
        }
      } catch (error) {
        toast({
          title: "Chưa cập nhật được tạm tính",
          description: error instanceof Error ? error.message : "Vui lòng thử lại.",
          variant: "danger",
        })
        return
      } finally {
        setSyncingQrInvoice(false)
        isSubmittingRef.current = false
      }
    }
    navigate(
      generatePath(paymentPaths.QR_TRANSFER_PAYMENT, { tableSessionId: String(tableSessionId) }),
      { state: { printPrebill } },
    )
  }

  async function handleSaveDiscount(discount: InvoiceDiscountInput | null) {
    if (
      !tableSessionId ||
      !effectiveBranchId ||
      !canEditDiscount ||
      checkoutBusy ||
      isSubmittingRef.current
    )
      return
    isSubmittingRef.current = true
    setSavingDiscount(true)
    try {
      const invoice =
        currentInvoice && !draftTotalChanged
          ? currentInvoice
          : await createInvoiceMutation.mutateAsync({
              branchId: effectiveBranchId,
              tableSessionId,
            })
      setVerifiedTotal(null)
      const updated = await saveInvoiceDiscount.mutateAsync({ invoiceId: invoice.id, discount })
      setCashTendered(null)
      setDiscountModalOpen(false)
      toast({
        title: updated.discountApprovalPending
          ? "Đã gửi yêu cầu duyệt"
          : discount
            ? "Đã lưu chiết khấu tay"
            : "Đã bỏ chiết khấu tay",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Chưa cập nhật được chiết khấu",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "danger",
      })
    } finally {
      setSavingDiscount(false)
      isSubmittingRef.current = false
    }
  }

  async function reviewDiscount(approved: boolean) {
    if (!currentInvoice || !approval.data || checkoutBusy) return
    try {
      await decideApproval.mutateAsync({
        invoiceId: currentInvoice.id,
        requestId: approval.data.requestId,
        approved,
      })
      setVerifiedTotal(null)
      setCashTendered(null)
      toast({
        title: approved ? "Đã duyệt. Hãy gửi lại tạm tính mới cho khách." : "Đã từ chối yêu cầu",
        variant: "success",
      })
    } catch (error) {
      toast({
        title: "Chưa xử lý được yêu cầu",
        description: error instanceof Error ? error.message : "Vui lòng thử lại.",
        variant: "danger",
      })
    }
  }

  async function handleIssueInvoice() {
    if (
      !tableSessionId ||
      !effectiveBranchId ||
      !paymentPaths ||
      !canIssueCashInvoice ||
      cashTendered === null ||
      isSubmittingRef.current
    )
      return
    isSubmittingRef.current = true
    setIssuingInvoice(true)

    try {
      const invoice = await createInvoiceMutation.mutateAsync({
        branchId: effectiveBranchId,
        tableSessionId,
      })

      const amountDue = invoice.grandTotal
      if (amountDue !== grandTotal || amountDue <= 0 || cashTendered < amountDue) {
        setVerifiedTotal(amountDue)
        toast({
          title: "Số tiền phải thu đã thay đổi",
          description: "Kiểm tra lại tổng tiền trước khi tiếp tục.",
          variant: "danger",
        })
        return
      }

      await createPaymentMutation.mutateAsync({
        invoiceId: invoice.id,
        method: "CASH",
        amount: amountDue,
        amountTendered: cashTendered,
      })

      toast({
        title: "Thu tiền thành công",
        description: `Đã phát hành hóa đơn #${invoice.id}.`,
        variant: "success",
      })

      navigate(
        generatePath(paymentPaths.E_INVOICE, {
          invoiceId: String(invoice.id),
        }),
      )
    } catch (error) {
      console.error("Error issuing invoice:", error)
      toast({
        title: "Lỗi phát hành hóa đơn",
        description: error instanceof Error ? error.message : "Vui lòng thử lại",
        variant: "danger",
      })
    } finally {
      isSubmittingRef.current = false
      setIssuingInvoice(false)
    }
  }

  usePageHeader({
    title: session
      ? `${session.tableName || `Bàn #${session.tableId}`} · ${session.takeaway ? "Thanh toán" : "Chốt bàn"}`
      : "Chốt bàn",
    subtitle: session
      ? `${session.guestCount || 0} khách · Phiên #${session.id} · ${currentUser?.fullName || "Thu ngân"}`
      : undefined,
  })

  // Loading state
  if (sessionLoading || orderDetailsLoading || billLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
          <p className="text-sm text-text-secondary">Đang tải thông tin bàn...</p>
        </div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-status-danger-subtle">
            <TriangleAlert aria-hidden="true" className="size-7 text-status-danger" />
          </div>
          <h2 className="text-lg font-bold text-text-primary">Không tìm thấy phiên bàn</h2>
          <Button className="mt-6" onClick={goBack}>
            Quay lại
          </Button>
        </div>
      </div>
    )
  }

  const tableName = session.tableName || `Bàn #${session.tableId}`
  const guestCount = session.guestCount || 0
  const waiterName = currentUser?.fullName || "Thu ngân"

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page lg:flex-row">
      {/* ============================================================
          1. CỘT TRÁI: DANH SÁCH MÓN ĐÃ GỌI
          ============================================================ */}
      <div className="flex flex-1 flex-col">
        {/* Thanh tiêu đề trắng + border-bottom, CHỈ trên cột trái — Figma "Thanh toán"
            để cột thanh toán bên phải chạy suốt từ mép trên.
            Ẩn ở <md: tiêu đề đã lên MobileHeader biến thể "back". */}
        <div className="hidden flex-wrap items-center justify-between gap-3 border-b border-border-default bg-surface-card px-6 py-5 sm:px-8 md:flex">
          <div>
            <button
              type="button"
              onClick={goBack}
              className="mb-1 flex items-center gap-1 text-xs font-medium text-text-tertiary hover:text-text-primary transition-colors cursor-pointer"
            >
              <ChevronLeft className="size-3.5" />
              <span>Quay lại</span>
            </button>
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {tableName} · {session.takeaway ? "Thanh toán" : "Chốt bàn"}
            </h1>
            <p className="mt-1 text-sm text-text-tertiary">
              {guestCount} khách · Phiên #{session.id} · Thu ngân: {waiterName}
            </p>
          </div>
          <StatusBadge type="tableSession" status={session.status} />
        </div>

        <div className="p-4 sm:p-8">
          {/* <md: badge trạng thái tách riêng vì thanh tiêu đề trên đã ẩn */}
          <div className="mb-4 md:hidden">
            <StatusBadge type="tableSession" status={session.status} />
          </div>

          <CheckoutLines
            details={orderDetails}
            session={session}
            busy={checkoutBusy}
            onAdjusted={() => setVerifiedTotal(null)}
          />
        </div>
      </div>

      {/* ============================================================
          2. CỘT PHẢI: THANH TOÁN
          ============================================================ */}
      <section
        aria-labelledby="checkout-payment-title"
        className="order-first w-full shrink-0 border-b border-border-default bg-surface-card p-4 sm:p-8 lg:order-none lg:w-[380px] lg:border-b-0 lg:border-l"
      >
        <h2 id="checkout-payment-title" className="text-xl font-bold text-text-primary">
          Thanh toán
        </h2>

        <div className="mt-5 space-y-3">
          {bill && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Tiền hàng</span>
                <span className="font-medium text-text-primary">{formatVnd(itemsSubTotal)}</span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  Khuyến mãi đơn{displayOrderPromoName ? ` (${displayOrderPromoName})` : ""}
                </span>
                <span className="shrink-0 font-medium text-text-secondary">
                  {effectiveOrderPromoDiscount > 0
                    ? `−${formatVnd(effectiveOrderPromoDiscount)}`
                    : "—"}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Chiết khấu tay</span>
                {effectiveManualDiscountAmount > 0 ? (
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => setDiscountModalOpen(true)}
                      disabled={checkoutBusy || !canEditDiscount}
                      aria-label="Thay chiết khấu tay"
                      className="font-medium text-status-success underline-offset-2 enabled:hover:underline"
                    >
                      −{formatVnd(effectiveManualDiscountAmount)}
                    </button>
                    {canEditDiscount && (
                      <button
                        type="button"
                        onClick={() => void handleSaveDiscount(null)}
                        className="rounded-full p-0.5 text-text-tertiary hover:bg-surface-muted hover:text-status-danger transition-colors"
                        aria-label={sharedQuote ? "Yêu cầu bỏ chiết khấu tay" : "Bỏ chiết khấu tay"}
                        disabled={checkoutBusy}
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    )}
                  </div>
                ) : (
                  canEditDiscount && (
                    <button
                      type="button"
                      onClick={() => setDiscountModalOpen(true)}
                      disabled={checkoutBusy}
                      className="rounded-pill bg-brand-primary-subtle px-3 py-1 text-xs font-semibold text-brand-primary hover:bg-brand-primary/20"
                    >
                      + Nhập chiết khấu
                    </button>
                  )
                )}
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  Phí dịch vụ ({serviceFeeRate.toFixed(0)}%)
                </span>
                <span className="font-medium text-text-primary">
                  {formatVnd(effectiveServiceFee)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">VAT ({vatRate.toFixed(0)}%)</span>
                <span className="font-medium text-text-primary">
                  {formatVnd(effectiveVatAmount)}
                </span>
              </div>
            </>
          )}
        </div>

        {approvalPending && (
          <div className="mt-3 space-y-2 rounded-xl bg-surface-muted p-3 text-sm" role="status">
            <p className="font-semibold">Chiết khấu đang chờ quản lý duyệt</p>
            {approval.data && (
              <>
                <p>
                  {approval.data.type === "PERCENTAGE"
                    ? `Giảm ${approval.data.value}%`
                    : approval.data.type === "FIXED_AMOUNT"
                      ? `Giảm ${formatVnd(approval.data.value ?? 0)}`
                      : "Bỏ chiết khấu hiện tại"}
                </p>
                <p className="break-words text-text-secondary">{approval.data.reason}</p>
                {canReview && approval.data.requestedBy !== currentUser?.id && (
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      disabled={checkoutBusy}
                      onClick={() => void reviewDiscount(false)}
                    >
                      Từ chối
                    </Button>
                    <Button disabled={checkoutBusy} onClick={() => void reviewDiscount(true)}>
                      Duyệt
                    </Button>
                  </div>
                )}
              </>
            )}
            <p className="text-text-secondary">Tổng tiền chỉ đổi sau khi yêu cầu được duyệt.</p>
          </div>
        )}

        <Divider className="my-4" />
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-semibold text-text-primary">Phải thu</span>
          <strong className="text-2xl font-bold tabular-nums text-text-primary">
            {formatVnd(grandTotal)}
          </strong>
        </div>

        <PaymentMethodButtons
          selected="CASH"
          transfer={{
            onClick: () => goToQrTransfer(),
            disabled: checkoutBusy || !canSelectQr || emptyTableCheckout,
            "aria-describedby": !canSelectQr ? "checkout-qr-availability" : undefined,
          }}
        />
        <Button
          type="button"
          variant="outline"
          className="mt-3 w-full"
          disabled={
            !canSelectQr || checkoutBusy || grandTotal <= 0 || session.status !== "WAITING_FOR_PAY"
          }
          onClick={() => goToQrTransfer(true)}
        >
          In tạm tính có QR
        </Button>
        {!canSelectQr ? (
          <div
            id="checkout-qr-availability"
            role="status"
            className="mt-2 text-sm text-text-secondary"
          >
            {transferBranch.isError ? (
              <>
                Chưa kiểm tra được tài khoản nhận chuyển khoản.
                <Button
                  type="button"
                  variant="link"
                  size="sm"
                  className="px-2"
                  onClick={() => void transferBranch.refetch()}
                >
                  Thử lại
                </Button>
              </>
            ) : transferBranch.isSuccess ? (
              "QR chưa khả dụng vì chi nhánh chưa cấu hình tài khoản ngân hàng. Bạn có thể thu tiền mặt."
            ) : (
              "Đang kiểm tra tài khoản nhận chuyển khoản…"
            )}
          </div>
        ) : null}

        <div className="mt-4 space-y-1.5">
          <label
            htmlFor="checkout-cash-tendered"
            className="block text-sm font-semibold text-text-primary"
          >
            Tiền khách đưa
          </label>
          <input
            id="checkout-cash-tendered"
            type="text"
            inputMode="numeric"
            autoComplete="off"
            aria-describedby="checkout-cash-status"
            aria-invalid={changeAmount !== null && changeAmount < 0}
            disabled={checkoutBusy || emptyTableCheckout}
            value={cashTendered != null ? cashTendered.toLocaleString("vi-VN") : ""}
            onChange={(e) => {
              const raw = e.target.value.replace(/\D/g, "")
              const amount = Number(raw)
              setCashTendered(raw && Number.isSafeInteger(amount) ? amount : null)
            }}
            placeholder="Nhập số tiền"
            className="h-11 w-full rounded-md border border-border-default bg-surface-card px-3 text-lg font-semibold tabular-nums text-text-primary outline-none placeholder:text-base placeholder:font-normal placeholder:text-text-secondary focus:border-brand-primary focus:ring-1 focus:ring-brand-primary aria-invalid:border-status-danger"
          />
        </div>

        <div className="mt-2 grid grid-cols-[minmax(0,1.4fr)_repeat(2,minmax(0,1fr))] gap-2">
          <button
            type="button"
            onClick={() => setCashTendered(grandTotal)}
            disabled={checkoutBusy || grandTotal <= 0}
            aria-pressed={cashTendered === grandTotal}
            className="min-h-11 rounded-md border border-border-default px-1 text-xs font-semibold text-text-primary hover:border-border-strong aria-pressed:border-brand-primary aria-pressed:bg-brand-primary-subtle disabled:opacity-50"
          >
            Khách đưa đủ
          </button>
          {quickAmounts.map((amount) => (
            <button
              key={amount}
              type="button"
              onClick={() => setCashTendered(amount)}
              aria-pressed={cashTendered === amount}
              disabled={checkoutBusy || grandTotal <= 0}
              className="min-h-11 rounded-md border border-border-default px-1 text-xs font-semibold tabular-nums text-text-primary hover:border-border-strong aria-pressed:border-brand-primary aria-pressed:bg-brand-primary-subtle disabled:opacity-50"
            >
              {formatVnd(amount)}
            </button>
          ))}
        </div>

        <p
          id="checkout-cash-status"
          role="status"
          className={cn(
            "mt-3 min-h-5 text-sm font-medium tabular-nums",
            changeAmount !== null && changeAmount < 0 ? "text-red-800" : "text-text-secondary",
          )}
        >
          {session.status !== "WAITING_FOR_PAY"
            ? "Phiên bàn hiện không ở trạng thái chờ thanh toán."
            : changeAmount === null
              ? "Nhập tiền khách đưa hoặc chọn Khách đưa đủ."
              : changeAmount < 0
                ? `Còn thiếu ${formatVnd(-changeAmount)}`
                : changeAmount === 0
                  ? "Khách đưa đủ tiền."
                  : `Tiền thối lại ${formatVnd(changeAmount)}`}
        </p>

        {grandTotal <= 0 ? (
          <div className="mt-8 rounded-card border border-status-warning/30 bg-status-warning-subtle p-4">
            <p className="text-sm font-semibold text-status-warning">
              {emptyTableCheckout ? "Phiên không có món nào tính tiền" : "Số tiền phải thu là 0đ"}
            </p>
            <p className="mt-1 text-xs text-text-secondary">
              {canCancelEmptyTable
                ? "Bạn có thể hủy phiên để giải phóng bàn."
                : emptyTableCheckout && !canReview
                  ? "Liên hệ Quản lý chi nhánh hoặc Quản trị nhà hàng để kiểm tra và hủy phiên."
                  : "Không thể phát hành hóa đơn 0đ."}
            </p>
            {canCancelEmptyTable && (
              <Button
                type="button"
                variant="outline"
                className="mt-3 w-full text-status-danger"
                disabled={checkoutBusy}
                onClick={() => setCancelSessionOpen(true)}
              >
                Hủy phiên bàn
              </Button>
            )}
          </div>
        ) : null}

        {grandTotal > 0 ? (
          <div className="mt-3">
            <Button
              className="w-full bg-brand-primary-hover px-3 hover:bg-[#b93617]"
              size="lg"
              onClick={handleIssueInvoice}
              disabled={!canIssueCashInvoice}
              aria-describedby="checkout-cash-status"
            >
              {isIssuingInvoice ? "Đang xử lý..." : "Thu tiền & phát hành hóa đơn"}
            </Button>
          </div>
        ) : null}
      </section>

      <CancelSessionDialog
        open={cancelSessionOpen}
        onOpenChange={setCancelSessionOpen}
        sessionId={canCancelEmptyTable ? session.id : undefined}
        tableName={tableName}
        onCancelled={() => navigate(tableMapPath, { replace: true })}
      />
      <ManualDiscountModal
        open={isDiscountModalOpen}
        onOpenChange={setDiscountModalOpen}
        tableName={tableName}
        sessionCode={`#${session.id}`}
        baseAmount={discountBaseAmount}
        replacing={effectiveManualDiscountAmount > 0}
        submitting={savingDiscount}
        requiresApproval={sharedQuote}
        onSubmit={handleSaveDiscount}
      />
    </div>
  )
}
