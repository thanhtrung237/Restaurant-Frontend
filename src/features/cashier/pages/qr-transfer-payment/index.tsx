import { shareInvoiceQuote } from "@/api/invoices.api";
import { getStaffPaymentPaths } from "@/app/router/paths/staff-payment.paths";
import * as React from "react";
import { useLocation, useNavigate, useParams, generatePath } from "react-router-dom";
import { useIsMutating } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { PaymentMethodButtons } from "@/features/cashier/components/PaymentMethodButtons";

import { Button } from "@/components/ui/button";
import { Divider } from "@/components/ui/divider";
import { StatusBadge } from "@/components/common/StatusBadge";
import { useToast } from "@/hooks/use-toast";
import { usePageHeader } from "@/hooks/use-page-header";
import { CASHIER_PATHS, BRANCH_MANAGER_PATHS, RESTAURANT_ADMIN_PATHS } from "@/app/router/paths";
import { getBankLabel } from "@/config/banks";
import { hasBranchTransferAccount } from "@/features/cashier/lib/branch-transfer-account";
import { useGoBack } from "@/hooks/use-go-back";
import { useBill } from "@/hooks/useBill";
import { getErrorMessage, isApiStatus } from "@/lib/http";
import { APP_ROLE } from "@/config/roles";
import {
  useTableSession,
  useOrderDetailsBySession,
  useCreateInvoice,
  useInvoiceBySession,
  useInvoiceQrCode,
  useCreatePayment,
  useBranch,
} from "@/features/cashier/api";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { useAuthStore } from "@/stores/auth.store";
import { CheckoutLines } from "../checkout/CheckoutLines";
import { qk } from "@/lib/query-keys";
import { InvoicePrint, type InvoiceAmountRow } from "../e-invoice/InvoicePrint";
import { groupInvoiceLines } from "../e-invoice/invoice-lines";

const formatVnd = (n: number) => `${Math.round(n).toLocaleString("vi-VN")}đ`;

// Poll hóa đơn mỗi 1s để biết khi nào khách đã chuyển khoản xong — CÙNG cơ chế
// với trang khách hàng (`payment-qr`), để 2 màn hình luôn phản ánh đúng 1 nguồn
// sự thật duy nhất là dữ liệu trên backend, thay vì tự suy đoán ở mỗi phía.
const POLL_INTERVAL_MS = 1000;

export default function QrTransferPaymentPage() {
  const { tableSessionId: sessionIdParam } = useParams<{ tableSessionId: string }>();
  return <QrTransferPayment key={sessionIdParam} tableSessionId={sessionIdParam ? Number(sessionIdParam) : undefined} />;
}

function QrTransferPayment({ tableSessionId }: { tableSessionId?: number }) {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const currentUser = useAuthStore((s) => s.account);
  const role = useAuthStore((s) => s.role);
  const paymentPaths = getStaffPaymentPaths(role);
  const goBack = useGoBack(paymentPaths?.TABLE_MAP ?? CASHIER_PATHS.TABLE_MAP);
  // Chỉ QL chi nhánh / Quản trị NH mới vào được trang Cấu hình chi nhánh (FR-BRN-02).
  // Thu ngân thấy cảnh báo nhưng không thấy nút — bấm vào cũng chỉ ra trang 403.

  const { data: session, isLoading: sessionLoading } = useTableSession(tableSessionId);
  const { data: orderDetails = [], isLoading: orderDetailsLoading } = useOrderDetailsBySession(tableSessionId);
  const branchId = session?.branchId;
  const branchConfigPath = role === APP_ROLE.BRANCH_MANAGER
    ? BRANCH_MANAGER_PATHS.CONFIG
    : role === APP_ROLE.RESTAURANT_ADMIN && branchId
      ? generatePath(RESTAURANT_ADMIN_PATHS.BRANCH_CONFIG, { branchId: String(branchId) })
      : undefined;
  const branchQuery = useBranch(branchId);
  const hasBankConfig = branchQuery.isSuccess && hasBranchTransferAccount(branchQuery.data);

  // Lấy bill từ BE
  const { data: bill } = useBill(tableSessionId);

  const createInvoiceMutation = useCreateInvoice();

  // Nguồn sự thật DUY NHẤT cho việc "đã nhận chuyển khoản hay chưa": hóa đơn
  // thật lấy từ backend, poll liên tục — không dùng state cục bộ nào khác.
  const invoiceQuery = useInvoiceBySession(tableSessionId, {
    refetchInterval: hasBankConfig ? POLL_INTERVAL_MS : undefined,
  });
  const { data: invoice, isFetched: invoiceFetched } = invoiceQuery;
  const invoiceLookupFailed = invoiceQuery.isError;
  const qrPaid = invoice?.status === "PAID" || invoice?.status === "ISSUED";

  const qrQuery = useInvoiceQrCode(hasBankConfig && invoice?.status === "PENDING" ? invoice.id : undefined);
  const { data: qrData, error: qrError, refetch: refetchQr } = qrQuery;
  const qrAmountChanged = Boolean(qrData && invoice && (
    qrData.grandTotal !== invoice.grandTotal ||
    qrData.remainingAmount !== (invoice.remainingAmount ?? invoice.grandTotal)
  ));
  React.useEffect(() => {
    if (qrAmountChanged && invoice?.status === "PENDING") void refetchQr();
  }, [qrAmountChanged, invoice?.grandTotal, invoice?.remainingAmount, invoice?.status, refetchQr]);
  const isBankAccountNotConfigured =
    (branchQuery.isSuccess && !hasBankConfig) || isApiStatus(qrError, 409);
  const [loadedQrUrl, setLoadedQrUrl] = React.useState("");
  const [failedQrUrl, setFailedQrUrl] = React.useState("");

  /**
   * Tạo hoá đơn ĐÚNG MỘT LẦN cho mỗi phiên.
   *
   * Bản trước: nhánh `catch` đặt lại cờ "đã thử" về `false`, mà effect lại phụ thuộc vào
   * `invoice` / `session` (đang poll 1 giây/lần) và vào chính đối tượng mutation (đổi mỗi lần
   * render) ⇒ lỗi là gọi lại ngay, lỗi tiếp là gọi lại tiếp. Đo được **444 lần `POST /invoices`
   * trong 6 giây** khi backend trả lỗi.
   *
   * Nay: cờ ref giữ ID phiên đã thử và KHÔNG bao giờ tự đặt lại — chỉ Thu ngân bấm "Thử lại"
   * mới gọi lần nữa. Mọi thứ hay đổi (dữ liệu poll, mutation) đọc qua `liveRef` nên effect chỉ
   * phụ thuộc vào ID phiên / ID chi nhánh.
   */
  const invoiceAttemptedForSessionRef = React.useRef<number | null>(null);
  const [invoiceCreating, setInvoiceCreating] = React.useState(false);
  const [invoiceCreateError, setInvoiceCreateError] = React.useState<string | null>(null);

  // Số tiền: ưu tiên invoice thật, sau đó tới bill preview của BE
  const grandTotal = invoice?.grandTotal ?? bill?.grandTotal ?? 0;
  const amountToCollect = qrData?.remainingAmount ?? invoice?.remainingAmount ?? grandTotal;

  const [confirmModalOpen, setConfirmModalOpen] = React.useState(false);
  const [transferVerified, setTransferVerified] = React.useState(false);
  const [isConfirming, setIsConfirming] = React.useState(false);
  const confirmingRef = React.useRef(false);
  const createPaymentMutation = useCreatePayment();
  const adjusting = useIsMutating({ mutationKey: qk.orderDetails.checkoutRemoval }) > 0;

  const hasValidQrData = Boolean(
    qrData && qrData.invoiceId === invoice?.id && qrData.qrImageUrl?.trim() &&
    qrData.bankName?.trim() && qrData.accountNo?.trim() && qrData.accountName?.trim() &&
    qrData.transferContent?.trim() && Number.isFinite(qrData.remainingAmount) && qrData.remainingAmount > 0,
  );
  const [sharedQrUrl, setSharedQrUrl] = React.useState("");
  const [shareError, setShareError] = React.useState<string | null>(null);
  const [shareAttempt, setShareAttempt] = React.useState(0);
  const validQrUrl = hasValidQrData && !qrAmountChanged && session?.status === "WAITING_FOR_PAY"
    ? qrData?.qrImageUrl : undefined;
  const qrInvoiceId = invoice?.id;
  const qrInvoiceTotal = invoice?.grandTotal;
  React.useEffect(() => {
    if (!validQrUrl || qrInvoiceId === undefined || qrInvoiceTotal === undefined) return;
    let active = true;
    setShareError(null);
    void shareInvoiceQuote(qrInvoiceId, qrInvoiceTotal).then(() => {
      if (active) setSharedQrUrl(validQrUrl);
    }).catch((error: unknown) => {
      if (active) setShareError(getErrorMessage(error));
    });
    return () => { active = false; };
  }, [validQrUrl, qrInvoiceId, qrInvoiceTotal, shareAttempt]);
  const quoteReady = Boolean(validQrUrl && validQrUrl === sharedQrUrl);
  const imageFailed = Boolean(failedQrUrl && failedQrUrl === qrData?.qrImageUrl);
  const isSessionPayable = session?.status === "WAITING_FOR_PAY";
  const canConfirmTransfer =
    isSessionPayable && hasBankConfig && !invoiceLookupFailed && qrQuery.isSuccess && !invoiceCreating &&
    !adjusting && quoteReady && hasValidQrData && !imageFailed && loadedQrUrl === qrData?.qrImageUrl
    && qrData?.grandTotal === invoice?.grandTotal && qrData?.remainingAmount === (invoice?.remainingAmount ?? grandTotal)
    && !orderDetails.some((item) => item.status === "PENDING_WEIGHT");
  const bankAccountLabel = qrData ? `${getBankLabel(qrData.bankName)} · ${qrData.accountNo}` : "";
  const hasRecordedPayment = (invoice?.totalPaid ?? qrData?.totalPaid ?? 0) > 0;
  const canPrintPrebill = Boolean(canConfirmTransfer && invoice && qrData && orderDetails.length > 0);
  const requestedPrebill = React.useRef(false);
  React.useEffect(() => {
    if (!location.state?.printPrebill || !canPrintPrebill || requestedPrebill.current) return;
    requestedPrebill.current = true;
    window.print();
  }, [canPrintPrebill, location.state]);


  // Mọi giá trị HAY ĐỔI mà việc tạo hoá đơn cần đọc — để ngoài danh sách phụ thuộc của effect.
  // Gán ngay trong thân render: lần gọi nào cũng thấy giá trị mới nhất, mà không kích hoạt effect.
  const liveRef = React.useRef({
    invoice,
    session,
    createInvoice: createInvoiceMutation.mutateAsync,
    toast,
  });
  // Cập nhật sau MỖI lần render (effect không có mảng phụ thuộc), và effect này khai trước
  // effect tạo hoá đơn nên luôn chạy trước nó — `liveRef` không bao giờ đọc phải giá trị cũ.
  React.useEffect(() => {
    liveRef.current = {
      invoice,
      session,
      createInvoice: createInvoiceMutation.mutateAsync,
      toast,
    };
  });


  /** Tạo hoặc đồng bộ hoá đơn cho phiên này. */
  const createInvoiceForSession = React.useCallback(async () => {
    if (!tableSessionId || !branchId || !hasBankConfig || isBankAccountNotConfigured) return;
    const live = liveRef.current;
    if (live.invoice) return;

    // Phiên không ở CHỜ THANH TOÁN thì backend từ chối — đừng gọi cho phí một request.
    if (live.session && live.session.status !== "WAITING_FOR_PAY") return;

    setInvoiceCreating(true);
    setInvoiceCreateError(null);
    try {
      await live.createInvoice({
        branchId,
        tableSessionId,
      });
    } catch (error) {
      const errMsg = getErrorMessage(error);
      setInvoiceCreateError(errMsg);
      live.toast({
        title: "Chưa tạo được hoá đơn",
        description: `${errMsg} — bấm "Thử lại" để gọi lại.`,
        variant: "danger",
      });
    } finally {
      setInvoiceCreating(false);
    }
  }, [tableSessionId, branchId, hasBankConfig, isBankAccountNotConfigured]);

  /**
   * Tạo hoặc đồng bộ khuyến mãi hoá đơn ngay khi vào màn QR — không đợi khách chuyển khoản xong.
   */
  React.useEffect(() => {
    if (
      !tableSessionId || !branchId || !invoiceFetched || !hasBankConfig || isBankAccountNotConfigured ||
      invoiceLookupFailed
    ) return;
    if (!invoice && invoiceAttemptedForSessionRef.current !== tableSessionId) {
      invoiceAttemptedForSessionRef.current = tableSessionId;
      void createInvoiceForSession();
    }
  }, [tableSessionId, branchId, invoiceFetched, hasBankConfig, isBankAccountNotConfigured, invoiceLookupFailed, createInvoiceForSession, invoice]);

  /** Thu ngân bấm "Thử lại" — lần gọi lại DUY NHẤT do người dùng chủ động. */
  function handleRetryCreateInvoice() {
    void createInvoiceForSession();
  }

  // Báo cho Thu ngân biết ngay khi backend xác nhận đã nhận đủ tiền
  const wasQrPaidRef = React.useRef(false);
  React.useEffect(() => {
    if (qrPaid && !wasQrPaidRef.current) {
      wasQrPaidRef.current = true;
      toast({
        title: "Hóa đơn đã thanh toán",
        description: `Đã ghi nhận đủ ${formatVnd(grandTotal)}.`,
        variant: "success",
      });
    }
  }, [qrPaid, grandTotal, toast]);

  const bankVerifiedInvoiceId = qrPaid && invoice?.payments?.some((payment) => payment.bankVerified) ? invoice.id : undefined;
  React.useEffect(() => {
    if (bankVerifiedInvoiceId == null || !paymentPaths) return;
    navigate(generatePath(paymentPaths.E_INVOICE, { invoiceId: String(bankVerifiedInvoiceId) }), {
      replace: true,
      state: { autoPrint: true },
    });
  }, [bankVerifiedInvoiceId, navigate, paymentPaths]);

  function goBackToCash() {
    if (!tableSessionId || !paymentPaths || qrPaid || hasRecordedPayment || adjusting || confirmingRef.current) return;
    navigate(generatePath(paymentPaths.CHECKOUT, { tableSessionId: String(tableSessionId) }));
  }

  function handleIssueInvoice() {
    if (!invoice || !paymentPaths) return;
    navigate(generatePath(paymentPaths.E_INVOICE, { invoiceId: String(invoice.id) }));
  }

  async function handleConfirmPaymentAndIssue() {
    if (!paymentPaths || !canConfirmTransfer || !transferVerified || !invoice || !qrData || confirmingRef.current) return;

    confirmingRef.current = true;
    setIsConfirming(true);
    try {
      const { data: latestQr } = await qrQuery.refetch({ throwOnError: true });
      if (
        !latestQr || latestQr.invoiceId !== invoice.id ||
        latestQr.remainingAmount !== qrData.remainingAmount ||
        latestQr.bankName !== qrData.bankName || latestQr.accountNo !== qrData.accountNo ||
        latestQr.accountName !== qrData.accountName || latestQr.transferContent !== qrData.transferContent ||
        latestQr.qrImageUrl !== qrData.qrImageUrl
      ) {
        setConfirmModalOpen(false);
        setTransferVerified(false);
        void invoiceQuery.refetch();
        toast({
          title: "Thông tin chuyển khoản đã thay đổi",
          description: "Kiểm tra lại giao dịch theo thông tin mới.",
          variant: "danger",
        });
        return;
      }

      await createPaymentMutation.mutateAsync({
        invoiceId: invoice.id,
        method: "BANK_TRANSFER",
        amount: latestQr.remainingAmount,
      });

      toast({
        title: "Đã ghi nhận chuyển khoản",
        description: `Đã ghi nhận ${formatVnd(latestQr.remainingAmount)}.`,
        variant: "success",
      });

      setConfirmModalOpen(false);
      navigate(generatePath(paymentPaths.E_INVOICE, { invoiceId: String(invoice.id) }));
    } catch (error) {
      setConfirmModalOpen(false);
      setTransferVerified(false);
      if (isApiStatus(error, 409)) {
        void invoiceQuery.refetch();
      }
      toast({
        title: "Chưa ghi nhận được chuyển khoản",
        description: getErrorMessage(error),
        variant: "danger",
      });
    } finally {
      confirmingRef.current = false;
      setIsConfirming(false);
    }
  }

  // Màn con — gọi TRƯỚC các nhánh return sớm (quy tắc hook).
  usePageHeader({
    title: session
      ? `${session.tableName || `Bàn #${session.tableId}`} · Chuyển khoản`
      : "Thanh toán chuyển khoản",
    subtitle: session
      ? `${session.guestCount || 0} khách · Phiên #${session.id}`
      : undefined,
  });

  if (sessionLoading || orderDetailsLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center gap-3">
          <div className="size-12 animate-spin rounded-full border-4 border-gray-200 border-t-brand-primary" />
          <p className="text-sm text-text-secondary">Đang tải thông tin bàn...</p>
        </div>
      </div>
    );
  }

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-page">
        <div className="flex flex-col items-center text-center">
          <div className="mb-4 flex size-16 items-center justify-center rounded-full bg-status-danger-subtle">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-lg font-bold text-text-primary">Không tìm thấy phiên bàn</h2>
          <Button className="mt-6" onClick={goBack}>
            Quay lại
          </Button>
        </div>
      </div>
    );
  }

  const tableName = session.tableName || `Bàn #${session.tableId}`;
  const guestCount = session.guestCount || 0;
  const waiterName = currentUser?.fullName || "Thu ngân";
  const prebillAmounts: InvoiceAmountRow[] = [
    { label: "Tiền hàng", amount: bill?.grossSubTotal ?? 0 },
    { label: "Khuyến mãi món", amount: -(bill?.itemPromotionDiscount ?? 0) },
    { label: "Khuyến mãi đơn", amount: -(bill?.orderPromotionDiscount ?? 0) },
    { label: "Chiết khấu tay", amount: -(bill?.manualDiscount ?? 0) },
    { label: "Phí dịch vụ", amount: bill?.serviceFee ?? 0 },
    { label: "VAT", amount: bill?.vatAmount ?? 0 },
  ].filter(({ amount }) => amount !== 0);

  return (
    <div className="flex flex-1 flex-col min-h-screen bg-surface-page lg:flex-row">
      {canPrintPrebill && invoice && qrData && (
        <InvoicePrint invoice={invoice} issuedAt={new Date().toLocaleString("vi-VN")} tableName={tableName}
          items={groupInvoiceLines(orderDetails)} amounts={prebillAmounts} transfer={qrData} />
      )}
      {/* CỘT TRÁI: DANH SÁCH MÓN */}
      <div className="flex-1 p-6 sm:p-8">
        <div className="flex flex-wrap items-start justify-between gap-3">
          {/* Ẩn ở <md: tiêu đề đã lên MobileHeader (màn con, biến thể "back") */}
          <div className="hidden md:block">
            <h1 className="text-2xl font-bold tracking-tight text-text-primary">
              {tableName} · Chốt bàn
            </h1>
            <p className="mt-1 text-sm text-text-tertiary">
              {guestCount} khách · Phiên #{session.id} · Thu ngân: {waiterName}
            </p>
          </div>
          <StatusBadge type="tableSession" status={session.status} />
        </div>

        <CheckoutLines details={orderDetails} session={session} busy={isConfirming || invoiceCreating} />
      </div>

      {/* CỘT PHẢI: THANH TOÁN QR */}
      <div className="order-first w-full shrink-0 border-b border-border-default bg-surface-card p-4 sm:p-8 lg:order-none lg:w-[380px] lg:border-b-0 lg:border-l">
        <h2 className="text-xl font-bold text-text-primary">Thanh toán</h2>

        <div className="mt-5 space-y-3">
          {bill && (
            <>
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">Tiền hàng</span>
                <span className="font-medium text-text-primary">
                  {formatVnd(bill.grossSubTotal - bill.itemPromotionDiscount)}
                </span>
              </div>

              {bill.orderPromotionDiscount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-status-success">
                    Khuyến mãi đơn{bill.orderPromotionName ? ` (${bill.orderPromotionName})` : ""}
                  </span>
                  <span className="font-medium text-status-success">
                    −{formatVnd(bill.orderPromotionDiscount)}
                  </span>
                </div>
              )}

              {bill.manualDiscount > 0 && (
                <div className="flex items-center justify-between text-sm">
                  <span className="text-text-secondary">Chiết khấu tay</span>
                  <span className="font-medium text-text-primary">
                    −{formatVnd(bill.manualDiscount)}
                  </span>
                </div>
              )}

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  Phí dịch vụ ({bill.serviceFeeRate.toFixed(0)}%)
                </span>
                <span className="font-medium text-text-primary">
                  {formatVnd(bill.serviceFee)}
                </span>
              </div>

              <div className="flex items-center justify-between text-sm">
                <span className="text-text-secondary">
                  VAT ({bill.vatRate.toFixed(0)}%)
                </span>
                <span className="font-medium text-text-primary">
                  {formatVnd(bill.vatAmount)}
                </span>
              </div>
            </>
          )}
        </div>

        <Divider className="my-4" />

        <div className="flex items-center justify-between">
          <span className="text-base font-bold text-text-primary">Tổng cộng</span>
          <span className="text-2xl font-bold text-brand-primary">{formatVnd(grandTotal)}</span>
        </div>

        <PaymentMethodButtons
          selected="BANK_TRANSFER"
          cash={{ onClick: goBackToCash, disabled: qrPaid || hasRecordedPayment || adjusting || isConfirming }}
        />

        {qrPaid ? (
          <div className="mt-4 space-y-3">
            <p role="status" className="text-sm font-semibold text-emerald-800">Hóa đơn đã thanh toán</p>
            <Button type="button" className="w-full" onClick={handleIssueInvoice}>
              {invoice?.status === "ISSUED" ? "Xem hóa đơn điện tử" : "Phát hành hóa đơn điện tử"}
            </Button>
          </div>
        ) : invoice && grandTotal <= 0 ? (
          <p role="status" className="mt-4 text-sm text-text-secondary">Phiếu tạm tính hiện không còn số tiền phải thu.</p>
        ) : isBankAccountNotConfigured || branchQuery.isError ? (
          <div className="mt-4 space-y-3 rounded-card border border-border-default bg-status-warning-subtle px-4 py-4">
            <div role="status" className="space-y-1">
              <p className="font-semibold text-text-primary">QR chưa khả dụng</p>
              <p className="text-sm text-amber-950">
                {isBankAccountNotConfigured
                  ? "Chi nhánh chưa cấu hình tài khoản ngân hàng."
                  : "Chưa kiểm tra được tài khoản nhận chuyển khoản."}
              </p>
            </div>
            {hasRecordedPayment ? (
              <p className="text-sm text-amber-950">Hóa đơn đã ghi nhận một phần thanh toán. Kiểm tra số tiền còn lại trước khi thu thêm.</p>
            ) : (
              <Button type="button" className="w-full bg-brand-primary-hover" onClick={goBackToCash}>
                Chuyển sang tiền mặt
              </Button>
            )}
            {isBankAccountNotConfigured && branchConfigPath ? (
              <Button type="button" variant="ghost" className="w-full" onClick={() => navigate(branchConfigPath)}>
                Mở cấu hình chi nhánh
              </Button>
            ) : branchQuery.isError ? (
              <Button type="button" variant="ghost" className="w-full" onClick={() => void branchQuery.refetch()}>
                Thử lại
              </Button>
            ) : null}
          </div>
        ) : !isSessionPayable || invoice?.status === "CANCELLED" ? (
          <p role="status" className="mt-4 text-sm text-text-secondary">Phiên bàn hiện không thể thu tiền qua QR.</p>
        ) : invoiceCreateError && !invoice ? (
          <div className="mt-4 space-y-2">
            <div role="alert">
              <p className="font-semibold text-text-primary">Chưa tạo được hóa đơn</p>
              <p className="text-sm text-text-secondary">{invoiceCreateError}</p>
            </div>
            <Button type="button" variant="outline" onClick={handleRetryCreateInvoice} disabled={invoiceCreating}>
              Thử lại tạo hóa đơn
            </Button>
          </div>
        ) : invoiceLookupFailed || qrQuery.isError || imageFailed || (qrQuery.isSuccess && !hasValidQrData) ? (
          <div className="mt-4 space-y-2">
            <p role="alert" className="text-sm font-medium text-text-primary">Chưa tải được mã QR chuyển khoản.</p>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setFailedQrUrl("");
                if (invoiceQuery.isError || qrData?.remainingAmount === 0) void invoiceQuery.refetch();
                if (invoice?.status === "PENDING") void qrQuery.refetch();
              }}
            >
              Thử tải lại mã QR
            </Button>
          </div>
        ) : shareError ? (
          <div className="mt-4 space-y-2" role="alert">
            <p>{shareError}</p>
            <Button type="button" variant="outline" onClick={() => {
              void invoiceQuery.refetch();
              setShareAttempt((attempt) => attempt + 1);
            }}>Thử lại</Button>
          </div>
        ) : invoiceCreating || qrAmountChanged || (hasValidQrData && !quoteReady) ? (
          <p role="status" className="mt-4 text-sm text-text-secondary">Đang cập nhật mã QR theo số tiền phải thu…</p>
        ) : quoteReady && qrData ? (
          <div className="mt-5 flex flex-col items-center gap-3">
            <p className="text-sm font-semibold text-text-primary">Quét mã để chuyển khoản</p>
            <img
              src={qrData.qrImageUrl}
              alt="Mã VietQR chuyển khoản"
              className="aspect-square w-[230px] max-w-full rounded-md border border-border-default object-contain"
              onLoad={() => setLoadedQrUrl(qrData.qrImageUrl)}
              onError={() => {
                setLoadedQrUrl("");
                setFailedQrUrl(qrData.qrImageUrl);
              }}
            />
            <div className="max-w-full text-center">
              <p className="text-xl font-bold tabular-nums text-text-primary">{formatVnd(amountToCollect)}</p>
              <p className="break-words text-sm font-medium text-text-primary">{bankAccountLabel}</p>
              <p className="break-words text-sm text-text-secondary">{qrData.accountName}</p>
              <p className="mt-2 break-words text-sm text-text-secondary">
                Nội dung chuyển khoản · <strong className="text-text-primary">{qrData.transferContent}</strong>
              </p>
            </div>
            {canConfirmTransfer ? (
              <>
                <p role="status" className="text-sm text-text-secondary">
                  {qrData.automaticVerification ? "Đang chờ ngân hàng xác nhận chuyển khoản" : "Đang chờ khách chuyển khoản"}
                </p>
                <Button type="button" variant="outline" className="w-full" disabled={!canPrintPrebill} onClick={() => window.print()}>
                  In tạm tính có QR
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  className="w-full whitespace-normal"
                  onClick={() => {
                    setTransferVerified(false);
                    setConfirmModalOpen(true);
                  }}
                >
                  Đối chiếu giao dịch
                </Button>
              </>
            ) : (
              <p role="status" className="text-sm text-text-secondary">Đang chuẩn bị mã QR…</p>
            )}
          </div>
        ) : (
          <p role="status" className="mt-4 flex items-center gap-2 text-sm text-text-secondary">
            <Loader2 aria-hidden="true" className="size-4 animate-spin" />
            {hasBankConfig ? "Đang chuẩn bị mã QR…" : "Đang kiểm tra tài khoản nhận chuyển khoản…"}
          </p>
        )}
      </div>

      <Dialog open={confirmModalOpen && canConfirmTransfer} onOpenChange={(open) => {
        if (!isConfirming) setConfirmModalOpen(open);
      }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-text-primary">
              Đối chiếu giao dịch chuyển khoản
            </DialogTitle>
            <DialogDescription className="text-text-secondary text-sm">
              Mở lịch sử giao dịch trong ứng dụng ngân hàng của quán. Kiểm tra giao dịch ghi có khớp với thông tin bên dưới.
            </DialogDescription>
          </DialogHeader>

          <div className="my-2 rounded-[16px] border border-border-default bg-[#F8F9FA] p-4 space-y-2.5 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-text-tertiary">Bàn &amp; Phiên:</span>
              <span className="font-bold text-text-primary">{tableName} · Phiên #{session.id}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-tertiary">Số tiền cần thu:</span>
              <span className="text-xl font-extrabold text-brand-primary">{formatVnd(amountToCollect)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-text-tertiary">Tài khoản nhận:</span>
              <span className="font-medium text-text-primary">{bankAccountLabel}</span>
            </div>
            {qrData?.transferContent ? (
              <div className="flex justify-between items-center pt-2 border-t border-border-default/50">
                <span className="text-text-tertiary">Nội dung CK:</span>
                <span className="break-all font-semibold text-text-primary">{qrData.transferContent}</span>
              </div>
            ) : null}
          </div>

          <label className="flex min-h-11 items-start gap-3 rounded-md border border-border-default p-3 text-sm text-text-primary">
            <input
              type="checkbox"
              className="mt-0.5 size-4 shrink-0 accent-brand-primary"
              checked={transferVerified}
              onChange={(event) => setTransferVerified(event.target.checked)}
              disabled={isConfirming}
            />
            Tôi đã thấy tiền vào đúng tài khoản, khớp số tiền và nội dung chuyển khoản.
          </label>

          <DialogFooter className="mt-4 flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              disabled={isConfirming}
              onClick={() => setConfirmModalOpen(false)}
            >
              Quay lại
            </Button>
            <Button
              type="button"
              className="bg-brand-primary hover:bg-brand-primary-hover text-white font-bold"
              disabled={isConfirming || !transferVerified}
              onClick={handleConfirmPaymentAndIssue}
            >
              {isConfirming ? "Đang xử lý…" : "Ghi nhận chuyển khoản"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
